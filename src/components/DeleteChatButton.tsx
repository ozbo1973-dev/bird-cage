"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import styles from "./DeleteChatButton.module.css";

interface Props {
  id: number;
  redirectTo?: string;
}

export default function DeleteChatButton({ id, redirectTo }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/birdy-chat/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      }
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.deleteBtn}
        onClick={() => setConfirming(true)}
        disabled={deleting}
        aria-label="Delete chat"
      >
        <Trash2 size={14} />
        {deleting ? "Deleting…" : "Delete"}
      </button>
      <ConfirmDialog
        open={confirming}
        message="Delete this chat discussion? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
        confirmLabel="Delete"
      />
    </>
  );
}
