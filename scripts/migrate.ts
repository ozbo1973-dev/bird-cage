/**
 * Startup migration script.
 * Run this before starting the Next.js server (e.g. in Docker entrypoint or Vercel build).
 * Usage: npx tsx scripts/migrate.ts
 *
 * Environment variables:
 *   TURSO_DATABASE_URL  — libSQL URL (e.g. libsql://your-db.turso.io or file:./bird-cage.db)
 *   TURSO_AUTH_TOKEN    — Turso auth token (required for remote databases)
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";

const url = process.env.TURSO_DATABASE_URL ?? "file:./bird-cage.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });
const db = drizzle(client);

async function main() {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("Migrations applied successfully");

  // Idempotent schema safety check: ensure photo_data column exists.
  // Drizzle's migration tracker may skip a migration if its hash was already
  // recorded (e.g. from a prior failed run), leaving the column missing.
  const tableInfo = await client.execute("PRAGMA table_info(bird_entries)");
  const hasPhotoData = tableInfo.rows.some((row) => row[1] === "photo_data");
  if (!hasPhotoData) {
    console.log("photo_data column missing — applying schema fix");
    await client.execute(
      "ALTER TABLE bird_entries ADD COLUMN photo_data text"
    );
    console.log("photo_data column added successfully");
  }

  await client.close();
}

main();
