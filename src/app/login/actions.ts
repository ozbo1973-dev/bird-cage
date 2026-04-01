"use server";
import { auth } from "@/lib/auth";

export async function signInAction(email: string, password: string) {
  try {
    await auth.api.signInEmail({ body: { email, password } });
    return { error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid email or password";
    return { error: msg };
  }
}
