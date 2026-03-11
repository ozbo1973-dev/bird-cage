import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

/** Returns the current session user, or redirects to /login. */
export async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

/** Returns the current session user, or null. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
