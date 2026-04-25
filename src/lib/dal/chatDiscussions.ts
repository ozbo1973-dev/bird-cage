import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { chatDiscussions } from "@/db/schema";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DiscussionSummary {
  id: number;
  title: string;
  createdAt: Date;
  preview: string;
}

export interface DiscussionDetail {
  id: number;
  title: string;
  createdAt: Date;
  messages: ChatMessage[];
}

export async function saveDiscussion(
  userId: string,
  data: { title: string; messages: ChatMessage[] },
): Promise<{ id: number }> {
  const [inserted] = await db
    .insert(chatDiscussions)
    .values({
      userId,
      title: data.title,
      messages: JSON.stringify(data.messages),
    })
    .returning({ id: chatDiscussions.id });

  return { id: inserted.id };
}

export async function listUserDiscussions(
  userId: string,
): Promise<DiscussionSummary[]> {
  const rows = await db
    .select({
      id: chatDiscussions.id,
      title: chatDiscussions.title,
      createdAt: chatDiscussions.createdAt,
      messages: chatDiscussions.messages,
    })
    .from(chatDiscussions)
    .where(eq(chatDiscussions.userId, userId))
    .orderBy(desc(chatDiscussions.createdAt), desc(chatDiscussions.id));

  return rows.map((row) => {
    const messages: ChatMessage[] = JSON.parse(row.messages);
    const firstUser = messages.find((m) => m.role === "user");
    const preview = firstUser ? firstUser.content.slice(0, 100) : "";
    return {
      id: row.id,
      title: row.title,
      createdAt: row.createdAt,
      preview,
    };
  });
}

export async function getDiscussion(
  id: number,
  userId: string,
): Promise<DiscussionDetail | null> {
  const [row] = await db
    .select()
    .from(chatDiscussions)
    .where(and(eq(chatDiscussions.id, id), eq(chatDiscussions.userId, userId)));

  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt,
    messages: JSON.parse(row.messages),
  };
}

export async function deleteDiscussion(
  id: number,
  userId: string,
): Promise<{ ok: true } | null> {
  const [row] = await db
    .select({ id: chatDiscussions.id })
    .from(chatDiscussions)
    .where(and(eq(chatDiscussions.id, id), eq(chatDiscussions.userId, userId)));

  if (!row) return null;

  await db
    .delete(chatDiscussions)
    .where(eq(chatDiscussions.id, id));

  return { ok: true };
}
