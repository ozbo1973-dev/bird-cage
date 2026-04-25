import { redirect } from "next/navigation";
import Link from "next/link";
import { requireVerifiedAuth } from "@/lib/session";
import { getBirdyChat } from "@/lib/dal/birdyChats";
import { formatChatDate } from "@/lib/savedChatsUtils";
import NavDropdown from "@/components/NavDropdown";
import DeleteChatButton from "@/components/DeleteChatButton";
import DownloadChatButton from "@/components/DownloadChatButton";
import styles from "./SavedChatViewPage.module.css";

export default async function SavedChatViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireVerifiedAuth();
  const { id } = await params;
  const chatId = parseInt(id, 10);

  if (isNaN(chatId)) redirect("/birdy-chat/saved");

  const chat = await getBirdyChat(chatId, session.user.id);
  if (!chat) redirect("/birdy-chat/saved");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/birdy-chat/saved" className={styles.backLink}>
            ← Saved Chats
          </Link>
          <div>
            <h1 className={styles.title}>{chat.title}</h1>
            <time className={styles.date} dateTime={new Date(chat.createdAt).toISOString()}>
              {formatChatDate(chat.createdAt)}
            </time>
          </div>
        </div>
        <NavDropdown returnPath={`/birdy-chat/saved/${chat.id}`} />
      </header>

      <main className={styles.main}>
        <div className={styles.transcript}>
          {chat.messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.bubble} ${message.role === "user" ? styles.userBubble : styles.assistantBubble}`}
            >
              <span className={styles.bubbleRole}>
                {message.role === "user" ? "You" : "Birdy"}
              </span>
              <p className={styles.bubbleContent}>{message.content}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className={styles.footer}>
        <DownloadChatButton
          title={chat.title}
          date={chat.createdAt}
          messages={chat.messages}
        />
        <DeleteChatButton chatId={chat.id} redirectAfterDelete />
      </footer>
    </div>
  );
}
