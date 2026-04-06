import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";

export type User = typeof userTable.$inferSelect;

/** Fetch a user by ID. Returns null if not found. */
export async function getUserById(userId: string): Promise<User | null> {
  const [row] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return row ?? null;
}
