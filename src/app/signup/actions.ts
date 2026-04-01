"use server";
import { auth } from "@/lib/auth";

export async function signUpAction(name: string, email: string, password: string) {
  try {
    await auth.api.signUpEmail({ body: { name, email, password } });
    return { error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create account";
    return { error: msg };
  }
}
