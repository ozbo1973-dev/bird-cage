import { getSession } from "../../lib/session";
import { redirect } from "next/navigation";
import VerifyEmailClient from "./VerifyEmailClient";
import styles from "../login/page.module.css";
import Image from "next/image";

export default async function VerifyEmailPage() {
  const session = await getSession();

  // Already verified — send to dashboard
  if (session?.user.emailVerified) redirect("/dashboard");

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <Image src="/logo.svg" alt="Bird Cage" width={220} height={147} className={styles.logoImg} />
        <h1 className={styles.title}>Check your email</h1>
        <p className={styles.subtitle}>
          {session?.user.email
            ? <>We sent a verification link to <strong>{session.user.email}</strong>. Click the link in the email to activate your account.</>
            : "We sent a verification link to your email. Click the link to activate your account."
          }
        </p>
        <VerifyEmailClient />
      </div>
    </main>
  );
}
