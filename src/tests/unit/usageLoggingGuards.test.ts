/**
 * Integration tests for usage logging guards in the chat and photo identification routes.
 * Verifies external behavior: what gets logged (usage_logs rows) and what gets deducted
 * (currentMonthUsageCents) by seeding users and asserting on DB state.
 *
 * Uses a real SQLite file DB (not :memory:) to avoid libSQL pool isolation issues,
 * following the pattern established in billingDal.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { Client } from "@libsql/client";
import fs from "fs";

// ── Hoisted state (must come before vi.mock calls) ─────────────────────────
const testState = vi.hoisted(() => ({
  client: null as Client | null,
  dbPath: `/tmp/bird-cage-usage-guards-test-${process.pid}-${Date.now()}.db`,
}));

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@/db", async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const schema = await import("@/db/schema");

  const client = createClient({ url: `file:${testState.dbPath}` });
  testState.client = client;
  const db = drizzle(client, { schema });
  return { db, getDb: () => db };
});

// ── Auth mock ──────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// ── OpenAI mock ────────────────────────────────────────────────────────────
vi.mock("openai", () => ({
  default: vi.fn(function () {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  }),
}));

// ── get-auth-base-url mock ─────────────────────────────────────────────────
vi.mock("@/lib/get-auth-base-url", () => ({
  getAuthBaseUrl: () => "http://localhost:3000",
}));

// ── Route and auth imports (after mocks) ──────────────────────────────────
import { auth } from "@/lib/auth";
import { POST as chatPOST } from "@/app/api/chat/route";
import { POST as photoPOST } from "@/app/api/identify-photo/route";
import { NextRequest } from "next/server";

// ── Test constants ─────────────────────────────────────────────────────────
const PAID_USER_ID = "usage-guard-paid-user";
const FREE_USER_ID = "usage-guard-free-user";

// AI response with a valid identification JSON block
const VALID_AI_RESPONSE =
  'A small songbird with a red breast found in gardens.\n' +
  '{"identified": true, "type": "Songbird", "species": "European Robin"}';

// ── Schema setup ───────────────────────────────────────────────────────────
beforeAll(async () => {
  const c = testState.client!;

  await c.execute("PRAGMA foreign_keys = ON");

  await c.execute(`
    CREATE TABLE IF NOT EXISTS "user" (
      id                          text    PRIMARY KEY NOT NULL,
      name                        text    NOT NULL DEFAULT '',
      email                       text    NOT NULL UNIQUE,
      email_verified              integer DEFAULT 0 NOT NULL,
      image                       text,
      role                        text    DEFAULT 'user' NOT NULL,
      billing_plan                text    NOT NULL DEFAULT 'free',
      stripe_customer_id          text    UNIQUE,
      stripe_subscription_id      text,
      subscription_status         text,
      spending_limit_cents        integer,
      current_month_usage_cents   integer NOT NULL DEFAULT 0,
      extra_usage_cents           integer NOT NULL DEFAULT 0,
      cancel_at_period_end        integer NOT NULL DEFAULT 0,
      current_period_end          integer,
      created_at                  integer NOT NULL DEFAULT 0,
      updated_at                  integer NOT NULL DEFAULT 0
    )
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id           integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id      text    NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      model_used   text    NOT NULL,
      cost_cents   integer NOT NULL DEFAULT 0,
      created_at   integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
    )
  `);

  await c.execute(`
    CREATE INDEX IF NOT EXISTS usage_logs_userId_createdAt_idx
    ON usage_logs (user_id, created_at)
  `);

  await c.execute({
    sql: `INSERT INTO "user" (id, name, email, email_verified, billing_plan, created_at, updated_at)
          VALUES (?, 'Paid User', 'paid@example.com', 1, 'paid', 0, 0)`,
    args: [PAID_USER_ID],
  });

  await c.execute({
    sql: `INSERT INTO "user" (id, name, email, email_verified, billing_plan, created_at, updated_at)
          VALUES (?, 'Free User', 'free@example.com', 1, 'free', 0, 0)`,
    args: [FREE_USER_ID],
  });
});

afterAll(() => {
  for (const ext of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(`${testState.dbPath}${ext}`);
    } catch {
      // file may not exist
    }
  }
});

beforeEach(async () => {
  const c = testState.client!;
  await c.execute("DELETE FROM usage_logs");
  await c.execute({
    sql: `UPDATE "user" SET current_month_usage_cents = 0 WHERE id IN (?, ?)`,
    args: [PAID_USER_ID, FREE_USER_ID],
  });
  vi.clearAllMocks();
});

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSession(userId: string) {
  return { user: { id: userId, emailVerified: true }, session: {} };
}

/** Async generator simulating a streaming OpenAI chat response. */
async function* makeStreamChunks(opts: { costDollars?: number; includeCost?: boolean }) {
  yield { choices: [{ delta: { content: "A bird." } }] };
  yield { choices: [{ delta: { content: " It has a red breast." } }] };
  if (opts.includeCost !== false) {
    const usage = opts.costDollars !== undefined ? { cost: opts.costDollars } : undefined;
    yield { choices: [{ delta: { content: "" } }], usage };
  } else {
    yield { choices: [{ delta: { content: "" } }] };
  }
}

