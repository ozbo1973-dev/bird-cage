"use client";

import { useState } from "react";
import styles from "./VerifyEmailClient.module.css";
import authStyles from "../login/page.module.css";

export default function VerifyEmailClient() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleResend() {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage("Verification email sent! Check your inbox.");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Failed to send verification email.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <div className={styles.wrapper}>
      {message && (
        <p className={status === "success" ? styles.success : styles.error}>{message}</p>
      )}
      <button
        onClick={handleResend}
        disabled={status === "loading" || status === "success"}
        className={authStyles.link + " " + styles.resendBtn}
      >
        {status === "loading" ? "Sending…" : "Resend verification email"}
      </button>
    </div>
  );
}
