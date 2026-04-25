/**
 * Integration tests for chatDiscussions DAL functions.
 * Uses a real file-based SQLite DB via libSQL, same pattern as dal.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { Client } from "@libsql/client";
import fs from "fs";

const testState = vi.hoisted(() => ({
  client: null as Client | null,
  dbPath: `/tmp/bird-cage-chat-dal-test-${process.pid}-${Date.now()}.db`,
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
  listUserDiscussions,
  getDiscussion,
  saveDiscussion,
  deleteDiscussion,
} from "@/lib/dal/chatDiscussions";

const USER_ID = "user-chat-001";
const OTHER_USER_ID = "user-chat-002";

beforeAll(async () => {
  const c = testState.client!;
  await c.execute("PRAGMA foreign_keys = ON");

  await c.execute(`
    CREATE TABLE IF NOT EXISTS "user" (
      id             text    PRIMARY KEY NOT NULL,
      name           text    NOT NULL,
      email          text    NOT NULL UNIQUE,
      email_verified integer DEFAULT 0 NOT NULL,
      image          text,
      role           text    DEFAULT 'user' NOT NULL,
      created_at     integer NOT NULL DEFAULT 0,
      updated_at     integer NOT NULL DEFAULT 0
    )
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS chat_discussions (
      id         integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id    text    NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      title      text    NOT NULL,
      messages   text    NOT NULL DEFAULT '[]',
      created_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
    )
  `);

  await c.execute({
    sql: `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
          VALUES (?, 'Chat User', ?, 1, 0, 0)`,
    args: [USER_ID, "chat@example.com"],
  });
  await c.execute({
    sql: `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
          VALUES (?, 'Other User', ?, 1, 0, 0)`,
    args: [OTHER_USER_ID, "other@example.com"],
  });
});

afterAll(() => {
  for (const ext of ["", "-wal", "-shm"]) {
    try { fs.unlinkSync(`${testState.dbPath}${ext}`); } catch { /* ignore */ }
  }
});

beforeEach(async () => {
  await testState.client!.execute("DELETE FROM chat_discussions");
});

// ── saveDiscussion ────────────────────────────────────────────────────────────
describe("saveDiscussion", () => {
  it("saves a discussion and returns its id", async () => {
    const result = await saveDiscussion(USER_ID, {
      title: "Test Chat",
      messages: [{ role: "user", content: "Is this a robin?" }],
    });
    expect(typeof result.id).toBe("number");
  });

  it("persists title and messages to the database", async () => {
    const messages = [
      { role: "user" as const, content: "Small brown bird with red breast" },
      { role: "assistant" as const, content: "That sounds like a Robin!" },
    ];
    const result = await saveDiscussion(USER_ID, { title: "Robin ID", messages });

    const rows = await testState.client!.execute({
      sql: "SELECT title, messages FROM chat_discussions WHERE id = ?",
      args: [result.id],
    });
    expect(rows.rows[0][0]).toBe("Robin ID");
    expect(JSON.parse(rows.rows[0][1] as string)).toEqual(messages);
  });

  it("associates the discussion with the correct user", async () => {
    const result = await saveDiscussion(USER_ID, {
      title: "My Chat",
      messages: [],
    });

    const rows = await testState.client!.execute({
      sql: "SELECT user_id FROM chat_discussions WHERE id = ?",
      args: [result.id],
    });
    expect(rows.rows[0][0]).toBe(USER_ID);
  });
});

