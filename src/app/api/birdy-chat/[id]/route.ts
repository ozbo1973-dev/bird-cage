import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteDiscussion } from "@/lib/dal/chatDiscussions";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified)
    return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const deleted = await deleteDiscussion(numId, session.user.id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
