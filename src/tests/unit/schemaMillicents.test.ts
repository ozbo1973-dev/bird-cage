/**
 * TDD tests for fragment_millicents (user table) and cost_millicents (usage_logs table).
 * Verifies schema columns exist with correct defaults and accept explicit values.
 * Uses a direct libSQL client — no DAL layer needed for a schema-only slice.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type Client } from "@libsql/client";
import fs from "fs";

const dbPath = `/tmp/bird-cage-schema-millicents-${process.pid}-${Date.now()}.db`;
let client: Client;

const USER_ID = "millicents-test-user-001";
const USER_ID_2 = "millicents-test-user-002";

beforeAll(async () => {
  client = createClient({ url: `file:${dbPath}` });

  await client.execute("PRAGMA foreign_keys = ON");

  // User table with both legacy columns and the new fragment_millicents column
  await client.execute(`
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
      fragment_millicents         integer NOT NULL DEFAULT 0,
      created_at                  integer NOT NULL DEFAULT 0,
      updated_at                  integer NOT NULL DEFAULT 0
    )
  `);

  // usage_logs table with the new cost_millicents column
  await client.execute(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id               integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id          text    NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      model_used       text    NOT NULL,
      cost_cents       integer NOT NULL DEFAULT 0,
      cost_millicents  integer NOT NULL DEFAULT 0,
      created_at       integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
    )
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS usage_logs_userId_createdAt_idx
    ON usage_logs (user_id, created_at)
  `);

  await client.execute({
    sql: `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
          VALUES (?, 'Test User', 'millicents@example.com', 1, 0, 0)`,
    args: [USER_ID],
  });
  await client.execute({
    sql: `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
          VALUES (?, 'Test User 2', 'millicents2@example.com', 1, 0, 0)`,
    args: [USER_ID_2],
  });
});

afterAll(() => {
  for (const ext of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(`${dbPath}${ext}`);
    } catch {
      // file may not exist
    }
  }
});

// ── fragment_millicents on user ───────────────────────────────────────────────

describe("fragment_millicents on user table", () => {
  it("defaults to 0 when not specified on insert", async () => {
    const rows = await client.execute({
      sql: `SELECT fragment_millicents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(0);
  });

  it("can be set to a non-zero value and read back", async () => {
    await client.execute({
      sql: `UPDATE "user" SET fragment_millicents = 750 WHERE id = ?`,
      args: [USER_ID],
    });

    const rows = await client.execute({
      sql: `SELECT fragment_millicents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(750);

    // reset for subsequent tests
    await client.execute({
      sql: `UPDATE "user" SET fragment_millicents = 0 WHERE id = ?`,
      args: [USER_ID],
    });
  });

  it("is stored independently per user row", async () => {
    await client.execute({
      sql: `UPDATE "user" SET fragment_millicents = 500 WHERE id = ?`,
      args: [USER_ID],
    });

    const rows = await client.execute({
      sql: `SELECT fragment_millicents FROM "user" WHERE id = ?`,
      args: [USER_ID_2],
    });
    expect(rows.rows[0][0]).toBe(0);

    // reset
    await client.execute({
      sql: `UPDATE "user" SET fragment_millicents = 0 WHERE id = ?`,
      args: [USER_ID],
    });
  });
});

// ── cost_millicents on usage_logs ─────────────────────────────────────────────

describe("cost_millicents on usage_logs table", () => {
  it("defaults to 0 when not specified on insert", async () => {
    await client.execute({
      sql: `INSERT INTO usage_logs (user_id, model_used, cost_cents) VALUES (?, 'test-model', 10)`,
      args: [USER_ID],
    });

    const rows = await client.execute({
      sql: `SELECT cost_millicents FROM usage_logs WHERE user_id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(0);

    await client.execute({
      sql: `DELETE FROM usage_logs WHERE user_id = ?`,
      args: [USER_ID],
    });
  });

  it("stores an explicit cost_millicents value", async () => {
    await client.execute({
      sql: `INSERT INTO usage_logs (user_id, model_used, cost_cents, cost_millicents) VALUES (?, 'test-model', 5, 830)`,
      args: [USER_ID],
    });

    const rows = await client.execute({
      sql: `SELECT cost_cents, cost_millicents FROM usage_logs WHERE user_id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(5);
    expect(rows.rows[0][1]).toBe(830);

    await client.execute({
      sql: `DELETE FROM usage_logs WHERE user_id = ?`,
      args: [USER_ID],
    });
  });

  it("is stored independently per log entry", async () => {
    await client.execute({
      sql: `INSERT INTO usage_logs (user_id, model_used, cost_cents, cost_millicents) VALUES (?, 'model-a', 3, 100)`,
      args: [USER_ID],
    });
    await client.execute({
      sql: `INSERT INTO usage_logs (user_id, model_used, cost_cents, cost_millicents) VALUES (?, 'model-b', 7, 900)`,
      args: [USER_ID],
    });

    const rows = await client.execute({
      sql: `SELECT cost_millicents FROM usage_logs WHERE user_id = ? ORDER BY id`,
      args: [USER_ID],
    });
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows[0][0]).toBe(100);
    expect(rows.rows[1][0]).toBe(900);

    await client.execute({
      sql: `DELETE FROM usage_logs WHERE user_id = ?`,
      args: [USER_ID],
    });
  });
});
