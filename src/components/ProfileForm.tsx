"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/app/dashboard/profile/actions";
import styles from "./ProfileForm.module.css";

interface Props {
  name: string;
  email: string;
  role: string;
  returnTo?: string;
}

export default function ProfileForm({
  name: initialName,
  email,
  role,
  returnTo = "/dashboard",
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    startTransition(async () => {
      const result = await updateProfileAction(
        name,
        currentPassword,
        newPassword,
        confirmPassword,
      );
      setSaving(false);

      if ("error" in result) {
        setError(result.error);
      } else {
        router.push(returnTo);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Account Information</h2>

        <div className={styles.field}>
          <label htmlFor="name" className={styles.label}>
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
            required
            autoComplete="name"
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
            readOnly
            className={`${styles.input} ${styles.inputReadOnly}`}
            autoComplete="email"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Role</label>
          <div className={styles.roleDisplay}>{role}</div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Change Password</h2>
        <p className={styles.sectionHint}>
          Leave these fields blank to keep your current password.
        </p>

        <div className={styles.field}>
          <label htmlFor="currentPassword" className={styles.label}>
            Current Password
          </label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={styles.input}
            autoComplete="current-password"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="newPassword" className={styles.label}>
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={styles.input}
            autoComplete="new-password"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="confirmPassword" className={styles.label}>
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={styles.input}
            autoComplete="new-password"
          />
        </div>
      </section>

      {error && <p className={styles.error}>{error}</p>}


      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => router.push(returnTo)}
          className={styles.cancelBtn}
        >
          Cancel
        </button>
        <button type="submit" disabled={saving} className={styles.saveBtn}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
