/**
 * Integration tests for chatDiscussions DAL functions.
 * Uses real SQLite via @libsql/client (file-based) to avoid pool isolation issues.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { Client } from "@libsql/client";
import fs from "fs";

const testState = vi.hoisted(() => ({
  client: null as Client | null,
  dbPath: `/tmp/bird-cage-chat-test-${process.pid}-${Date.now()}.db`,
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
  saveDiscussion,
  listUserDiscussions,
  getDiscussion,
  deleteDiscussion,
} from "@/lib/dal/chatDiscussions";

const USER_ID = "chat-user-001";
const OTHER_USER_ID = "chat-user-002";

beforeAll(async () => {
  const c = testState.client!;
  await c.execute(`
    CREATE TABLE IF NOT EXISTS "user" (
      id             text    PRIMARY KEY NOT NULL,
      name           text    NOT NULL,
      email          text    NOT NULL UNIQUE,
      email_verified integer DEFAULT 0 NOT NULL,
      image          text,
      role           text    DEFAULT 'user' NOT NULL,
      billing_plan   text    DEFAULT 'free' NOT NULL,
      created_at     integer NOT NULL DEFAULT 0,
      updated_at     integer NOT NULL DEFAULT 0
    )
  `);
  await c.execute(`
    CREATE TABLE IF NOT EXISTS chat_discussions (
      id         integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id    text    NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      title      text    NOT NULL,
      messages   text    NOT NULL,
      created_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
    )
  `);
  await c.execute({
    sql: `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
          VALUES (?, 'Test User', 'testchat@example.com', 1, 0, 0)`,
    args: [USER_ID],
  });
  await c.execute({
    sql: `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
          VALUES (?, 'Other User', 'otherchat@example.com', 1, 0, 0)`,
    args: [OTHER_USER_ID],
  });
});

beforeEach(async () => {
  await testState.client!.execute(`DELETE FROM chat_discussions`);
});

afterAll(() => {
  testState.client?.close();
  if (fs.existsSync(testState.dbPath)) fs.unlinkSync(testState.dbPath);
});

// ── saveDiscussion ────────────────────────────────────────────────────────────

describe("saveDiscussion", () => {
  it("saves a discussion and returns it with an id", async () => {
    const messages = [
      { role: "user" as const, content: "I saw a small bird with red wings" },
      { role: "assistant" as const, content: "That sounds like a House Finch!" },
    ];
    const saved = await saveDiscussion(USER_ID, "Red-winged bird sighting", messages);
    expect(saved.id).toBeGreaterThan(0);
    expect(saved.title).toBe("Red-winged bird sighting");
    expect(saved.userId).toBe(USER_ID);
  });

  it("persists messages as parseable JSON", async () => {
    const messages = [
      { role: "user" as const, content: "Tiny blue bird" },
    ];
    const saved = await saveDiscussion(USER_ID, "Blue bird", messages);
    const fetched = await getDiscussion(saved.id, USER_ID);
    expect(fetched?.messages).toEqual(messages);
  });
});

// ── listUserDiscussions ───────────────────────────────────────────────────────

describe("listUserDiscussions", () => {
  it("returns an empty array when user has no discussions", async () => {
    const list = await listUserDiscussions(USER_ID);
    expect(list).toEqual([]);
  });

  it("returns discussions for the correct user only", async () => {
    await saveDiscussion(USER_ID, "My chat", [{ role: "user", content: "hello" }]);
    await saveDiscussion(OTHER_USER_ID, "Other chat", [{ role: "user", content: "hi" }]);

    const list = await listUserDiscussions(USER_ID);
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("My chat");
  });

  it("orders discussions by most recent first", async () => {
    await saveDiscussion(USER_ID, "First", [{ role: "user", content: "a" }]);
    await saveDiscussion(USER_ID, "Second", [{ role: "user", content: "b" }]);
    await saveDiscussion(USER_ID, "Third", [{ role: "user", content: "c" }]);

    const list = await listUserDiscussions(USER_ID);
    expect(list[0].title).toBe("Third");
    expect(list[list.length - 1].title).toBe("First");
  });

  it("returns messages parsed as an array", async () => {
    const messages = [
      { role: "user" as const, content: "test message" },
      { role: "assistant" as const, content: "test reply" },
    ];
    await saveDiscussion(USER_ID, "Parsed chat", messages);

    const list = await listUserDiscussions(USER_ID);
    expect(list[0].messages).toEqual(messages);
  });
});

// ── getDiscussion ─────────────────────────────────────────────────────────────

describe("getDiscussion", () => {
  it("returns the discussion when it belongs to the user", async () => {
    const saved = await saveDiscussion(USER_ID, "My discussion", [
      { role: "user", content: "I saw a hawk!" },
    ]);
    const found = await getDiscussion(saved.id, USER_ID);
    expect(found).not.toBeNull();
    expect(found!.title).toBe("My discussion");
  });

  it("returns null for a discussion belonging to another user", async () => {
    const saved = await saveDiscussion(OTHER_USER_ID, "Other's chat", [
      { role: "user", content: "eagle sighting" },
    ]);
    const found = await getDiscussion(saved.id, USER_ID);
    expect(found).toBeNull();
  });

  it("returns null for a non-existent discussion id", async () => {
    const found = await getDiscussion(999999, USER_ID);
    expect(found).toBeNull();
  });

  it("returns messages parsed as an array", async () => {
    const messages = [
      { role: "user" as const, content: "Describe the bird" },
      { role: "assistant" as const, content: "It is a Robin." },
    ];
    const saved = await saveDiscussion(USER_ID, "Robin chat", messages);
    const found = await getDiscussion(saved.id, USER_ID);
    expect(found!.messages).toEqual(messages);
  });
});

// ── deleteDiscussion ──────────────────────────────────────────────────────────

describe("deleteDiscussion", () => {
  it("deletes the discussion and returns true", async () => {
    const saved = await saveDiscussion(USER_ID, "To delete", [
      { role: "user", content: "bye" },
    ]);
    const result = await deleteDiscussion(saved.id, USER_ID);
    expect(result).toBe(true);
    const found = await getDiscussion(saved.id, USER_ID);
    expect(found).toBeNull();
  });

  it("returns false when trying to delete another user's discussion", async () => {
    const saved = await saveDiscussion(OTHER_USER_ID, "Other's", [
      { role: "user", content: "private" },
    ]);
    const result = await deleteDiscussion(saved.id, USER_ID);
    expect(result).toBe(false);
    // Verify it still exists
    const found = await getDiscussion(saved.id, OTHER_USER_ID);
    expect(found).not.toBeNull();
  });

  it("returns false for a non-existent discussion id", async () => {
    const result = await deleteDiscussion(999999, USER_ID);
    expect(result).toBe(false);
  });
});
