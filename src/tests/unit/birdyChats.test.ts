/**
 * TDD tests for birdyChats DAL functions.
 * Uses a real SQLite file DB to avoid libSQL pool isolation issues.
 * Follows the pattern established in dal.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { Client } from "@libsql/client";
import fs from "fs";

const testState = vi.hoisted(() => ({
  client: null as Client | null,
  dbPath: `/tmp/bird-cage-birdy-chats-test-${process.pid}-${Date.now()}.db`,
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
  saveBirdyChat,
  listBirdyChats,
  getBirdyChat,
  deleteBirdyChat,
} from "@/lib/dal/birdyChats";

const USER_ID = "birdy-chat-test-user-001";
const OTHER_USER_ID = "birdy-chat-test-user-002";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function insertChat(userId: string, title = "Test Chat", createdAt = Date.now()): Promise<number> {
  const result = await testState.client!.execute({
    sql: `INSERT INTO birdy_chats (user_id, title, created_at) VALUES (?, ?, ?)`,
    args: [userId, title, createdAt],
  });
  return Number(result.lastInsertRowid);
}

async function insertMessage(
  chatId: number,
  role: "user" | "assistant",
  content: string,
  createdAt = Date.now(),
): Promise<number> {
  const result = await testState.client!.execute({
    sql: `INSERT INTO birdy_chat_messages (chat_id, role, content, created_at) VALUES (?, ?, ?, ?)`,
    args: [chatId, role, content, createdAt],
  });
  return Number(result.lastInsertRowid);
}

// ── Schema + seed ─────────────────────────────────────────────────────────────

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
    CREATE TABLE IF NOT EXISTS birdy_chats (
      id         INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id    TEXT    NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      title      TEXT    NOT NULL,
      created_at INTEGER NOT NULL DEFAULT 0
    )
  `);

  await c.execute(
    `CREATE INDEX IF NOT EXISTS birdy_chats_user_id_idx ON birdy_chats (user_id)`,
  );

  await c.execute(`
    CREATE TABLE IF NOT EXISTS birdy_chat_messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      chat_id    INTEGER NOT NULL REFERENCES birdy_chats(id) ON DELETE CASCADE,
      role       TEXT    NOT NULL,
      content    TEXT    NOT NULL,
      created_at INTEGER NOT NULL DEFAULT 0
    )
  `);

  await c.execute(
    `CREATE INDEX IF NOT EXISTS birdy_chat_messages_chat_id_idx ON birdy_chat_messages (chat_id)`,
  );

  await c.execute({
    sql: `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
          VALUES (?, 'Test User', ?, 1, 0, 0)`,
    args: [USER_ID, "test@example.com"],
  });
  await c.execute({
    sql: `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
          VALUES (?, 'Other User', ?, 1, 0, 0)`,
    args: [OTHER_USER_ID, "other@example.com"],
  });
});

afterAll(() => {
  for (const ext of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(`${testState.dbPath}${ext}`);
    } catch {
      // file may not exist — ignore
    }
  }
});

beforeEach(async () => {
  const c = testState.client!;
  await c.execute("DELETE FROM birdy_chat_messages");
  await c.execute("DELETE FROM birdy_chats");
});

// ── saveBirdyChat ─────────────────────────────────────────────────────────────

describe("saveBirdyChat", () => {
  it("returns { chatId } of type number", async () => {
    const result = await saveBirdyChat(USER_ID, "My Chat", []);
    expect(typeof result.chatId).toBe("number");
  });

  it("persists the chat record with correct user_id and title", async () => {
    const { chatId } = await saveBirdyChat(USER_ID, "Morning Birds", []);

    const rows = await testState.client!.execute({
      sql: `SELECT user_id, title FROM birdy_chats WHERE id = ?`,
      args: [chatId],
    });
    expect(rows.rows[0][0]).toBe(USER_ID);
    expect(rows.rows[0][1]).toBe("Morning Birds");
  });

  it("persists all messages with correct role and content", async () => {
    const { chatId } = await saveBirdyChat(USER_ID, "Chat with messages", [
      { role: "user", content: "What bird is this?" },
      { role: "assistant", content: "That looks like a Robin." },
    ]);

    const rows = await testState.client!.execute({
      sql: `SELECT role, content FROM birdy_chat_messages WHERE chat_id = ? ORDER BY id`,
      args: [chatId],
    });
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows[0][0]).toBe("user");
    expect(rows.rows[0][1]).toBe("What bird is this?");
    expect(rows.rows[1][0]).toBe("assistant");
    expect(rows.rows[1][1]).toBe("That looks like a Robin.");
  });

  it("saves a chat with no messages when messages array is empty", async () => {
    const { chatId } = await saveBirdyChat(USER_ID, "Empty Chat", []);

    const rows = await testState.client!.execute({
      sql: `SELECT id FROM birdy_chat_messages WHERE chat_id = ?`,
      args: [chatId],
    });
    expect(rows.rows).toHaveLength(0);
  });
});

// ── listBirdyChats ────────────────────────────────────────────────────────────

describe("listBirdyChats", () => {
  it("returns an empty array when user has no chats", async () => {
    const result = await listBirdyChats(USER_ID);
    expect(result).toEqual([]);
  });

  it("returns chats in reverse-chronological order (most recent first)", async () => {
    const now = Date.now();
    const chatId1 = await insertChat(USER_ID, "Older Chat", now - 2000);
    const chatId2 = await insertChat(USER_ID, "Newer Chat", now - 1000);
    const chatId3 = await insertChat(USER_ID, "Newest Chat", now);

    const result = await listBirdyChats(USER_ID);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(chatId3);
    expect(result[1].id).toBe(chatId2);
    expect(result[2].id).toBe(chatId1);
  });

  it("includes the first user message preview (up to 100 chars)", async () => {
    const chatId = await insertChat(USER_ID, "Chat");
    const longMessage = "A".repeat(150);
    await insertMessage(chatId, "user", longMessage);

    const result = await listBirdyChats(USER_ID);

    expect(result[0].preview).toBe("A".repeat(100));
  });

  it("preview is null when chat has no messages", async () => {
    await insertChat(USER_ID, "Empty Chat");

    const result = await listBirdyChats(USER_ID);

    expect(result[0].preview).toBeNull();
  });

  it("preview uses first user message, not assistant message", async () => {
    const chatId = await insertChat(USER_ID, "Chat");
    await insertMessage(chatId, "assistant", "Assistant speaks first");
    await insertMessage(chatId, "user", "User message");

    const result = await listBirdyChats(USER_ID);

    expect(result[0].preview).toBe("User message");
  });

  it("only returns chats belonging to the requesting user", async () => {
    await insertChat(USER_ID, "My Chat");
    await insertChat(OTHER_USER_ID, "Other User Chat");

    const result = await listBirdyChats(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("My Chat");
  });
});

// ── getBirdyChat ──────────────────────────────────────────────────────────────

describe("getBirdyChat", () => {
  it("returns the chat with all messages for the correct user", async () => {
    const chatId = await insertChat(USER_ID, "Full Chat");
    await insertMessage(chatId, "user", "Hello?");
    await insertMessage(chatId, "assistant", "Hi there!");

    const result = await getBirdyChat(chatId, USER_ID);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(chatId);
    expect(result!.title).toBe("Full Chat");
    expect(result!.messages).toHaveLength(2);
    expect(result!.messages[0].role).toBe("user");
    expect(result!.messages[0].content).toBe("Hello?");
    expect(result!.messages[1].role).toBe("assistant");
    expect(result!.messages[1].content).toBe("Hi there!");
  });

  it("returns null when the chat belongs to another user (ownership enforcement)", async () => {
    const chatId = await insertChat(OTHER_USER_ID, "Not My Chat");

    const result = await getBirdyChat(chatId, USER_ID);

    expect(result).toBeNull();
  });

  it("returns null for a non-existent chat id", async () => {
    const result = await getBirdyChat(99999, USER_ID);
    expect(result).toBeNull();
  });

  it("returns chat with empty messages array when chat has no messages", async () => {
    const chatId = await insertChat(USER_ID, "No Messages");

    const result = await getBirdyChat(chatId, USER_ID);

    expect(result).not.toBeNull();
    expect(result!.messages).toEqual([]);
  });
});

// ── deleteBirdyChat ───────────────────────────────────────────────────────────

describe("deleteBirdyChat", () => {
  it("returns { ok: true } when deleting an owned chat", async () => {
    const chatId = await insertChat(USER_ID, "Delete Me");

    const result = await deleteBirdyChat(chatId, USER_ID);

    expect(result).toEqual({ ok: true });
  });

  it("removes the chat from the database", async () => {
    const chatId = await insertChat(USER_ID, "Delete Me");

    await deleteBirdyChat(chatId, USER_ID);

    const rows = await testState.client!.execute({
      sql: `SELECT id FROM birdy_chats WHERE id = ?`,
      args: [chatId],
    });
    expect(rows.rows).toHaveLength(0);
  });

  it("cascade-deletes associated messages", async () => {
    const chatId = await insertChat(USER_ID, "Chat with messages");
    await insertMessage(chatId, "user", "Hello");
    await insertMessage(chatId, "assistant", "Hi");

    await deleteBirdyChat(chatId, USER_ID);

    const rows = await testState.client!.execute({
      sql: `SELECT id FROM birdy_chat_messages WHERE chat_id = ?`,
      args: [chatId],
    });
    expect(rows.rows).toHaveLength(0);
  });

  it("returns null when the chat belongs to another user", async () => {
    const chatId = await insertChat(OTHER_USER_ID, "Not My Chat");

    const result = await deleteBirdyChat(chatId, USER_ID);

    expect(result).toBeNull();
  });

  it("returns null for a non-existent chat id", async () => {
    const result = await deleteBirdyChat(99999, USER_ID);
    expect(result).toBeNull();
  });

  it("does not delete another user's chat when ownership check fails", async () => {
    const chatId = await insertChat(OTHER_USER_ID, "Other's Chat");

    await deleteBirdyChat(chatId, USER_ID);

    const rows = await testState.client!.execute({
      sql: `SELECT id FROM birdy_chats WHERE id = ?`,
      args: [chatId],
    });
    expect(rows.rows).toHaveLength(1);
  });
});
