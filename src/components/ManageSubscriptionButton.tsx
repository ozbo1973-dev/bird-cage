"use client";

import { useState } from "react";
import styles from "./ManageSubscriptionButton.module.css";

interface Props {
  label?: string;
  className?: string;
}

export default function ManageSubscriptionButton({
  label = "Update Payment Method",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/billing/portal", {
      method: "POST",
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Failed to open billing portal");
      setLoading(false);
      return;
    }

    const data = (await res.json()) as { url?: string };
    if (data.url) {
      window.location.href = data.url;
    } else {
      setError("No portal URL returned");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={className ?? styles.btn}
      >
        {loading ? "Opening portal..." : label}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
