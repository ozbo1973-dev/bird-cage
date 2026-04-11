/**
 * Integration tests for ownership-embedded DAL functions.
 * Every assertion hits real SQLite via an in-process libSQL file database.
 *
 * Pattern: vi.mock("@/db") is hoisted before module imports.
 * The factory creates a file-based client and stores it in testState so
 * beforeAll/beforeEach/afterAll hooks can run DDL/DML against the same DB.
 *
 * NOTE: We use a temp file (not :memory:) because @libsql/client uses a
 * connection pool. Each pool connection to ":memory:" gets its own isolated
 * empty DB, which breaks db.transaction() in the DAL. A file URL shares
 * state across all pool connections.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { Client } from "@libsql/client";
import fs from "fs";

// vi.hoisted ensures testState is created before vi.mock factories run
// (avoids the temporal dead-zone error that let/const would cause here).
const testState = vi.hoisted(() => ({
  client: null as Client | null,
  dbPath: `/tmp/bird-cage-dal-test-${process.pid}-${Date.now()}.db`,
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

// Static imports resolve after the mock is registered
import {
  updateOwnedBird,
  deleteOwnedBird,
  addBirdToOwnedEvent,
} from "@/lib/dal/birds";
import {
  createOwnedEvent,
  replaceOwnedEvent,
  deleteOwnedEvent,
} from "@/lib/dal/events";

// ── Test fixture constants ────────────────────────────────────────────────────
const USER_ID = "user-test-001";
const OTHER_USER_ID = "user-test-002";

// ── Helpers ───────────────────────────────────────────────────────────────────
async function insertEvent(
  userId: string,
  title = "Test Event",
): Promise<number> {
  const result = await testState.client!.execute({
    sql: `INSERT INTO birding_events (user_id, title, date, created_at)
          VALUES (?, ?, '2026-04-11', '2026-04-11T00:00:00Z')`,
    args: [userId, title],
  });
  return Number(result.lastInsertRowid);
}

async function insertBird(
  eventId: number,
  photoPath?: string | null,
): Promise<number> {
  const result = await testState.client!.execute({
    sql: `INSERT INTO bird_entries
            (event_id, type, species, location_name, date_stamp, photo_path)
          VALUES (?, 'Songbird', 'Robin', 'Park', '2026-04-11', ?)`,
    args: [eventId, photoPath ?? null],
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
    CREATE TABLE IF NOT EXISTS birding_events (
      id         integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id    text    NOT NULL REFERENCES "user"(id),
      title      text    NOT NULL,
      date       text    NOT NULL,
      notes      text,
      created_at text    NOT NULL DEFAULT ''
    )
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS bird_entries (
      id            integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      event_id      integer NOT NULL
                      REFERENCES birding_events(id) ON DELETE CASCADE,
      type          text    NOT NULL,
      species       text    NOT NULL,
      location_name text    NOT NULL,
      lat           real,
      lng           real,
      date_stamp    text    NOT NULL,
      notes         text,
      photo_path    text,
      photo_data    text
    )
  `);

  // Seed test users once — they persist for the entire test file
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

// Remove temp DB file after all tests complete
afterAll(() => {
  for (const ext of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(`${testState.dbPath}${ext}`);
    } catch {
      // file may not exist — ignore
    }
  }
});

// Clear event + bird rows between tests; users persist.
beforeEach(async () => {
  const c = testState.client!;
  await c.execute("DELETE FROM bird_entries");
  await c.execute("DELETE FROM birding_events");
});

// ── updateOwnedBird ───────────────────────────────────────────────────────────
describe("updateOwnedBird", () => {
  it("returns { ok: true } when bird is owned by the user", async () => {
    const eventId = await insertEvent(USER_ID);
    const birdId = await insertBird(eventId);

    const result = await updateOwnedBird(birdId, USER_ID, {
      type: "Raptor",
      species: "Hawk",
      locationName: "Mountain",
      dateStamp: "2026-04-11",
    });

    expect(result).toEqual({ ok: true });
  });

  it("persists updated fields to the database", async () => {
    const eventId = await insertEvent(USER_ID);
    const birdId = await insertBird(eventId);

    await updateOwnedBird(birdId, USER_ID, {
      type: "Raptor",
      species: "Bald Eagle",
      locationName: "Lake",
      lat: 40.0,
      lng: -75.0,
      dateStamp: "2026-04-12",
      notes: "Soaring high",
    });

    const rows = await testState.client!.execute({
      sql: `SELECT type, species, location_name, lat, lng, date_stamp, notes
            FROM bird_entries WHERE id = ?`,
      args: [birdId],
    });
    const row = rows.rows[0];
    expect(row[0]).toBe("Raptor");
    expect(row[1]).toBe("Bald Eagle");
    expect(row[2]).toBe("Lake");
    expect(row[3]).toBe(40.0);
    expect(row[4]).toBe(-75.0);
    expect(row[5]).toBe("2026-04-12");
    expect(row[6]).toBe("Soaring high");
  });

  it("returns null when the bird does not exist", async () => {
    const result = await updateOwnedBird(9999, USER_ID, {
      type: "Raptor",
      species: "Hawk",
      locationName: "Mountain",
      dateStamp: "2026-04-11",
    });
    expect(result).toBeNull();
  });

  it("returns null when the bird belongs to another user", async () => {
    const eventId = await insertEvent(OTHER_USER_ID);
    const birdId = await insertBird(eventId);

    const result = await updateOwnedBird(birdId, USER_ID, {
      type: "Raptor",
      species: "Hawk",
      locationName: "Mountain",
      dateStamp: "2026-04-11",
    });
    expect(result).toBeNull();
  });
});

// ── deleteOwnedBird ───────────────────────────────────────────────────────────
describe("deleteOwnedBird", () => {
  it("returns { photoPath } when bird is owned and has a photo", async () => {
    const eventId = await insertEvent(USER_ID);
    const birdId = await insertBird(eventId, "photo.jpg");

    const result = await deleteOwnedBird(birdId, USER_ID);
    expect(result).toEqual({ photoPath: "photo.jpg" });
  });

  it("returns { photoPath: null } when bird has no photo", async () => {
    const eventId = await insertEvent(USER_ID);
    const birdId = await insertBird(eventId);

    const result = await deleteOwnedBird(birdId, USER_ID);
    expect(result).toEqual({ photoPath: null });
  });

  it("removes the bird from the database", async () => {
    const eventId = await insertEvent(USER_ID);
    const birdId = await insertBird(eventId);

    await deleteOwnedBird(birdId, USER_ID);

    const rows = await testState.client!.execute({
      sql: "SELECT id FROM bird_entries WHERE id = ?",
      args: [birdId],
    });
    expect(rows.rows).toHaveLength(0);
  });

  it("returns null when the bird does not exist", async () => {
    const result = await deleteOwnedBird(9999, USER_ID);
    expect(result).toBeNull();
  });

  it("returns null when bird belongs to another user", async () => {
    const eventId = await insertEvent(OTHER_USER_ID);
    const birdId = await insertBird(eventId);

    const result = await deleteOwnedBird(birdId, USER_ID);
    expect(result).toBeNull();
  });
});

// ── addBirdToOwnedEvent ───────────────────────────────────────────────────────
describe("addBirdToOwnedEvent", () => {
  it("inserts a bird and returns its id when event is owned", async () => {
    const eventId = await insertEvent(USER_ID);

    const result = await addBirdToOwnedEvent(eventId, USER_ID, {
      type: "Waterfowl",
      species: "Canada Goose",
      locationName: "River",
      dateStamp: "2026-04-11",
    });

    expect(result).not.toBeNull();
    expect(typeof result!.birdId).toBe("number");
  });

  it("actually persists the bird to the database", async () => {
    const eventId = await insertEvent(USER_ID);

    const result = await addBirdToOwnedEvent(eventId, USER_ID, {
      type: "Waterfowl",
      species: "Mallard",
      locationName: "Pond",
      dateStamp: "2026-04-11",
      notes: "Quacking",
    });

    const rows = await testState.client!.execute({
      sql: "SELECT species, notes FROM bird_entries WHERE id = ?",
      args: [result!.birdId],
    });
    expect(rows.rows[0][0]).toBe("Mallard");
    expect(rows.rows[0][1]).toBe("Quacking");
  });

  it("returns null when event does not exist", async () => {
    const result = await addBirdToOwnedEvent(9999, USER_ID, {
      type: "Waterfowl",
      species: "Goose",
      locationName: "Lake",
      dateStamp: "2026-04-11",
    });
    expect(result).toBeNull();
  });

  it("returns null when event belongs to another user", async () => {
    const eventId = await insertEvent(OTHER_USER_ID);

    const result = await addBirdToOwnedEvent(eventId, USER_ID, {
      type: "Waterfowl",
      species: "Goose",
      locationName: "Lake",
      dateStamp: "2026-04-11",
    });
    expect(result).toBeNull();
  });
});

// ── createOwnedEvent ──────────────────────────────────────────────────────────
describe("createOwnedEvent", () => {
  it("creates an event and returns its id", async () => {
    const result = await createOwnedEvent(
      USER_ID,
      { title: "Morning Walk", date: "2026-04-11" },
      [],
    );
    expect(typeof result.eventId).toBe("number");
  });

  it("assigns the event to the correct user", async () => {
    const result = await createOwnedEvent(
      USER_ID,
      { title: "User Walk", date: "2026-04-11" },
      [],
    );

    const rows = await testState.client!.execute({
      sql: "SELECT user_id FROM birding_events WHERE id = ?",
      args: [result.eventId],
    });
    expect(rows.rows[0][0]).toBe(USER_ID);
  });

  it("inserts all bird entries when provided", async () => {
    const result = await createOwnedEvent(
      USER_ID,
      { title: "Bird Walk", date: "2026-04-11" },
      [
        {
          type: "Songbird",
          species: "Robin",
          locationName: "Park",
          dateStamp: "2026-04-11",
        },
        {
          type: "Raptor",
          species: "Hawk",
          locationName: "Field",
          dateStamp: "2026-04-11",
        },
      ],
    );

    const rows = await testState.client!.execute({
      sql: "SELECT species FROM bird_entries WHERE event_id = ?",
      args: [result.eventId],
    });
    expect(rows.rows).toHaveLength(2);
  });

  it("creates an event with no birds when birds array is empty", async () => {
    const result = await createOwnedEvent(
      USER_ID,
      { title: "Solo Walk", date: "2026-04-11" },
      [],
    );

    const rows = await testState.client!.execute({
      sql: "SELECT id FROM bird_entries WHERE event_id = ?",
      args: [result.eventId],
    });
    expect(rows.rows).toHaveLength(0);
  });
});

// ── replaceOwnedEvent ─────────────────────────────────────────────────────────
describe("replaceOwnedEvent", () => {
  it("returns the photoPaths of the replaced birds", async () => {
    const eventId = await insertEvent(USER_ID);
    await insertBird(eventId, "old-photo.jpg");
    await insertBird(eventId); // no photo

    const result = await replaceOwnedEvent(
      eventId,
      USER_ID,
      { title: "Updated", date: "2026-04-12" },
      [],
    );

    expect(result).not.toBeNull();
    expect(result!.photoPaths).toContain("old-photo.jpg");
    expect(result!.photoPaths).toContain(null);
  });

  it("replaces all old birds with the new set", async () => {
    const eventId = await insertEvent(USER_ID);
    await insertBird(eventId);
    await insertBird(eventId);

    await replaceOwnedEvent(
      eventId,
      USER_ID,
      { title: "Updated", date: "2026-04-12" },
      [
        {
          type: "Raptor",
          species: "Eagle",
          locationName: "Mountain",
          dateStamp: "2026-04-12",
        },
      ],
    );

    const rows = await testState.client!.execute({
      sql: "SELECT species FROM bird_entries WHERE event_id = ?",
      args: [eventId],
    });
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0][0]).toBe("Eagle");
  });

  it("updates event title, date, and notes", async () => {
    const eventId = await insertEvent(USER_ID);

    await replaceOwnedEvent(
      eventId,
      USER_ID,
      { title: "New Title", date: "2026-04-20", notes: "Nice day" },
      [],
    );

    const rows = await testState.client!.execute({
      sql: "SELECT title, date, notes FROM birding_events WHERE id = ?",
      args: [eventId],
    });
    expect(rows.rows[0][0]).toBe("New Title");
    expect(rows.rows[0][1]).toBe("2026-04-20");
    expect(rows.rows[0][2]).toBe("Nice day");
  });

  it("returns null when the event does not belong to the user", async () => {
    const eventId = await insertEvent(OTHER_USER_ID);

    const result = await replaceOwnedEvent(
      eventId,
      USER_ID,
      { title: "Hack", date: "2026-04-11" },
      [],
    );
    expect(result).toBeNull();
  });

  it("returns empty photoPaths when no existing birds had photos", async () => {
    const eventId = await insertEvent(USER_ID);
    await insertBird(eventId); // no photo

    const result = await replaceOwnedEvent(
      eventId,
      USER_ID,
      { title: "Updated", date: "2026-04-12" },
      [],
    );
    expect(result!.photoPaths).toEqual([null]);
  });
});

// ── deleteOwnedEvent ──────────────────────────────────────────────────────────
describe("deleteOwnedEvent", () => {
  it("deletes the event and returns bird photoPaths", async () => {
    const eventId = await insertEvent(USER_ID);
    await insertBird(eventId, "bird1.jpg");
    await insertBird(eventId); // no photo

    const result = await deleteOwnedEvent(eventId, USER_ID);

    expect(result).not.toBeNull();
    expect(result!.photoPaths).toContain("bird1.jpg");
    expect(result!.photoPaths).toContain(null);
  });

  it("removes the event from the database", async () => {
    const eventId = await insertEvent(USER_ID);

    await deleteOwnedEvent(eventId, USER_ID);

    const rows = await testState.client!.execute({
      sql: "SELECT id FROM birding_events WHERE id = ?",
      args: [eventId],
    });
    expect(rows.rows).toHaveLength(0);
  });

  it("cascade-deletes associated birds", async () => {
    const eventId = await insertEvent(USER_ID);
    await insertBird(eventId);
    await insertBird(eventId);

    await deleteOwnedEvent(eventId, USER_ID);

    const rows = await testState.client!.execute({
      sql: "SELECT id FROM bird_entries WHERE event_id = ?",
      args: [eventId],
    });
    expect(rows.rows).toHaveLength(0);
  });

  it("returns null when event does not belong to the user", async () => {
    const eventId = await insertEvent(OTHER_USER_ID);

    const result = await deleteOwnedEvent(eventId, USER_ID);
    expect(result).toBeNull();
  });

  it("returns empty photoPaths when event has no birds", async () => {
    const eventId = await insertEvent(USER_ID);

    const result = await deleteOwnedEvent(eventId, USER_ID);
    expect(result).toEqual({ photoPaths: [] });
  });
});
