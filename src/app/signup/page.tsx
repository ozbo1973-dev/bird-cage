import { redirect } from "next/navigation";
import { getSession } from "../../lib/session";
import SignupForm from "../../components/SignupForm";
import styles from "../login/page.module.css";
import Link from "next/link";
import LogoImage from "@/components/LogoImage";

export default async function SignupPage() {
  const session = await getSession();
  if (session) {
    if (session.user.emailVerified) redirect("/dashboard");
    else redirect("/verify-email");
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <LogoImage width={220} height={147} priority />
        <h1 className={styles.title}>Bird Cage</h1>
        <p className={styles.subtitle}>Create your account</p>
        <SignupForm />
        <p className={styles.hint}>
          Already have an account?{" "}
          <Link href="/login" className={styles.link}>
            Sign in
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
