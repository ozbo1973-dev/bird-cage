import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addBirdToEvent } from "@/lib/dal/events";
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

  const bird = await addBirdToEvent(eventId, session.user.id, body);
  if (!bird) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, birdId: bird.id });
}
