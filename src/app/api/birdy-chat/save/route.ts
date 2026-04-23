import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveBirdyChat } from "@/lib/dal/birdyChats";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified)
    return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const body = await req.json();
  const { title, messages } = body as {
    title?: string;
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!title || typeof title !== "string" || title.trim() === "") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages must be a non-empty array" }, { status: 400 });
  }

  const result = await saveBirdyChat(session.user.id, title, messages);
  return NextResponse.json({ chatId: result.chatId });
}
