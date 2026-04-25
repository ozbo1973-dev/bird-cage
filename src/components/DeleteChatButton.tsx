"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import styles from "./DeleteChatButton.module.css";

interface Props {
  discussionId: number;
  redirectTo?: string;
  onDeleted?: () => void;
  className?: string;
}

export default function DeleteChatButton({
  discussionId,
  redirectTo,
  onDeleted,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleConfirm() {
    setOpen(false);
    startTransition(async () => {
      await fetch(`/api/birdy-chat/${discussionId}`, { method: "DELETE" });
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
        onDeleted?.();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className={`${styles.deleteBtn}${className ? ` ${className}` : ""}`}
        onClick={() => setOpen(true)}
        disabled={isPending}
        aria-label="Delete chat"
      >
        <Trash2 size={15} />
        Delete
      </button>
      <ConfirmDialog
        open={open}
        message="Delete this saved chat? This cannot be undone."
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
        confirmLabel="Delete"
      />
    </>
  );
}
