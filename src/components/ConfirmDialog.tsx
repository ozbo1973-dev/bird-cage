"use client";

import styles from "./ConfirmDialog.module.css";

interface Props {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}

export default function ConfirmDialog({ open, message, onConfirm, onCancel, confirmLabel = "Delete" }: Props) {
  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <dialog open className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button type="button" onClick={onCancel} className={styles.cancelBtn}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={styles.confirmBtn}>
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </div>
  );
}
