import { requireVerifiedAuth } from "@/lib/session";
import { getUserById } from "@/lib/dal/users";
import Link from "next/link";
import ProfileForm from "@/components/ProfileForm";
import styles from "./page.module.css";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await requireVerifiedAuth();
  const { from } = await searchParams;
  const returnTo = from ?? "/dashboard";

  const dbUser = await getUserById(session.user.id);
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
      </main>
    </div>
  );
}
