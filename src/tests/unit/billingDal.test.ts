/**
 * TDD tests for billing DAL functions.
 * Tests are written first and the implementation will follow.
 *
 * Uses a real SQLite file DB (not :memory:) to avoid libSQL pool isolation issues.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { Client } from "@libsql/client";
import fs from "fs";

const testState = vi.hoisted(() => ({
  client: null as Client | null,
  dbPath: `/tmp/bird-cage-billing-dal-test-${process.pid}-${Date.now()}.db`,
}));

vi.mock("@/db", async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const schema = await import("@/db/schema");

  const client = createClient({ url: `file:${testState.dbPath}` });
  testState.client = client;
  const db = drizzle(client, { schema });
  return { db, getDb: () => db };
});

import {
  updateSpendingLimit,
  logUsage,
  getCurrentMonthUsage,
  isLimitReached,
  updateSubscriptionStatus,
  getStripeCustomerId,
  setStripeCustomerId,
  setStripeSubscriptionId,
  resetMonthlyUsage,
} from "@/lib/dal/billing";

const USER_ID = "billing-test-user-001";
const USER_ID_2 = "billing-test-user-002";

// ── Schema setup ──────────────────────────────────────────────────────────────
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

  // Seed test users
  await c.execute({
    sql: `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
          VALUES (?, 'Billing User', 'billing@example.com', 1, 0, 0)`,
    args: [USER_ID],
  });
  await c.execute({
    sql: `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
          VALUES (?, 'Billing User 2', 'billing2@example.com', 1, 0, 0)`,
    args: [USER_ID_2],
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

// Reset usage/stripe columns between tests
beforeEach(async () => {
  const c = testState.client!;
  await c.execute("DELETE FROM usage_logs");
  await c.execute({
    sql: `UPDATE "user" SET
            spending_limit_cents = NULL,
            current_month_usage_cents = 0,
            stripe_customer_id = NULL,
            stripe_subscription_id = NULL,
            subscription_status = NULL
          WHERE id IN (?, ?)`,
    args: [USER_ID, USER_ID_2],
  });
});

// ── updateSpendingLimit ───────────────────────────────────────────────────────
describe("updateSpendingLimit", () => {
  it("sets the spending limit for a user", async () => {
    await updateSpendingLimit(USER_ID, 1000);

    const rows = await testState.client!.execute({
      sql: `SELECT spending_limit_cents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(1000);
  });

  it("allows setting spending limit to null (no limit)", async () => {
    await updateSpendingLimit(USER_ID, 1000);
    await updateSpendingLimit(USER_ID, null);

    const rows = await testState.client!.execute({
      sql: `SELECT spending_limit_cents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBeNull();
  });

  it("does not affect other users", async () => {
    await updateSpendingLimit(USER_ID, 500);

    const rows = await testState.client!.execute({
      sql: `SELECT spending_limit_cents FROM "user" WHERE id = ?`,
      args: [USER_ID_2],
    });
    expect(rows.rows[0][0]).toBeNull();
  });
});

// ── logUsage ──────────────────────────────────────────────────────────────────
describe("logUsage", () => {
  it("inserts a usage log entry", async () => {
    await logUsage(USER_ID, "openrouter/auto", 10);

    const rows = await testState.client!.execute({
      sql: `SELECT user_id, model_used, cost_cents FROM usage_logs WHERE user_id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0][0]).toBe(USER_ID);
    expect(rows.rows[0][1]).toBe("openrouter/auto");
    expect(rows.rows[0][2]).toBe(10);
  });

  it("also increments current_month_usage_cents on the user", async () => {
    await logUsage(USER_ID, "openrouter/auto", 25);

    const rows = await testState.client!.execute({
      sql: `SELECT current_month_usage_cents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(25);
  });

  it("accumulates multiple usage entries", async () => {
    await logUsage(USER_ID, "openrouter/auto", 10);
    await logUsage(USER_ID, "openrouter/openai/gpt-4o", 20);

    const rows = await testState.client!.execute({
      sql: `SELECT current_month_usage_cents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(30);
  });

  it("does not affect other users", async () => {
    await logUsage(USER_ID, "openrouter/auto", 50);

    const rows = await testState.client!.execute({
      sql: `SELECT current_month_usage_cents FROM "user" WHERE id = ?`,
      args: [USER_ID_2],
    });
    expect(rows.rows[0][0]).toBe(0);
  });
});

// ── getCurrentMonthUsage ──────────────────────────────────────────────────────
describe("getCurrentMonthUsage", () => {
  it("returns 0 when no usage has been logged", async () => {
    const usage = await getCurrentMonthUsage(USER_ID);
    expect(usage).toBe(0);
  });

  it("returns the current month usage in cents", async () => {
    await logUsage(USER_ID, "openrouter/auto", 42);

    const usage = await getCurrentMonthUsage(USER_ID);
    expect(usage).toBe(42);
  });

  it("returns 0 for an unknown user", async () => {
    const usage = await getCurrentMonthUsage("non-existent-user");
    expect(usage).toBe(0);
  });
});

// ── isLimitReached ────────────────────────────────────────────────────────────
describe("isLimitReached", () => {
  it("returns false when no spending limit is set (null)", async () => {
    const reached = await isLimitReached(USER_ID);
    expect(reached).toBe(false);
  });

  it("returns false when usage is below the limit", async () => {
    await updateSpendingLimit(USER_ID, 1000);
    await logUsage(USER_ID, "openrouter/auto", 500);

    const reached = await isLimitReached(USER_ID);
    expect(reached).toBe(false);
  });

  it("returns true when usage equals the limit", async () => {
    await updateSpendingLimit(USER_ID, 500);
    await logUsage(USER_ID, "openrouter/auto", 500);

    const reached = await isLimitReached(USER_ID);
    expect(reached).toBe(true);
  });

  it("returns true when usage exceeds the limit", async () => {
    await updateSpendingLimit(USER_ID, 500);
    await logUsage(USER_ID, "openrouter/auto", 600);

    const reached = await isLimitReached(USER_ID);
    expect(reached).toBe(true);
  });

  it("returns false for unknown user (no limit)", async () => {
    const reached = await isLimitReached("non-existent-user");
    expect(reached).toBe(false);
  });
});

// ── updateSubscriptionStatus ──────────────────────────────────────────────────
describe("updateSubscriptionStatus", () => {
  it("sets subscription status to active", async () => {
    await updateSubscriptionStatus(USER_ID, "active");

    const rows = await testState.client!.execute({
      sql: `SELECT subscription_status FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe("active");
  });

  it("sets subscription status to canceled", async () => {
    await updateSubscriptionStatus(USER_ID, "canceled");

    const rows = await testState.client!.execute({
      sql: `SELECT subscription_status FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe("canceled");
  });

  it("sets subscription status to paused", async () => {
    await updateSubscriptionStatus(USER_ID, "paused");

    const rows = await testState.client!.execute({
      sql: `SELECT subscription_status FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe("paused");
  });
});

// ── setStripeCustomerId / getStripeCustomerId ─────────────────────────────────
describe("setStripeCustomerId and getStripeCustomerId", () => {
  it("saves and retrieves the stripe customer ID", async () => {
    await setStripeCustomerId(USER_ID, "cus_test123");

    const customerId = await getStripeCustomerId(USER_ID);
    expect(customerId).toBe("cus_test123");
  });

  it("returns null when no stripe customer ID is set", async () => {
    const customerId = await getStripeCustomerId(USER_ID);
    expect(customerId).toBeNull();
  });

  it("returns null for non-existent user", async () => {
    const customerId = await getStripeCustomerId("non-existent");
    expect(customerId).toBeNull();
  });
});

// ── setStripeSubscriptionId ───────────────────────────────────────────────────
describe("setStripeSubscriptionId", () => {
  it("saves the stripe subscription ID", async () => {
    await setStripeSubscriptionId(USER_ID, "sub_test456");

    const rows = await testState.client!.execute({
      sql: `SELECT stripe_subscription_id FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe("sub_test456");
  });
});

// ── resetMonthlyUsage ─────────────────────────────────────────────────────────
describe("resetMonthlyUsage", () => {
  it("resets current_month_usage_cents to 0 for a user", async () => {
    await logUsage(USER_ID, "openrouter/auto", 200);
    await resetMonthlyUsage(USER_ID);

    const rows = await testState.client!.execute({
      sql: `SELECT current_month_usage_cents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(0);
  });

  it("does not affect other users", async () => {
    await logUsage(USER_ID, "openrouter/auto", 100);
    await logUsage(USER_ID_2, "openrouter/auto", 50);
    await resetMonthlyUsage(USER_ID);

    const rows = await testState.client!.execute({
      sql: `SELECT current_month_usage_cents FROM "user" WHERE id = ?`,
      args: [USER_ID_2],
    });
    expect(rows.rows[0][0]).toBe(50);
  });
});
