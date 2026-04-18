import { redirect } from "next/navigation";
import { getSession } from "../../lib/session";
import LoginForm from "../../components/LoginForm";
import styles from "./page.module.css";
import Link from "next/link";
import LogoImage from "@/components/LogoImage";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <LogoImage width={220} height={147} priority />
        <h1 className={styles.title}>Bird Cage</h1>
        <p className={styles.subtitle}>Track your birding adventures</p>
        <LoginForm />
        <p className={styles.hint}>
          No account?{" "}
          <Link href="/signup" className={styles.link}>
            Sign up
          </Link>
        </p>
        <p className={styles.backLink}>
          <Link href="/" className={styles.link}>
            ← Back to Home
          </Link>
        </p>
      </div>
    </main>
  );
}
