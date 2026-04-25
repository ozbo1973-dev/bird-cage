import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveDiscussion, listUserDiscussions } from "@/lib/dal/chatDiscussions";
import type { Message } from "@/lib/dal/chatDiscussions";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified)
    return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const discussions = await listUserDiscussions(session.user.id);
  return NextResponse.json(discussions);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified)
    return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const body = (await req.json()) as { title?: string; messages?: Message[] };
  if (!body.title?.trim() || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "title and messages are required" }, { status: 400 });
  }

  const discussion = await saveDiscussion(
    session.user.id,
    body.title.trim(),
    body.messages,
  );
  return NextResponse.json(discussion, { status: 201 });
}
