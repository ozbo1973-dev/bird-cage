/**
 * Startup migration script.
 * Run this before starting the Next.js server (e.g. in Docker entrypoint).
 * Usage: npx tsx scripts/migrate.ts
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";

const DB_PATH =
  process.env.DATABASE_URL ?? path.join(process.cwd(), "bird-cage.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

console.log("Migrations applied successfully");
sqlite.close();
