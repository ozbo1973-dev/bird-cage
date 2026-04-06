import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable, birdingEvents, birdEntries } from "@/db/schema";

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

/** Fetch all users ordered by creation date (admin only). */
export async function getAllUsers(): Promise<User[]> {
  return db.select().from(userTable).orderBy(userTable.createdAt);
}

/** Update name, email, and role for a user (admin only). */
export async function updateUserAdmin(
  userId: string,
  data: { name: string; email: string; role: "user" | "admin" },
): Promise<void> {
  await db
    .update(userTable)
    .set({ name: data.name, email: data.email, role: data.role })
    .where(eq(userTable.id, userId));
}

/**
 * Delete a user and all their data (admin only).
 * Cascades: bird_entries are deleted via eventId cascade,
 * sessions and accounts are deleted via userId cascade on user delete.
 */
export async function deleteUserAndData(userId: string): Promise<void> {
  // Collect photo paths to clean up
  const birds = await db
    .select({ photoPath: birdEntries.photoPath })
    .from(birdEntries)
    .innerJoin(birdingEvents, eq(birdEntries.eventId, birdingEvents.id))
    .where(eq(birdingEvents.userId, userId));

  // Delete birding events (bird_entries cascade via eventId)
  await db.delete(birdingEvents).where(eq(birdingEvents.userId, userId));

  // Delete the user (sessions/accounts cascade via userId)
  await db.delete(userTable).where(eq(userTable.id, userId));

  // Clean up photo files after DB records removed
  const { deleteUploadedFile } = await import("@/lib/uploads");
  await Promise.all(birds.map((b) => deleteUploadedFile(b.photoPath)));
}