// ── listUserDiscussions ───────────────────────────────────────────────────────
describe("listUserDiscussions", () => {
  it("returns an empty array when user has no discussions", async () => {
    const result = await listUserDiscussions(USER_ID);
    expect(result).toEqual([]);
  });

  it("returns only the requesting user's discussions", async () => {
    await saveDiscussion(USER_ID, { title: "My Chat", messages: [] });
    await saveDiscussion(OTHER_USER_ID, { title: "Their Chat", messages: [] });

    const result = await listUserDiscussions(USER_ID);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("My Chat");
  });

  it("returns discussions ordered most-recent first (by id desc when timestamps equal)", async () => {
    const a = await saveDiscussion(USER_ID, { title: "First", messages: [] });
    const b = await saveDiscussion(USER_ID, { title: "Second", messages: [] });
    const c = await saveDiscussion(USER_ID, { title: "Third", messages: [] });

    const result = await listUserDiscussions(USER_ID);
    // IDs are monotonically increasing; highest id == most recently inserted
    const ids = result.map((r) => r.id);
    expect(ids[0]).toBe(c.id);
    expect(ids[ids.length - 1]).toBe(a.id);
  });

  it("includes id, title, and createdAt in each entry", async () => {
    await saveDiscussion(USER_ID, { title: "Bird Chat", messages: [] });

    const result = await listUserDiscussions(USER_ID);
    expect(typeof result[0].id).toBe("number");
    expect(result[0].title).toBe("Bird Chat");
    expect(result[0].createdAt).toBeInstanceOf(Date);
  });

  it("includes a preview of the first user message (max 100 chars)", async () => {
    const longContent = "a".repeat(150);
    await saveDiscussion(USER_ID, {
      title: "Long Chat",
      messages: [{ role: "user", content: longContent }],
    });

    const result = await listUserDiscussions(USER_ID);
    expect(result[0].preview).toBe("a".repeat(100));
  });

  it("returns empty string preview when there are no messages", async () => {
    await saveDiscussion(USER_ID, { title: "Empty Chat", messages: [] });

    const result = await listUserDiscussions(USER_ID);
    expect(result[0].preview).toBe("");
  });
});

// ── getDiscussion ─────────────────────────────────────────────────────────────
describe("getDiscussion", () => {
  it("returns the discussion with all messages for the owner", async () => {
    const messages = [
      { role: "user" as const, content: "What bird is this?" },
      { role: "assistant" as const, content: "It looks like a sparrow." },
    ];
    const { id } = await saveDiscussion(USER_ID, { title: "Sparrow Chat", messages });

    const result = await getDiscussion(id, USER_ID);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Sparrow Chat");
    expect(result!.messages).toEqual(messages);
  });

  it("returns null for a discussion owned by another user", async () => {
    const { id } = await saveDiscussion(OTHER_USER_ID, {
      title: "Private Chat",
      messages: [],
    });

    const result = await getDiscussion(id, USER_ID);
    expect(result).toBeNull();
  });

  it("returns null for a non-existent discussion id", async () => {
    const result = await getDiscussion(9999, USER_ID);
    expect(result).toBeNull();
  });

  it("includes id, title, createdAt, and messages", async () => {
    const { id } = await saveDiscussion(USER_ID, {
      title: "Full Chat",
      messages: [{ role: "user", content: "Hello" }],
    });

    const result = await getDiscussion(id, USER_ID);
    expect(typeof result!.id).toBe("number");
    expect(result!.title).toBe("Full Chat");
    expect(result!.createdAt).toBeInstanceOf(Date);
    expect(Array.isArray(result!.messages)).toBe(true);
  });
});

// ── deleteDiscussion ──────────────────────────────────────────────────────────
describe("deleteDiscussion", () => {
  it("returns { ok: true } when the owner deletes their discussion", async () => {
    const { id } = await saveDiscussion(USER_ID, { title: "To Delete", messages: [] });

    const result = await deleteDiscussion(id, USER_ID);
    expect(result).toEqual({ ok: true });
  });

  it("removes the discussion from the database", async () => {
    const { id } = await saveDiscussion(USER_ID, { title: "Gone", messages: [] });

    await deleteDiscussion(id, USER_ID);

    const rows = await testState.client!.execute({
      sql: "SELECT id FROM chat_discussions WHERE id = ?",
      args: [id],
    });
    expect(rows.rows).toHaveLength(0);
  });

  it("returns null when discussion belongs to another user", async () => {
    const { id } = await saveDiscussion(OTHER_USER_ID, {
      title: "Not Mine",
      messages: [],
    });

    const result = await deleteDiscussion(id, USER_ID);
    expect(result).toBeNull();
  });

  it("returns null for a non-existent discussion id", async () => {
    const result = await deleteDiscussion(9999, USER_ID);
    expect(result).toBeNull();
  });

  it("does not delete a discussion belonging to another user", async () => {
    const { id } = await saveDiscussion(OTHER_USER_ID, {
      title: "Protected",
      messages: [],
    });

    await deleteDiscussion(id, USER_ID);

    const rows = await testState.client!.execute({
      sql: "SELECT id FROM chat_discussions WHERE id = ?",
      args: [id],
    });
    expect(rows.rows).toHaveLength(1);
  });
});
