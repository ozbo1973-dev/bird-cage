"use client";

import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";
import styles from "./LogoutButton.module.css";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/login") },
    });
  }

  return (
    <button onClick={handleLogout} className={styles.btn}>
      Sign Out
    </button>
  );
}
