import { desc, eq } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm";
import { db } from "@/db";
import { emailLogs, user as userTable } from "@/db/schema";

export type EmailLogWithNames = {
  id: number;
  senderId: string;
  recipientId: string;
  subject: string;
  message: string;
  sentAt: Date;
  senderName: string;
  recipientName: string;
};

/** Batch-insert one email log row per recipient ID. */
export async function insertEmailLogs(
  senderId: string,
  recipientIds: string[],
  subject: string,
  message: string,
): Promise<void> {
  if (recipientIds.length === 0) return;
  await db.insert(emailLogs).values(
    recipientIds.map((recipientId) => ({
      senderId,
      recipientId,
      subject,
      message,
    })),
  );
}

/** Get emails received by a user, with sender name, newest first. */
export async function getEmailsForUser(userId: string): Promise<EmailLogWithNames[]> {
  const sender = aliasedTable(userTable, "sender");
  const recipient = aliasedTable(userTable, "recipient");

  const rows = await db
    .select({
      id: emailLogs.id,
      senderId: emailLogs.senderId,
      recipientId: emailLogs.recipientId,
      subject: emailLogs.subject,
      message: emailLogs.message,
      sentAt: emailLogs.sentAt,
      senderName: sender.name,
      recipientName: recipient.name,
    })
    .from(emailLogs)
    .innerJoin(sender, eq(emailLogs.senderId, sender.id))
    .innerJoin(recipient, eq(emailLogs.recipientId, recipient.id))
    .where(eq(emailLogs.recipientId, userId))
    .orderBy(desc(emailLogs.sentAt));

  return rows.map((r) => ({ ...r, sentAt: new Date(r.sentAt as unknown as number) }));
}

/** Get all email logs for admin view; optionally filter by recipientId. */
export async function getAllEmailLogs(recipientId?: string): Promise<EmailLogWithNames[]> {
  const sender = aliasedTable(userTable, "sender");
  const recipient = aliasedTable(userTable, "recipient");

  const query = db
    .select({
      id: emailLogs.id,
      senderId: emailLogs.senderId,
      recipientId: emailLogs.recipientId,
      subject: emailLogs.subject,
      message: emailLogs.message,
      sentAt: emailLogs.sentAt,
      senderName: sender.name,
      recipientName: recipient.name,
    })
    .from(emailLogs)
    .innerJoin(sender, eq(emailLogs.senderId, sender.id))
    .innerJoin(recipient, eq(emailLogs.recipientId, recipient.id))
    .orderBy(desc(emailLogs.sentAt));

  if (recipientId) {
    const rows = await query.where(eq(emailLogs.recipientId, recipientId));
    return rows.map((r) => ({ ...r, sentAt: new Date(r.sentAt as unknown as number) }));
  }

  const rows = await query;
  return rows.map((r) => ({ ...r, sentAt: new Date(r.sentAt as unknown as number) }));
}
