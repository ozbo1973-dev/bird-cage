import { requireAdminAuth } from "@/lib/session";
import { getAllUsers } from "@/lib/dal/users";
import Link from "next/link";
import AdminUsersList from "@/components/AdminUsersList";
import styles from "./page.module.css";

export default async function AdminUsersPage() {
  await requireAdminAuth();
  const users = await getAllUsers();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.back}>
          ← Back to Dashboard
        </Link>
        <h1 className={styles.title}>Admin — Users</h1>
        <Link href="/dashboard/admin/emails" className={styles.auditLink}>
          Email Audit Log →
        </Link>
      </header>
      <main className={styles.main}>
        <AdminUsersList users={users} />
        <Link href="/dashboard/profile" className={styles.back}>
          ← Back to Profile
        </Link>
        <h1 className={styles.title}>User Management</h1>
        <span className={styles.count}>{users.length} users</span>
      </header>
      <main className={styles.main}>
        <AdminUsersList users={users} currentUserId={dbUser.id} />
      </main>
    </div>
  );
}
