"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";
import { signInAction } from "@/app/login/actions";
import styles from "./AuthForm.module.css";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    startTransition(async () => {
      try {
        const { error } = await signInAction(email, password);
        if (error) {
          if (error.includes("EMAIL_NOT_VERIFIED") || error.includes("email not verified")) {
            router.push("/verify-email");
          } else {
            setError(error);
          }
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Sign in error:", err);
        setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    });
  }

  async function handleGoogle() {
    const { error: authError } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
    if (authError) setError(authError.message ?? "Google sign-in failed");
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="email" className={styles.label}>
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
          required
          autoComplete="email"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="password" className={styles.label}>
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          required
          autoComplete="current-password"
        />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" disabled={loading} className={styles.btn}>
        {loading ? "Signing in..." : "Sign In"}
      </button>
      <div className={styles.divider}>or</div>
      <button type="button" onClick={handleGoogle} className={styles.googleBtn}>
        Continue with Google
      </button>
    </form>
  );
}