/** Read a streaming Response body to completion so the async IIFE finishes. */
async function consumeStream(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let result = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

function makeChatRequest(body = { messages: [{ role: "user", content: "Describe this bird" }] }) {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makePhotoRequest() {
  return new NextRequest("http://localhost/api/identify-photo", {
    method: "POST",
    body: JSON.stringify({ photoBase64: "data:image/jpeg;base64,abc123" }),
    headers: { "Content-Type": "application/json" },
  });
}

async function getUsageLogs(userId: string) {
  return testState.client!.execute({
    sql: `SELECT user_id, model_used, cost_cents FROM usage_logs WHERE user_id = ?`,
    args: [userId],
  });
}

async function getCurrentUsageCents(userId: string): Promise<number> {
  const rows = await testState.client!.execute({
    sql: `SELECT current_month_usage_cents FROM "user" WHERE id = ?`,
    args: [userId],
  });
  return rows.rows[0][0] as number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Chat Route — /api/chat
// ═══════════════════════════════════════════════════════════════════════════

describe("chat route — usage logging guards", () => {
  it("paid user with non-zero cost: inserts usage_logs row and increments currentMonthUsageCents", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(makeSession(PAID_USER_ID) as never);
    mockCreate.mockReturnValue(makeStreamChunks({ costDollars: 0.05 }));

    const response = await chatPOST(makeChatRequest());
    expect(response.status).toBe(200);
    await consumeStream(response);

    const logs = await getUsageLogs(PAID_USER_ID);
    expect(logs.rows).toHaveLength(1);
    expect(logs.rows[0][2]).toBe(5); // 0.05 * 100 = 5 cents

    const usageCents = await getCurrentUsageCents(PAID_USER_ID);
    expect(usageCents).toBe(5);
  });

  it("free user: does not insert usage_logs row", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(makeSession(FREE_USER_ID) as never);
    mockCreate.mockReturnValue(makeStreamChunks({ costDollars: 0.05 }));

    const response = await chatPOST(makeChatRequest());
    expect(response.status).toBe(200);
    await consumeStream(response);

    const logs = await getUsageLogs(FREE_USER_ID);
    expect(logs.rows).toHaveLength(0);

    const usageCents = await getCurrentUsageCents(FREE_USER_ID);
    expect(usageCents).toBe(0);
  });

  it("paid user with usage.cost missing: does not insert usage_logs row and leaves currentMonthUsageCents unchanged", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(makeSession(PAID_USER_ID) as never);
    // No cost field in usage — simulates missing usage data from OpenRouter
    mockCreate.mockReturnValue(makeStreamChunks({ includeCost: true, costDollars: undefined }));

    const response = await chatPOST(makeChatRequest());
    expect(response.status).toBe(200);
    await consumeStream(response);

    const logs = await getUsageLogs(PAID_USER_ID);
    expect(logs.rows).toHaveLength(0);

    const usageCents = await getCurrentUsageCents(PAID_USER_ID);
    expect(usageCents).toBe(0);
  });

  it("paid user with usage.cost = 0: does not insert usage_logs row", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(makeSession(PAID_USER_ID) as never);
    mockCreate.mockReturnValue(makeStreamChunks({ costDollars: 0 }));

    const response = await chatPOST(makeChatRequest());
    expect(response.status).toBe(200);
    await consumeStream(response);

    const logs = await getUsageLogs(PAID_USER_ID);
    expect(logs.rows).toHaveLength(0);

    const usageCents = await getCurrentUsageCents(PAID_USER_ID);
    expect(usageCents).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Photo Identification Route — /api/identify-photo
// ═══════════════════════════════════════════════════════════════════════════

describe("photo identification route — usage logging guards", () => {
  it("paid user with non-zero cost: inserts usage_logs row and increments currentMonthUsageCents", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(makeSession(PAID_USER_ID) as never);
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: VALID_AI_RESPONSE } }],
      usage: { cost: 0.05 },
    });

    const response = await photoPOST(makePhotoRequest());
    expect(response.status).toBe(200);

    const logs = await getUsageLogs(PAID_USER_ID);
    expect(logs.rows).toHaveLength(1);
    expect(logs.rows[0][2]).toBe(5); // 0.05 * 100 = 5 cents

    const usageCents = await getCurrentUsageCents(PAID_USER_ID);
    expect(usageCents).toBe(5);
  });

  it("free user: does not insert usage_logs row (blocked by canAccessPaidFeatures)", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(makeSession(FREE_USER_ID) as never);

    const response = await photoPOST(makePhotoRequest());
    expect(response.status).toBe(403);

    const logs = await getUsageLogs(FREE_USER_ID);
    expect(logs.rows).toHaveLength(0);

    const usageCents = await getCurrentUsageCents(FREE_USER_ID);
    expect(usageCents).toBe(0);
  });

  it("paid user with usage.cost missing: does not insert usage_logs row and leaves currentMonthUsageCents unchanged", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(makeSession(PAID_USER_ID) as never);
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: VALID_AI_RESPONSE } }],
      usage: undefined,
    });

    const response = await photoPOST(makePhotoRequest());
    expect(response.status).toBe(200);

    const logs = await getUsageLogs(PAID_USER_ID);
    expect(logs.rows).toHaveLength(0);

    const usageCents = await getCurrentUsageCents(PAID_USER_ID);
    expect(usageCents).toBe(0);
  });

  it("paid user with usage.cost = 0: does not insert usage_logs row", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(makeSession(PAID_USER_ID) as never);
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: VALID_AI_RESPONSE } }],
      usage: { cost: 0 },
    });

    const response = await photoPOST(makePhotoRequest());
    expect(response.status).toBe(200);

    const logs = await getUsageLogs(PAID_USER_ID);
    expect(logs.rows).toHaveLength(0);

    const usageCents = await getCurrentUsageCents(PAID_USER_ID);
    expect(usageCents).toBe(0);
  });
});
