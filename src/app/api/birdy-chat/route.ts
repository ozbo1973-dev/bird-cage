import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listUserDiscussions, saveDiscussion } from "@/lib/dal/chatDiscussions";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified) return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const discussions = await listUserDiscussions(session.user.id);
  return NextResponse.json({ discussions });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified) return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const body = await req.json();
  const { title, messages } = body as {
    title?: string;
    messages?: { role: "user" | "assistant"; content: string }[];
  };

  if (!title || !Array.isArray(messages)) {
    return NextResponse.json({ error: "title and messages are required" }, { status: 400 });
  }

  const result = await saveDiscussion(session.user.id, { title, messages });
  return NextResponse.json({ id: result.id }, { status: 201 });
}
