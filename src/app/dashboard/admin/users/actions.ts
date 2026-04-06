"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { insertEmailLogs } from "@/lib/dal/emailLogs";

export type SendEmailResult = { success: true } | { error: string };

export async function sendEmailAction(
  recipientIds: string[],
  subject: string,
  message: string,
): Promise<SendEmailResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Not authenticated." };

  const dbUser = await db
    .select()
    .from(userTable)
    .where(inArray(userTable.id, [session.user.id]))
    .limit(1);
  if (!dbUser[0] || dbUser[0].role !== "admin") {
    return { error: "Unauthorized." };
  }

  if (!recipientIds.length) return { error: "No recipients selected." };
  if (!subject.trim()) return { error: "Subject is required." };
  if (!message.trim()) return { error: "Message is required." };

  // Resolve recipient emails from IDs
  const recipients = await db
    .select({ id: userTable.id, email: userTable.email, name: userTable.name })
    .from(userTable)
    .where(inArray(userTable.id, recipientIds));

  if (!recipients.length) return { error: "No valid recipients found." };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  try {
    await Promise.all(
      recipients.map((r) =>
        resend.emails.send({
          from: fromEmail,
          to: r.email,
          subject,
          html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #032147;">Message from Bird Cage Admin</h2>
            <p>Hi ${r.name},</p>
            <div style="background: #f5f5f0; padding: 1rem; border-radius: 6px; margin: 1rem 0;">
              ${message.replace(/\n/g, "<br/>")}
            </div>
            <p style="color: #888888; font-size: 0.85rem;">This message was sent by an administrator of Bird Cage.</p>
          </div>`,
        }),
      ),
    );
  } catch (err) {
    console.error("[sendEmailAction] failed to send emails:", err);
    return { error: "Failed to send emails." };
  }

  // Log emails to DB
  await insertEmailLogs(session.user.id, recipientIds, subject, message);

  return { success: true };
}
