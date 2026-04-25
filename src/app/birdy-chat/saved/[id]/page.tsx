import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { requireVerifiedAuth } from "@/lib/session";
import { getDiscussion } from "@/lib/dal/chatDiscussions";
import { getUserById } from "@/lib/dal/users";
import NavDropdown from "@/components/NavDropdown";
import DeleteChatButton from "@/components/DeleteChatButton";
import styles from "./page.module.css";

function formatDate(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TranscriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireVerifiedAuth();
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) redirect("/birdy-chat/saved");

  const [discussion, dbUser] = await Promise.all([
    getDiscussion(numId, session.user.id),
    getUserById(session.user.id),
  ]);

  if (!discussion) redirect("/birdy-chat/saved");

  const isAdmin = dbUser?.role === "admin";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Image
            src="/logo-text.svg"
            alt="Bird Cage"
            width={120}
            height={50}
            className={styles.logo}
          />
        <div className={styles.headerActions}>
          <NavDropdown isAdmin={isAdmin} returnPath="/birdy-chat/saved" />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <Link href="/birdy-chat/saved" className={styles.backLink}>
            <ArrowLeft size={16} />
            Saved Chats
          </Link>
          <DeleteChatButton id={discussion.id} redirectTo="/birdy-chat/saved" />
        </div>

        <div className={styles.meta}>
          <h1 className={styles.title}>{discussion.title}</h1>
          <p className={styles.date}>{formatDate(discussion.createdAt)}</p>
        </div>

        <div className={styles.transcript}>
          {discussion.messages.map((msg, i) => (
            <div
              key={i}
              className={
                msg.role === "user" ? styles.userBubble : styles.assistantBubble
              }
            >
              <span className={styles.roleLabel}>
                {msg.role === "user" ? "You" : "Birdy"}
              </span>
              <p className={styles.content}>{msg.content}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
