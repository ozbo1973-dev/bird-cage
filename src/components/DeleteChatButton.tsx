"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import styles from "./DeleteChatButton.module.css";

export async function deleteChatRequest(chatId: number): Promise<boolean> {
  const res = await fetch(`/api/birdy-chat/${chatId}`, { method: "DELETE" });
  return res.ok;
}

interface Props {
  chatId: number;
  redirectAfterDelete?: boolean;
}

export default function DeleteChatButton({ chatId, redirectAfterDelete = false }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleConfirm() {
    setConfirming(false);
    const ok = await deleteChatRequest(chatId);
    if (!ok) {
      setError("Failed to delete chat. Please try again.");
      return;
    }
    if (redirectAfterDelete) {
      router.push("/birdy-chat/saved");
    } else {
      router.refresh();
    }
  }

  return (
    <>
      {error && <span className={styles.error}>{error}</span>}
      <button
        type="button"
        className={styles.deleteBtn}
        onClick={() => setConfirming(true)}
        aria-label="Delete chat"
      >
        <Trash2 size={16} />
        Delete
      </button>
      <ConfirmDialog
        open={confirming}
        message="Are you sure you want to delete this chat? This action cannot be undone."
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
