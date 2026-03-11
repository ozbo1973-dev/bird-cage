import { redirect } from "next/navigation";
import { getSession } from "../../lib/session";
import SignupForm from "../../components/SignupForm";
import styles from "../login/page.module.css";
import Link from "next/link";

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>Bird Cage</h1>
        <p className={styles.subtitle}>Create your account</p>
        <SignupForm />
        <p className={styles.hint}>
          Already have an account?{" "}
          <Link href="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
