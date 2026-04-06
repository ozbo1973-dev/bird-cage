import type { EmailLogWithNames } from "@/lib/dal/emailLogs";
import styles from "./AdminEmailLog.module.css";

interface Props {
  logs: EmailLogWithNames[];
}

export default function AdminEmailLog({ logs }: Props) {
  if (logs.length === 0) {
    return <p className={styles.empty}>No emails sent yet.</p>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Date</th>
            <th className={styles.th}>Sender</th>
            <th className={styles.th}>Recipient</th>
            <th className={styles.th}>Subject</th>
            <th className={styles.th}>Message</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className={styles.tr}>
              <td className={styles.td}>
                {log.sentAt.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td className={styles.td}>{log.senderName}</td>
              <td className={styles.td}>{log.recipientName}</td>
              <td className={styles.td}>{log.subject}</td>
              <td className={`${styles.td} ${styles.messageCell}`}>{log.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
