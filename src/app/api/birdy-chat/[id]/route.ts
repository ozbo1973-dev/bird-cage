import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteDiscussion } from "@/lib/dal/chatDiscussions";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified) return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const { id } = await params;
  const discussionId = parseInt(id, 10);
  if (isNaN(discussionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const result = await deleteDiscussion(discussionId, session.user.id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
