"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  deleteUserAsAdminAction,
  sendEmailAction,
} from "@/app/dashboard/admin/users/actions";
import type { User } from "@/lib/dal/users";
import styles from "./AdminUsersList.module.css";

interface Props {
  users: User[];
  currentUserId: string;
}

export default function AdminUsersList({ users, currentUserId }: Props) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Email compose state
  const [emailRecipient, setEmailRecipient] = useState("all");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [emailResult, setEmailResult] = useState<
    { success: true } | { error: string } | null
  >(null);

  function handleDelete(userId: string) {
    setDeleteTarget(userId);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    startTransition(async () => {
      const result = await deleteUserAsAdminAction(deleteTarget);
      setDeleting(false);
      setDeleteTarget(null);
      if ("success" in result) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  }

  function handleEmailUser(email: string) {
    setEmailRecipient(email);
    setEmailResult(null);
    document.getElementById("email-section")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleSendEmail(e: React.SubmitEvent) {
    e.preventDefault();
    setEmailResult(null);
    setSending(true);

    const recipients =
      emailRecipient === "all"
        ? users.map((u) => u.email)
        : [emailRecipient];

    startTransition(async () => {
      const result = await sendEmailAction(recipients, emailSubject, emailMessage);
      setSending(false);
      setEmailResult(result);
      if ("success" in result) {
        setEmailSubject("");
        setEmailMessage("");
      }
    });
  }

  return (
    <div className={styles.container}>
      {/* Users Table */}
      <div className={styles.tableWrapper}>
        {users.length === 0 ? (
          <p className={styles.emptyState}>No users found.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isCurrentUser = u.id === currentUserId;
                const isAdmin = u.role === "admin";
                const canDelete = !isCurrentUser && !isAdmin;
                const canEdit = !isAdmin || isCurrentUser;

                return (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span
                        className={`${styles.roleBadge} ${u.role === "user" ? styles.user : ""}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/admin/users/${u.id}/edit`,
                              )
                            }
                            className={styles.editBtn}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEmailUser(u.email)}
                          className={styles.emailBtn}
                        >
                          Email
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(u.id)}
                            disabled={deleting}
                            className={styles.deleteBtn}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Email Compose Section */}
      <section className={styles.emailSection} id="email-section">
        <div className={styles.emailHeader}>
          <h2 className={styles.emailTitle}>Send Email</h2>
        </div>
        <form onSubmit={handleSendEmail} className={styles.emailBody}>
          <div className={styles.field}>
            <label htmlFor="email-recipient" className={styles.label}>
              Recipient
            </label>
            <select
              id="email-recipient"
              value={emailRecipient}
              onChange={(e) => {
                setEmailRecipient(e.target.value);
                setEmailResult(null);
              }}
              className={styles.select}
            >
              <option value="all">All Users ({users.length})</option>
              {users.map((u) => (
                <option key={u.id} value={u.email}>
                  {u.name} &lt;{u.email}&gt;
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="email-subject" className={styles.label}>
              Subject
            </label>
            <input
              id="email-subject"
              type="text"
              value={emailSubject}
              onChange={(e) => {
                setEmailSubject(e.target.value);
                setEmailResult(null);
              }}
              className={styles.input}
              required
              placeholder="Email subject"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email-message" className={styles.label}>
              Message
            </label>
            <textarea
              id="email-message"
              value={emailMessage}
              onChange={(e) => {
                setEmailMessage(e.target.value);
                setEmailResult(null);
              }}
              className={styles.textarea}
              required
              placeholder="Write your message here…"
            />
          </div>

          <div className={styles.emailActions}>
            <button
              type="submit"
              disabled={sending}
              className={styles.sendBtn}
            >
              {sending ? "Sending…" : "Send Email"}
            </button>
            {emailResult &&
              ("success" in emailResult ? (
                <span className={styles.successMsg}>Email sent successfully!</span>
              ) : (
                <span className={styles.errorMsg}>{emailResult.error}</span>
              ))}
          </div>
        </form>
      </section>

      <ConfirmDialog
        open={deleteTarget !== null}
        message="Delete this user and all their data? This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
