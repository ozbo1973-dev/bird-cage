"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";
import { getCancelDialogMessage } from "@/lib/billing-ui";
import styles from "./ManageSubscriptionButton.module.css";

interface Props {
  action: "cancel" | "reactivate";
  label: string;
  periodEndDate?: string;
  extraUsageDollars?: number;
}

export default function CancelSubscriptionButton({
  action,
  label,
  periodEndDate,
  extraUsageDollars = 0,
}: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogMessage =
    action === "cancel"
      ? getCancelDialogMessage(periodEndDate, extraUsageDollars)
      : "Are you sure you want to resubscribe? Your subscription will resume.";

  async function handleConfirm() {
    setShowConfirm(false);
    setLoading(true);
    setError(null);

    const res = await fetch("/api/billing/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className={styles.btn}
      >
        {loading ? "Processing..." : label}
      </button>
      {error && <p className={styles.error}>{error}</p>}
      <ConfirmDialog
        open={showConfirm}
        message={dialogMessage}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
