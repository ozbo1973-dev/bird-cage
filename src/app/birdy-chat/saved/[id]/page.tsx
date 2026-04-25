import { redirect } from "next/navigation";
import { requireVerifiedAuth } from "@/lib/session";
import { getDiscussion } from "@/lib/dal/chatDiscussions";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import NavDropdown from "@/components/NavDropdown";
import DeleteChatButton from "@/components/DeleteChatButton";
import styles from "./page.module.css";

export default async function SavedChatTranscriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireVerifiedAuth();
  const { id } = await params;
  const discussionId = parseInt(id, 10);

  if (isNaN(discussionId)) redirect("/birdy-chat/saved");

  const discussion = await getDiscussion(discussionId, session.user.id);
  if (!discussion) redirect("/birdy-chat/saved");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Image
          src="/logo-text.svg"
          alt="Bird Cage"
          width={120}
          height={50}
          className={styles.logo}
          priority
        />
        <div className={styles.headerActions}>
          <span className={styles.username}>Welcome, {session.user.name}</span>
          <NavDropdown returnPath="/birdy-chat/saved" />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <Link href="/birdy-chat/saved" className={styles.backLink}>
              ← Saved Chats
            </Link>
            <h1 className={styles.title}>
              <MessageCircle size={22} />
              {discussion.title}
            </h1>
            <span className={styles.date}>
              {discussion.createdAt.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <DeleteChatButton
            discussionId={discussion.id}
            redirectTo="/birdy-chat/saved"
          />
        </div>

        <div className={styles.transcript}>
          {discussion.messages.map((msg, i) => (
            <div
              key={i}
              className={
                msg.role === "user"
                  ? styles.bubbleUser
                  : styles.bubbleAssistant
              }
            >
              <span className={styles.bubbleRole}>
                {msg.role === "user" ? "You" : "Birdy"}
              </span>
              <p className={styles.bubbleContent}>{msg.content}</p>
            </div>
          ))}
          {discussion.messages.length === 0 && (
            <p className={styles.empty}>No messages in this chat.</p>
          )}
        </div>
      </main>
    </div>
  );
}
