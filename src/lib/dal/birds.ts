import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { birdingEvents, birdEntries } from "@/db/schema";
import { toBirdInsert, BirdFormInput } from "@/lib/birds";

/**
 * Updates a bird entry, enforcing user ownership via the parent event.
 * Returns { ok: true } if the update succeeded, or null if not found/not owned.
 */
export async function updateOwnedBird(
  birdId: number,
  userId: string,
  fields: BirdFormInput,
): Promise<{ ok: true } | null> {
  const [row] = await db
    .select({ id: birdEntries.id })
    .from(birdEntries)
    .innerJoin(birdingEvents, eq(birdEntries.eventId, birdingEvents.id))
    .where(and(eq(birdEntries.id, birdId), eq(birdingEvents.userId, userId)));

  if (!row) return null;

  await db
    .update(birdEntries)
    .set({
      type: fields.type,
      species: fields.species,
      locationName: fields.locationName,
      lat: fields.lat ?? null,
      lng: fields.lng ?? null,
      dateStamp: fields.dateStamp,
      notes: fields.notes ?? null,
      photoPath: fields.photoData ? null : (fields.photoPath ?? null),
      photoData: fields.photoData ?? null,
    })
    .where(eq(birdEntries.id, birdId));

  return { ok: true };
}

/**
 * Deletes a bird entry, enforcing user ownership via the parent event.
 * Returns { photoPath } for caller file cleanup, or null if not found/not owned.
 */
export async function deleteOwnedBird(
  birdId: number,
  userId: string,
): Promise<{ photoPath: string | null } | null> {
  const [row] = await db
    .select({ id: birdEntries.id, photoPath: birdEntries.photoPath })
    .from(birdEntries)
    .innerJoin(birdingEvents, eq(birdEntries.eventId, birdingEvents.id))
    .where(and(eq(birdEntries.id, birdId), eq(birdingEvents.userId, userId)));

  if (!row) return null;

  await db.delete(birdEntries).where(eq(birdEntries.id, birdId));

  return { photoPath: row.photoPath ?? null };
}

/**
 * Inserts a bird into an event, enforcing user ownership of the event.
 * Returns { birdId } for the inserted record, or null if event not found/not owned.
 */
export async function addBirdToOwnedEvent(
  eventId: number,
  userId: string,
  data: BirdFormInput,
): Promise<{ birdId: number } | null> {
  const [event] = await db
    .select({ id: birdingEvents.id })
    .from(birdingEvents)
    .where(and(eq(birdingEvents.id, eventId), eq(birdingEvents.userId, userId)));

  if (!event) return null;

  const [inserted] = await db
    .insert(birdEntries)
    .values(toBirdInsert(data, eventId))
    .returning({ birdId: birdEntries.id });

  return { birdId: inserted.birdId };
}
