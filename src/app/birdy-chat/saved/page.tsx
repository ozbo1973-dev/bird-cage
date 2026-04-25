import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { requireVerifiedAuth } from "@/lib/session";
import { listUserDiscussions } from "@/lib/dal/chatDiscussions";
import { getUserById } from "@/lib/dal/users";
import NavDropdown from "@/components/NavDropdown";
import DeleteChatButton from "@/components/DeleteChatButton";
import styles from "./page.module.css";

function formatDate(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function firstUserPreview(messages: { role: string; content: string }[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "";
  return first.content.slice(0, 100);
}

export default async function SavedChatsPage() {
  const session = await requireVerifiedAuth();
  const [discussions, dbUser] = await Promise.all([
    listUserDiscussions(session.user.id),
    getUserById(session.user.id),
  ]);

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
        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            <MessageCircle size={24} />
            Saved Chats
          </h1>
          <p className={styles.subtitle}>
            Your saved bird identification conversations
          </p>
        </div>

        {discussions.length === 0 ? (
          <div className={styles.empty}>
            <p>No saved chats yet.</p>
            <p className={styles.emptyHint}>
              Use the AI chat while identifying birds to save your conversations.
            </p>
          </div>
        ) : (
          <ul className={styles.list}>
            {discussions.map((d) => (
              <li key={d.id} className={styles.card}>
                <Link href={`/birdy-chat/saved/${d.id}`} className={styles.cardLink}>
                  <h2 className={styles.cardTitle}>{d.title}</h2>
                  <p className={styles.cardDate}>{formatDate(d.createdAt)}</p>
                  <p className={styles.cardPreview}>{firstUserPreview(d.messages)}</p>
                </Link>
                <div className={styles.cardActions}>
                  <DeleteChatButton id={d.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
