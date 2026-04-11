import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import { birdingEvents, birdEntries } from "../../../db/schema";
import { toBirdInsert, BirdFormInput } from "@/lib/birds";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified)
    return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const body = await req.json();
  const { title, date, notes, birds } = body;

  const [event] = await db
    .insert(birdingEvents)
    .values({ userId: session.user.id, title, date, notes })
    .returning();

  if (birds && birds.length > 0) {
    await db.insert(birdEntries).values(
      birds.map((b: BirdFormInput) => toBirdInsert(b, event.id)),
    );
  }

  return NextResponse.json({ ok: true, eventId: event.id });
}
