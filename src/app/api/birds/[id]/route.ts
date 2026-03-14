import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { birdingEvents, birdEntries } from "@/db/schema";

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
    .select({ birdId: birdEntries.id })
    .from(birdEntries)
    .innerJoin(birdingEvents, eq(birdEntries.eventId, birdingEvents.id))
    .where(and(eq(birdEntries.id, birdId), eq(birdingEvents.userId, session.user.id)));

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(birdEntries).where(eq(birdEntries.id, birdId));

  return NextResponse.json({ ok: true });
}
