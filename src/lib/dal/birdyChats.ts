import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { birdyChats, birdyChatMessages } from "@/db/schema";
import type { BirdyChat, BirdyChatMessage } from "@/db/schema";

export type ChatMessage = Pick<BirdyChatMessage, "id" | "role" | "content" | "createdAt">;

export type ChatWithMessages = BirdyChat & { messages: ChatMessage[] };

export type ChatPreview = Pick<BirdyChat, "id" | "title" | "createdAt"> & {
  preview: string | null;
};

/**
 * Saves a new chat with all its messages atomically.
 * Returns the created chat id.
 */
export async function saveBirdyChat(
  userId: string,
  title: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<{ chatId: number }> {
  const [chat] = await db
    .insert(birdyChats)
    .values({ userId, title })
    .returning({ chatId: birdyChats.id });

  if (messages.length > 0) {
    await db.insert(birdyChatMessages).values(
      messages.map((m) => ({
        chatId: chat.chatId,
        role: m.role,
        content: m.content,
      })),
    );
  }

  return { chatId: chat.chatId };
}

/**
 * Lists a user's chats ordered by most recent first.
 * Each result includes a preview of the first user message (up to 100 chars).
 */
export async function listBirdyChats(userId: string): Promise<ChatPreview[]> {
  const chats = await db
    .select()
    .from(birdyChats)
    .where(eq(birdyChats.userId, userId))
    .orderBy(desc(birdyChats.createdAt));

  if (chats.length === 0) return [];

  const chatIds = chats.map((c) => c.id);

  const userMessages = await db
    .select({ chatId: birdyChatMessages.chatId, content: birdyChatMessages.content })
    .from(birdyChatMessages)
    .where(
      and(
        inArray(birdyChatMessages.chatId, chatIds),
        eq(birdyChatMessages.role, "user"),
      ),
    )
    .orderBy(asc(birdyChatMessages.id));

  const previewMap = new Map<number, string>();
  for (const msg of userMessages) {
    if (!previewMap.has(msg.chatId)) {
      previewMap.set(msg.chatId, msg.content.slice(0, 100));
    }
  }

  return chats.map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: c.createdAt,
    preview: previewMap.get(c.id) ?? null,
  }));
}

/**
 * Fetches a single chat with all its messages, enforcing user ownership.
 * Returns null if the chat does not exist or belongs to a different user.
 */
export async function getBirdyChat(
  chatId: number,
  userId: string,
): Promise<ChatWithMessages | null> {
  const [chat] = await db
    .select()
    .from(birdyChats)
    .where(and(eq(birdyChats.id, chatId), eq(birdyChats.userId, userId)));

  if (!chat) return null;

  const messages = await db
    .select()
    .from(birdyChatMessages)
    .where(eq(birdyChatMessages.chatId, chatId))
    .orderBy(asc(birdyChatMessages.id));

  return { ...chat, messages };
}

/**
 * Deletes a chat by ID, enforcing user ownership.
 * Messages are cascade-deleted by the database.
 * Returns { ok: true } on success, null if not found or not owned.
 */
export async function deleteBirdyChat(
  chatId: number,
  userId: string,
): Promise<{ ok: true } | null> {
  const [chat] = await db
    .select({ id: birdyChats.id })
    .from(birdyChats)
    .where(and(eq(birdyChats.id, chatId), eq(birdyChats.userId, userId)));

  if (!chat) return null;

  await db.delete(birdyChats).where(eq(birdyChats.id, chatId));

  return { ok: true };
}
