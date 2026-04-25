import { requireVerifiedAuth } from "@/lib/session";
import { listUserDiscussions } from "@/lib/dal/chatDiscussions";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import NavDropdown from "@/components/NavDropdown";
import DeleteChatButton from "@/components/DeleteChatButton";
import styles from "./page.module.css";

export default async function SavedChatsPage() {
  const session = await requireVerifiedAuth();
  const discussions = await listUserDiscussions(session.user.id);

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
          <h1 className={styles.title}>
            <MessageCircle size={24} />
            Saved Chats
          </h1>
          <Link href="/dashboard" className={styles.backLink}>
            ← Back to Dashboard
          </Link>
        </div>

        {discussions.length === 0 ? (
          <div className={styles.empty}>
            <MessageCircle size={48} className={styles.emptyIcon} />
            <p>No saved chats yet.</p>
            <p className={styles.emptyHint}>
              When you save a Birdy Chat conversation, it will appear here.
            </p>
          </div>
        ) : (
          <ul className={styles.list}>
            {discussions.map((d) => (
              <li key={d.id} className={styles.card}>
                <Link href={`/birdy-chat/saved/${d.id}`} className={styles.cardLink}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>{d.title}</span>
                    <span className={styles.cardDate}>
                      {d.createdAt.toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {d.preview && (
                    <p className={styles.cardPreview}>{d.preview}</p>
                  )}
                </Link>
                <div className={styles.cardActions}>
                  <DeleteChatButton discussionId={d.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
