import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "bird_session";
const DEMO_USER = { id: 1, username: "demo" };

export async function login(username: string, password: string): Promise<boolean> {
  if (username === "demo" && password === "password") {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, JSON.stringify(DEMO_USER), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    return true;
  }
  return false;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<{ id: number; username: string } | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie) return null;
  try {
    return JSON.parse(cookie.value);
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
