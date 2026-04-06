"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { sendEmailAction } from "@/app/dashboard/admin/users/actions";
import type { User } from "@/lib/dal/users";
import styles from "./AdminUsersList.module.css";

interface Props {
  users: User[];
}

export default function AdminUsersList({ users }: Props) {
  const router = useRouter();
  const [emailRecipient, setEmailRecipient] = useState<string>("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleSendEmail(e: React.SubmitEvent) {
    e.preventDefault();
    setStatus(null);
    setSending(true);

    const recipientIds =
      emailRecipient === "all" ? users.map((u) => u.id) : [emailRecipient];

    startTransition(async () => {
      const result = await sendEmailAction(recipientIds, subject, message);
      setSending(false);
      if ("error" in result) {
        setStatus({ type: "error", text: result.error });
      } else {
        setStatus({ type: "success", text: "Email sent successfully!" });
        setSubject("");
        setMessage("");
      }
    });
  }

  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Registered Users</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Email</th>
              <th className={styles.th}>Role</th>
              <th className={styles.th}>Verified</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={styles.tr}>
                <td className={styles.td}>{u.name}</td>
                <td className={styles.td}>{u.email}</td>
                <td className={styles.td}>
                  <span className={u.role === "admin" ? styles.roleAdmin : styles.roleUser}>
                    {u.role}
                  </span>
                </td>
                <td className={styles.td}>{u.emailVerified ? "✓" : "✗"}</td>
                <td className={styles.td}>
                  <button
                    className={styles.viewEmailsBtn}
                    onClick={() => router.push(`/dashboard/admin/emails?userId=${u.id}`)}
                  >
                    View Emails
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Send Email to Users</h2>
        <form onSubmit={handleSendEmail} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="recipient" className={styles.label}>
              Recipient
            </label>
            <select
              id="recipient"
              value={emailRecipient}
              onChange={(e) => setEmailRecipient(e.target.value)}
              className={styles.select}
            >
              <option value="all">All Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="subject" className={styles.label}>
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={styles.input}
              required
              placeholder="Email subject..."
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="message" className={styles.label}>
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={styles.textarea}
              required
              rows={6}
              placeholder="Your message..."
            />
          </div>

          {status && (
            <p className={status.type === "error" ? styles.error : styles.success}>
              {status.text}
            </p>
          )}

          <button type="submit" disabled={sending} className={styles.sendBtn}>
            {sending ? "Sending…" : "Send Email"}
          </button>
        </form>
      </section>
    </div>
  );
}
