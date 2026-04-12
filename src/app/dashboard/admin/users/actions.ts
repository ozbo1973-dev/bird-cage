"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { updateUserAdmin, deleteUserAndData } from "@/lib/dal/users";
import { insertEmailLogs } from "@/lib/dal/emailLogs";

export type AdminResult = { success: true } | { error: string };

async function requireAdmin(): Promise<{ id: string } | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  if (!session.user.emailVerified) return null;

  const [dbUser] = await db
    .select({ role: userTable.role, id: userTable.id })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);

  if (!dbUser || dbUser.role !== "admin") return null;
  return { id: session.user.id };
}

export async function updateUserAsAdminAction(
  targetUserId: string,
  name: string,
  email: string,
  role: "user" | "admin",
): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized." };

  if (!name.trim()) return { error: "Name is required." };
  if (!email.trim()) return { error: "Email is required." };
  if (role !== "user" && role !== "admin") return { error: "Invalid role." };

  // Cannot edit another admin's data
  const [target] = await db
    .select({ role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, targetUserId))
    .limit(1);

  if (!target) return { error: "User not found." };
  if (target.role === "admin" && targetUserId !== admin.id) {
    return { error: "Cannot edit another admin user." };
  }

  try {
    await updateUserAdmin(targetUserId, { name, email, role }, "admin");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update user.";
    return { error: msg };
  }
}

export async function deleteUserAsAdminAction(
  targetUserId: string,
): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized." };

  if (targetUserId === admin.id) {
    return { error: "You cannot delete your own account." };
  }

  const [target] = await db
    .select({ role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, targetUserId))
    .limit(1);

  if (!target) return { error: "User not found." };
  if (target.role === "admin") {
    return { error: "Cannot delete another admin user." };
  }

  try {
    await deleteUserAndData(targetUserId, "admin");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete user.";
    return { error: msg };
  }
}

export async function sendEmailAction(
  recipientIds: string[],
  subject: string,
  message: string,
): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized." };

  if (!recipientIds.length) return { error: "At least one recipient is required." };
  if (!subject.trim()) return { error: "Subject is required." };
  if (!message.trim()) return { error: "Message is required." };

  try {
    // Resolve emails from IDs
    const userRows = await db
      .select({ id: userTable.id, email: userTable.email })
      .from(userTable)
      .where(inArray(userTable.id, recipientIds));

    const emails = userRows.map((u) => u.email);
    if (!emails.length) return { error: "No valid recipients found." };

    const safeMessage = message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
      to: emails,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #032147;">Message from Bird Cage Admin</h2>
          <div style="white-space: pre-wrap; font-size: 0.95rem; color: #333; line-height: 1.6;">${safeMessage}</div>
          <p style="color: #888888; font-size: 0.8rem; margin-top: 2rem;">This message was sent by an administrator of Bird Cage.</p>
        </div>
      `,
    });

    await insertEmailLogs(admin.id, recipientIds, subject, message, "admin");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to send email.";
    return { error: msg };
  }
}
