import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const ok = await login(username, password);
  if (ok) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
}
