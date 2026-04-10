import type { EmailLogWithRecipient } from "@/lib/dal/emailLogs";
import styles from "./AdminEmailLog.module.css";

interface Props {
  logs: EmailLogWithRecipient[];
}

export default function AdminEmailLog({ logs }: Props) {
  if (logs.length === 0) {
    return <p className={styles.empty}>No emails have been sent yet.</p>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Sender</th>
            <th>Recipient</th>
            <th>Subject</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className={styles.dateCell}>
                {new Date(log.sentAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td>{log.senderName}</td>
              <td>
                <span className={styles.recipientName}>{log.recipientName}</span>
                <span className={styles.recipientEmail}>{log.recipientEmail}</span>
              </td>
              <td>{log.subject}</td>
              <td className={styles.messageCell}>{log.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
