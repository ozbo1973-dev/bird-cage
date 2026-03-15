import { redirect } from "next/navigation";
import { getSession } from "../../lib/session";
import LoginForm from "../../components/LoginForm";
import styles from "./page.module.css";
import Link from "next/link";
import Image from "next/image";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <Image src="/logo.svg" alt="Bird Cage" width={80} height={80} className={styles.logoImg} />
        <h1 className={styles.title}>Bird Cage</h1>
        <p className={styles.subtitle}>Track your birding adventures</p>
        <LoginForm />
        <p className={styles.hint}>
          No account?{" "}
          <Link href="/signup" className={styles.link}>
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
