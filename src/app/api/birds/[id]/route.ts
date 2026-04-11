import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSafeFilename, deleteUploadedFile } from "@/lib/uploads";
import { updateOwnedBird, deleteOwnedBird } from "@/lib/dal/birds";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified) return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const { id } = await params;
  const birdId = parseInt(id, 10);
  if (isNaN(birdId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const { type, species, locationName, lat, lng, dateStamp, notes, photoPath, photoData } = body;

  if (!type || !species || !locationName || !dateStamp) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (photoPath && !isSafeFilename(photoPath) && !photoPath.startsWith("https://")) {
    return NextResponse.json({ error: "Invalid photo path" }, { status: 400 });
  }

  const result = await updateOwnedBird(birdId, session.user.id, {
    type, species, locationName, lat, lng, dateStamp, notes, photoPath, photoData,
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  const result = await deleteOwnedBird(birdId, session.user.id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteUploadedFile(result.photoPath);

  return NextResponse.json({ ok: true });
}
