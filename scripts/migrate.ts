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

  // Idempotent schema safety check: ensure role column exists on user table.
  const userTableInfo = await client.execute("PRAGMA table_info(user)");
  const hasRole = userTableInfo.rows.some((row) => row[1] === "role");
  if (!hasRole) {
    console.log("role column missing from user table — applying schema fix");
    await client.execute(
      "ALTER TABLE `user` ADD COLUMN `role` text DEFAULT 'user' NOT NULL"
    );
    console.log("role column added successfully");
  }

  // Idempotent schema safety check: ensure billing_plan column exists on user table.
  const hasBillingPlan = userTableInfo.rows.some((row) => row[1] === "billing_plan");
  if (!hasBillingPlan) {
    console.log("billing_plan column missing from user table — applying schema fix");
    await client.execute(
      "ALTER TABLE `user` ADD COLUMN `billing_plan` text DEFAULT 'free' NOT NULL"
    );
    console.log("billing_plan column added successfully");
  }

  // Idempotent schema safety check: ensure email_logs table exists.
  const emailLogsCheck = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='email_logs'"
  );
  if (emailLogsCheck.rows.length === 0) {
    console.log("email_logs table missing — applying schema fix");
    await client.execute(
      `CREATE TABLE \`email_logs\` (
        \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        \`sender_id\` text NOT NULL,
        \`recipient_id\` text NOT NULL,
        \`subject\` text NOT NULL,
        \`message\` text NOT NULL,
        \`sent_at\` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
        FOREIGN KEY (\`sender_id\`) REFERENCES \`user\`(\`id\`) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (\`recipient_id\`) REFERENCES \`user\`(\`id\`) ON UPDATE no action ON DELETE cascade
      )`
    );
    await client.execute(
      "CREATE INDEX `email_logs_recipient_idx` ON `email_logs` (`recipient_id`)"
    );
    await client.execute(
      "CREATE INDEX `email_logs_sender_idx` ON `email_logs` (`sender_id`)"
    );
    console.log("email_logs table created successfully");
  }

  await client.close();
}

main();
