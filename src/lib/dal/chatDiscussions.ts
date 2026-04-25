import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { chatDiscussions } from "@/db/schema";
import type { ChatDiscussion } from "@/db/schema";

export type Message = { role: "user" | "assistant"; content: string };

export type ChatDiscussionWithMessages = Omit<ChatDiscussion, "messages"> & {
  messages: Message[];
};

function parseMessages(raw: string): Message[] {
  try {
    return JSON.parse(raw) as Message[];
  } catch {
    return [];
  }
}

export async function saveDiscussion(
  userId: string,
  title: string,
  messages: Message[],
): Promise<ChatDiscussion> {
  const [row] = await db
    .insert(chatDiscussions)
    .values({ userId, title, messages: JSON.stringify(messages) })
    .returning();
  return row;
}

export async function listUserDiscussions(
  userId: string,
): Promise<ChatDiscussionWithMessages[]> {
  const rows = await db
    .select()
    .from(chatDiscussions)
    .where(eq(chatDiscussions.userId, userId))
    .orderBy(desc(chatDiscussions.createdAt));

  return rows.map((row) => ({ ...row, messages: parseMessages(row.messages) }));
}

export async function getDiscussion(
  id: number,
  userId: string,
): Promise<ChatDiscussionWithMessages | null> {
  const [row] = await db
    .select()
    .from(chatDiscussions)
    .where(and(eq(chatDiscussions.id, id), eq(chatDiscussions.userId, userId)))
    .limit(1);

  if (!row) return null;
  return { ...row, messages: parseMessages(row.messages) };
}

export async function deleteDiscussion(
  id: number,
  userId: string,
): Promise<boolean> {
  const result = await db
    .delete(chatDiscussions)
    .where(and(eq(chatDiscussions.id, id), eq(chatDiscussions.userId, userId)))
    .returning({ id: chatDiscussions.id });

  return result.length > 0;
}
