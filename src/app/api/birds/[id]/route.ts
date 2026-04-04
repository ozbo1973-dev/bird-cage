import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { birdingEvents, birdEntries } from "@/db/schema";
import { isSafeFilename, deleteUploadedFile } from "@/lib/uploads";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const birdId = parseInt(id, 10);
  if (isNaN(birdId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  // Verify ownership
  const [row] = await db
    .select({ birdId: birdEntries.id })
    .from(birdEntries)
    .innerJoin(birdingEvents, eq(birdEntries.eventId, birdingEvents.id))
    .where(and(eq(birdEntries.id, birdId), eq(birdingEvents.userId, session.user.id)));

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { type, species, locationName, lat, lng, dateStamp, notes, photoPath, photoData } = body;

  if (!type || !species || !locationName || !dateStamp) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (photoPath && !isSafeFilename(photoPath) && !photoPath.startsWith("https://")) {
    return NextResponse.json({ error: "Invalid photo path" }, { status: 400 });
  }

  await db
    .update(birdEntries)
    .set({ type, species, locationName, lat: lat ?? null, lng: lng ?? null, dateStamp, notes: notes ?? null, photoPath: photoData ? null : (photoPath ?? null), photoData: photoData ?? null })
    .where(eq(birdEntries.id, birdId));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const birdId = parseInt(id, 10);
  if (isNaN(birdId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  // Single query: verify the bird exists and belongs to the session user
  const [row] = await db
    .select({ birdId: birdEntries.id, photoPath: birdEntries.photoPath })
    .from(birdEntries)
    .innerJoin(birdingEvents, eq(birdEntries.eventId, birdingEvents.id))
    .where(and(eq(birdEntries.id, birdId), eq(birdingEvents.userId, session.user.id)));

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(birdEntries).where(eq(birdEntries.id, birdId));
  await deleteUploadedFile(row.photoPath);

  return NextResponse.json({ ok: true });
}
