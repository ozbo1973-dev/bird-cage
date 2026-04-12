import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { createOwnedEvent } from "@/lib/dal/events";
import type { BirdFormInput } from "@/lib/birds";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified)
    return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const { title, date, notes, birds } = await req.json();

  if (!title?.trim() || !date?.trim()) {
    return NextResponse.json({ error: "title and date are required" }, { status: 400 });
  }

  const { eventId } = await createOwnedEvent(
    session.user.id,
    { title, date, notes },
    (birds ?? []) as BirdFormInput[],
  );

  return NextResponse.json({ ok: true, eventId });
}
