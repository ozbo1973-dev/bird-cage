import Link from "next/link";
import { requireVerifiedAuth } from "@/lib/session";
import { listBirdyChats } from "@/lib/dal/birdyChats";
import { formatChatDate } from "@/lib/savedChatsUtils";
import NavDropdown from "@/components/NavDropdown";
import DeleteChatButton from "@/components/DeleteChatButton";
import styles from "./SavedChatsPage.module.css";

export default async function SavedChatsPage() {
  const session = await requireVerifiedAuth();
  const chats = await listBirdyChats(session.user.id);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/birdy-chat" className={styles.backLink}>
            ← Birdy Chat
          </Link>
          <h1 className={styles.title}>Saved Chats</h1>
        </div>
        <NavDropdown returnPath="/birdy-chat/saved" />
      </header>

      <main className={styles.main}>
        {chats.length === 0 ? (
          <div className={styles.empty}>
            <p>You have no saved chats yet.</p>
            <Link href="/birdy-chat" className={styles.startChatLink}>
              Start a chat
            </Link>
          </div>
        ) : (
          <ul className={styles.list}>
            {chats.map((chat) => (
              <li key={chat.id} className={styles.card}>
                <Link href={`/birdy-chat/saved/${chat.id}`} className={styles.cardBody}>
                  <h2 className={styles.cardTitle}>{chat.title}</h2>
                  <time className={styles.cardDate} dateTime={new Date(chat.createdAt).toISOString()}>
                    {formatChatDate(chat.createdAt)}
                  </time>
                  {chat.preview && (
                    <p className={styles.cardPreview}>{chat.preview}</p>
                  )}
                </Link>
                <div className={styles.cardActions}>
                  <DeleteChatButton chatId={chat.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
