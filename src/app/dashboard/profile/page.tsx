import { requireVerifiedAuth } from "@/lib/session";
import { getUserById } from "@/lib/dal/users";
import { getEmailsForUser } from "@/lib/dal/emailLogs";
import Link from "next/link";
import ProfileForm from "@/components/ProfileForm";
import EmailsReceived from "@/components/EmailsReceived";
import styles from "./page.module.css";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await requireVerifiedAuth();
  const { from } = await searchParams;
  const returnTo = from ?? "/dashboard";

  const [dbUser, receivedEmails] = await Promise.all([
    getUserById(session.user.id),
    getEmailsForUser(session.user.id),
  ]);
  const role = dbUser?.role ?? "user";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={returnTo} className={styles.back}>
          ← Back
        </Link>
        <h1 className={styles.title}>My Profile</h1>
      </header>
      <main className={styles.main}>
        <ProfileForm
          name={session.user.name}
          email={session.user.email}
          role={role}
          returnTo={returnTo}
        />
        <EmailsReceived logs={receivedEmails} />
      </main>
    </div>
  );
}
