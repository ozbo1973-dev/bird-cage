import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";
import styles from "./page.module.css";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>🐦 Bird Cage</h1>
        <p className={styles.subtitle}>Track your birding adventures</p>
        <LoginForm />
        <p className={styles.hint}>Demo credentials: demo / password</p>
      </div>
    </main>
  );
}
