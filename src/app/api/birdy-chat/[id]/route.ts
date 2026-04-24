import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteBirdyChat } from "@/lib/dal/birdyChats";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified)
    return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const { id } = await params;
  const chatId = parseInt(id, 10);

  const result = await deleteBirdyChat(chatId, session.user.id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new Response(null, { status: 204 });
}
