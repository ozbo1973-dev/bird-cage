import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { birdingEvents, birdEntries } from "@/db/schema";

export async function POST(
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

  const { type, species, locationName, lat, lng, dateStamp, notes, photoPath } = await req.json();

  const [bird] = await db
    .insert(birdEntries)
    .values({
      eventId,
      type,
      species,
      locationName,
      lat: lat ?? null,
      lng: lng ?? null,
      dateStamp,
      notes: notes ?? null,
      photoPath: photoPath ?? null,
    })
    .returning();

  return NextResponse.json({ ok: true, birdId: bird.id });
}
