"use client";

import { useState } from "react";
import styles from "./ExtraUsageButton.module.css";

interface Props {
  amountCents: 200 | 500;
  label: string;
}

export default function ExtraUsageButton({ amountCents, label }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/billing/extra-usage-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Failed to start checkout");
      setLoading(false);
      return;
    }

    const data = (await res.json()) as { url?: string };
    if (data.url) {
      window.location.href = data.url;
    } else {
      setError("No checkout URL returned");
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <button
        onClick={handleClick}
        disabled={loading}
        className={styles.btn}
      >
        {loading ? "Redirecting to Stripe..." : label}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
