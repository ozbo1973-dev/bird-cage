import { requireAdminAuth } from "@/lib/session";
import { getAllEmailLogs } from "@/lib/dal/emailLogs";
import { getAllUsers } from "@/lib/dal/users";
import Link from "next/link";
import AdminEmailLog from "@/components/AdminEmailLog";
import styles from "./page.module.css";

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  await requireAdminAuth();
  const { userId } = await searchParams;

  const [logs, users] = await Promise.all([
    getAllEmailLogs(userId),
    userId ? getAllUsers() : Promise.resolve([]),
  ]);

  const filterUser = userId ? users.find((u) => u.id === userId) : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/admin/users" className={styles.back}>
          ← Back to Users
        </Link>
        <h1 className={styles.title}>Email Audit Log</h1>
      </header>
      <main className={styles.main}>
        {filterUser && (
          <div className={styles.filterBanner}>
            Showing emails for <strong>{filterUser.name}</strong>
            {" — "}
            <Link href="/dashboard/admin/emails" className={styles.showAll}>
              Show all
            </Link>
          </div>
        )}
        <div className={styles.card}>
          <AdminEmailLog logs={logs} />
        </div>
      </main>
    </div>
  );
}
