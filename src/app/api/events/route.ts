import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import { birdingEvents, birdEntries } from "../../../db/schema";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, date, notes, birds } = body;

  const [event] = await db
    .insert(birdingEvents)
    .values({ userId: session.user.id, title, date, notes })
    .returning();

  if (birds && birds.length > 0) {
    await db.insert(birdEntries).values(
      birds.map(
        (b: {
          type: string;
          species: string;
          locationName: string;
          lat?: number;
          lng?: number;
          dateStamp: string;
          notes?: string;
          photoPath?: string;
        }) => ({
          eventId: event.id,
          type: b.type,
          species: b.species,
          locationName: b.locationName,
          lat: b.lat ?? null,
          lng: b.lng ?? null,
          dateStamp: b.dateStamp,
          notes: b.notes ?? null,
          photoPath: b.photoPath ?? null,
        }),
      ),
    );
  }

  return NextResponse.json({ ok: true, eventId: event.id });
}
