import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { birdingEvents, birdEntries } from "@/db/schema";
import { deleteUploadedFile } from "@/lib/uploads";

type BirdPayload = {
  type: string;
  species: string;
  locationName: string;
  lat?: number | null;
  lng?: number | null;
  dateStamp: string;
  notes?: string | null;
  photoPath?: string | null;
  photoData?: string | null;
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified) return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const { id } = await params;
  const eventId = parseInt(id, 10);
  if (isNaN(eventId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [event] = await db
    .select()
    .from(birdingEvents)
    .where(and(eq(birdingEvents.id, eventId), eq(birdingEvents.userId, session.user.id)));

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title, date, notes, birds } = await req.json();

  const existingBirds = await db
    .select({ photoPath: birdEntries.photoPath })
    .from(birdEntries)
    .where(eq(birdEntries.eventId, eventId));

  await db.transaction(async (tx) => {
    await tx
      .update(birdingEvents)
      .set({ title, date, notes: notes ?? null })
      .where(eq(birdingEvents.id, eventId));

    await tx.delete(birdEntries).where(eq(birdEntries.eventId, eventId));

    if (birds && birds.length > 0) {
      await tx.insert(birdEntries).values(
        birds.map((b: BirdPayload) => ({
          eventId,
          type: b.type,
          species: b.species,
          locationName: b.locationName,
          lat: b.lat ?? null,
          lng: b.lng ?? null,
          dateStamp: b.dateStamp,
          notes: b.notes ?? null,
          photoPath: b.photoData ? null : (b.photoPath ?? null),
          photoData: b.photoData ?? null,
        })),
      );
    }
  });

  await Promise.all(existingBirds.map((bird) => deleteUploadedFile(bird.photoPath)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const eventId = parseInt(id, 10);
  if (isNaN(eventId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [event] = await db
    .select()
    .from(birdingEvents)
    .where(and(eq(birdingEvents.id, eventId), eq(birdingEvents.userId, session.user.id)));

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const birds = await db
    .select({ photoPath: birdEntries.photoPath })
    .from(birdEntries)
    .where(eq(birdEntries.eventId, eventId));

  await db.delete(birdingEvents).where(eq(birdingEvents.id, eventId));

  await Promise.all(birds.map((bird) => deleteUploadedFile(bird.photoPath)));

  return NextResponse.json({ ok: true });
}
