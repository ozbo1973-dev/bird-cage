import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "../db";
import { user as userTable } from "../db/schema";

/** Returns the current session user, or redirects to /login. */
export async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

/**
 * Returns the current session user.
 * Redirects to /login if unauthenticated.
 * Redirects to /verify-email if email is not verified.
 */
export async function requireVerifiedAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (!session.user.emailVerified) redirect("/verify-email");
  return session;
}

/** Returns the current session user, or null. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Returns the current session user and their DB record.
 * Redirects to /login if unauthenticated.
 * Redirects to /verify-email if email is not verified.
 * Redirects to /dashboard if the user is not an admin.
 */
export async function requireAdminAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (!session.user.emailVerified) redirect("/verify-email");

  const [dbUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);

  if (!dbUser || dbUser.role !== "admin") redirect("/dashboard");

  return { session, dbUser };
}
