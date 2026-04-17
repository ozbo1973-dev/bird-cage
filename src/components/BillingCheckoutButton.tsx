"use client";

import { useState } from "react";
import styles from "./BillingCheckoutButton.module.css";

interface Props {
  label?: string;
  className?: string;
}

export default function BillingCheckoutButton({
  label = "Subscribe to Birder Pro",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/billing/checkout-session", {
      method: "POST",
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
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={className ?? styles.btn}
      >
        {loading ? "Redirecting to Stripe..." : label}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
