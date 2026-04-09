import { eq, desc } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm";
import { db } from "@/db";
import { emailLogs, user as userTable } from "@/db/schema";
import type { EmailLog } from "@/db/schema";

export type EmailLogWithSender = EmailLog & { senderName: string };
export type EmailLogWithRecipient = EmailLog & {
  senderName: string;
  recipientName: string;
  recipientEmail: string;
};

/** Batch-insert one log row per recipient ID. */
export async function insertEmailLogs(
  senderId: string,
  recipientIds: string[],
  subject: string,
  message: string,
): Promise<void> {
  if (!recipientIds.length) return;
  await db.insert(emailLogs).values(
    recipientIds.map((recipientId) => ({
      senderId,
      recipientId,
      subject,
      message,
    })),
  );
}

/** Emails received by a user, with sender name, newest first. */
export async function getEmailsForUser(userId: string): Promise<EmailLogWithSender[]> {
  const senderUser = aliasedTable(userTable, "sender_user");

  const rows = await db
    .select({
      id: emailLogs.id,
      senderId: emailLogs.senderId,
      recipientId: emailLogs.recipientId,
      subject: emailLogs.subject,
      message: emailLogs.message,
      sentAt: emailLogs.sentAt,
      senderName: senderUser.name,
    })
    .from(emailLogs)
    .innerJoin(senderUser, eq(emailLogs.senderId, senderUser.id))
    .where(eq(emailLogs.recipientId, userId))
    .orderBy(desc(emailLogs.sentAt));

  return rows;
}

/** All email logs (admin view), optionally filtered by recipientId. */
export async function getAllEmailLogs(
  recipientId?: string,
): Promise<EmailLogWithRecipient[]> {
  const senderUser = aliasedTable(userTable, "sender_user");
  const recipientUser = aliasedTable(userTable, "recipient_user");

  const query = db
    .select({
      id: emailLogs.id,
      senderId: emailLogs.senderId,
      recipientId: emailLogs.recipientId,
      subject: emailLogs.subject,
      message: emailLogs.message,
      sentAt: emailLogs.sentAt,
      senderName: senderUser.name,
      recipientName: recipientUser.name,
      recipientEmail: recipientUser.email,
    })
    .from(emailLogs)
    .innerJoin(senderUser, eq(emailLogs.senderId, senderUser.id))
    .innerJoin(recipientUser, eq(emailLogs.recipientId, recipientUser.id))
    .orderBy(desc(emailLogs.sentAt));

  if (recipientId) {
    return query.where(eq(emailLogs.recipientId, recipientId));
  }

  return query;
}
