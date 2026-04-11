import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { birdingEvents, birdEntries } from "@/db/schema";
import type { BirdingEvent, BirdEntry } from "@/db/schema";
import { toBirdInsert, BirdFormInput } from "@/lib/birds";

export type EventWithBirds = BirdingEvent & { birds: BirdEntry[] };

/** Fetch all events with their bird entries for a given user. */
export async function getUserEvents(userId: string): Promise<EventWithBirds[]> {
  const events = await db
    .select()
    .from(birdingEvents)
    .where(eq(birdingEvents.userId, userId))
    .orderBy(birdingEvents.date);

  const birds = await db
    .select()
    .from(birdEntries)
    .innerJoin(birdingEvents, eq(birdEntries.eventId, birdingEvents.id))
    .where(eq(birdingEvents.userId, userId));

  return events.map((event) => ({
    ...event,
    birds: birds
      .filter((row) => row.bird_entries.eventId === event.id)
      .map((row) => row.bird_entries),
  }));
}

/** Fetch a single bird entry, enforcing user ownership via the parent event. Returns null if not found or not owned. */
export async function getBirdEntry(
  birdId: number,
  userId: string,
): Promise<BirdEntry | null> {
  const [row] = await db
    .select({ bird: birdEntries })
    .from(birdEntries)
    .innerJoin(birdingEvents, eq(birdEntries.eventId, birdingEvents.id))
    .where(and(eq(birdEntries.id, birdId), eq(birdingEvents.userId, userId)));

  return row?.bird ?? null;
}

/**
 * Insert a bird entry for a given event, enforcing user ownership.
 * Returns the inserted bird, or null if the event does not exist or is not owned by the user.
 */
export async function addBirdToEvent(
  eventId: number,
  userId: string,
  bird: BirdFormInput,
): Promise<BirdEntry | null> {
  const [event] = await db
    .select()
    .from(birdingEvents)
    .where(and(eq(birdingEvents.id, eventId), eq(birdingEvents.userId, userId)));

  if (!event) return null;

  const [inserted] = await db
    .insert(birdEntries)
    .values(toBirdInsert(bird, eventId))
    .returning();

  return inserted ?? null;
}

/** Fetch a single event with its birds, enforcing user ownership. Returns null if not found or not owned. */
export async function getEventWithBirds(
  eventId: number,
  userId: string,
): Promise<EventWithBirds | null> {
  const [event] = await db
    .select()
    .from(birdingEvents)
    .where(and(eq(birdingEvents.id, eventId), eq(birdingEvents.userId, userId)));

  if (!event) return null;

  const birds = await db
    .select()
    .from(birdEntries)
    .where(eq(birdEntries.eventId, eventId));

  return { ...event, birds };
}
