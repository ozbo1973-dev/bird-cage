import type { EmailLogWithNames } from "@/lib/dal/emailLogs";
import styles from "./EmailsReceived.module.css";

interface Props {
  logs: EmailLogWithNames[];
}

export default function EmailsReceived({ logs }: Props) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Emails Received</h2>
      {logs.length === 0 ? (
        <p className={styles.empty}>No emails received yet.</p>
      ) : (
        <ul className={styles.list}>
          {logs.map((log) => (
            <li key={log.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.subject}>{log.subject}</span>
                <span className={styles.date}>
                  {log.sentAt.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <p className={styles.from}>From: {log.senderName}</p>
              <p className={styles.message}>{log.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
