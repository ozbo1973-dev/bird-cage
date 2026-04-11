import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteUploadedFile } from "@/lib/uploads";
import { replaceOwnedEvent, deleteOwnedEvent } from "@/lib/dal/events";
import type { BirdFormInput } from "@/lib/birds";

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

  const { title, date, notes, birds } = await req.json();

  const result = await replaceOwnedEvent(
    eventId,
    session.user.id,
    { title, date, notes },
    (birds ?? []) as BirdFormInput[],
  );

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await Promise.all(result.photoPaths.map(deleteUploadedFile));

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

  const result = await deleteOwnedEvent(eventId, session.user.id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await Promise.all(result.photoPaths.map(deleteUploadedFile));

  return NextResponse.json({ ok: true });
}
