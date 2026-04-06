"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserAsAdminAction } from "@/app/dashboard/admin/users/actions";
import type { User } from "@/lib/dal/users";
import styles from "./AdminUserEditForm.module.css";

interface Props {
  targetUser: User;
  currentUserId: string;
  returnTo?: string;
}

export default function AdminUserEditForm({
  targetUser,
  currentUserId,
  returnTo = "/dashboard/admin/users",
}: Props) {
  const router = useRouter();
  const isReadOnly = targetUser.role === "admin" && targetUser.id !== currentUserId;

  const [name, setName] = useState(targetUser.name);
  const [email, setEmail] = useState(targetUser.email);
  const [role, setRole] = useState<"user" | "admin">(targetUser.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    if (isReadOnly) return;

    setError("");
    setSuccess(false);
    setSaving(true);

    startTransition(async () => {
      const result = await updateUserAsAdminAction(
        targetUser.id,
        name,
        email,
        role,
      );
      setSaving(false);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => router.push(returnTo), 800);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>User Information</h2>

        {isReadOnly && (
          <p className={styles.readOnlyNote}>
            This user is an admin. Their profile is read-only.
          </p>
        )}

        <div className={styles.field}>
          <label htmlFor="name" className={styles.label}>
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${styles.input} ${isReadOnly ? styles.inputReadOnly : ""}`}
            readOnly={isReadOnly}
            required={!isReadOnly}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${styles.input} ${isReadOnly ? styles.inputReadOnly : ""}`}
            readOnly={isReadOnly}
            required={!isReadOnly}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="role" className={styles.label}>
            Role
          </label>
          {isReadOnly ? (
            <input
              id="role"
              type="text"
              value={role}
              readOnly
              className={`${styles.input} ${styles.inputReadOnly}`}
            />
          ) : (
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "user" | "admin")}
              className={styles.select}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          )}
        </div>
      </section>

      {error && <p className={styles.error}>{error}</p>}
      {success && (
        <p className={styles.successMsg}>User updated successfully!</p>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => router.push(returnTo)}
          className={styles.cancelBtn}
        >
          Cancel
        </button>
        {!isReadOnly && (
          <button
            type="submit"
            disabled={saving}
            className={styles.saveBtn}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        )}
      </div>
    </form>
  );
}
