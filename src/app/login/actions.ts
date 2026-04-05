"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function signInAction(email: string, password: string) {
  try {
    await auth.api.signInEmail({ body: { email, password } });
    // Check email verification status after successful sign-in
    const session = await auth.api.getSession({ headers: await headers() });
    if (session && !session.user.emailVerified) {
      return { error: null, redirectTo: "/verify-email" };
    }
    return { error: null, redirectTo: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid email or password";
    return { error: msg, redirectTo: null };
  }
}
