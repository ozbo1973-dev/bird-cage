import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "../../../../lib/auth";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session.user.emailVerified) {
    return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
  }

  try {
    await auth.api.sendVerificationEmail({
      body: { email: session.user.email, callbackURL: "/dashboard" },
      headers: await headers(),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[resend-verification] error:", err);
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
  }
}
