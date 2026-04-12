import { requireAdminAuth } from "@/lib/session";
import { getAllEmailLogs } from "@/lib/dal/emailLogs";
import Link from "next/link";
import AdminEmailLog from "@/components/AdminEmailLog";
import NavDropdown from "@/components/NavDropdown";
import styles from "./page.module.css";

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { dbUser } = await requireAdminAuth();
  const { userId } = await searchParams;
  const logs = await getAllEmailLogs(dbUser.role, userId);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/admin/users" className={styles.back}>
          ← Back to User Management
        </Link>
        <h1 className={styles.title}>Email Audit Log</h1>
        <span className={styles.count}>{logs.length} emails</span>
        <NavDropdown isAdmin returnPath="/dashboard/admin/users" />
      </header>

      <main className={styles.main}>
        {userId && (
          <div className={styles.filterBanner}>
            <span>Showing emails for one user.</span>
            <Link href="/dashboard/admin/emails" className={styles.showAll}>
              Show all →
            </Link>
          </div>
        )}
        <AdminEmailLog logs={logs} />
      </main>
    </div>
  );
}
