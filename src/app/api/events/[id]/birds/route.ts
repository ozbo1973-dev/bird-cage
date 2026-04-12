import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addBirdToOwnedEvent } from "@/lib/dal/birds";
import type { BirdFormInput } from "@/lib/birds";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified) return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const { id } = await params;
  const eventId = parseInt(id, 10);
  if (isNaN(eventId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body: BirdFormInput = await req.json();

  if (!body.type?.trim() || !body.species?.trim() || !body.locationName?.trim() || !body.dateStamp?.trim()) {
    return NextResponse.json({ error: "type, species, locationName, and dateStamp are required" }, { status: 400 });
  }

  const result = await addBirdToOwnedEvent(eventId, session.user.id, body);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, birdId: result.birdId });
}
