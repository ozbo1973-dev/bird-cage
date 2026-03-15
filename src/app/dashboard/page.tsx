import { requireAuth } from "../../lib/session";
import { getUserEvents } from "../../lib/dal/events";
import Link from "next/link";
import Image from "next/image";
import { Bird } from "lucide-react";
import LogoutButton from "../../components/LogoutButton";
import DashboardTabs from "../../components/DashboardTabs";
import styles from "./page.module.css";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await requireAuth();
  const { view = "timeline" } = await searchParams;

  const eventsWithBirds = await getUserEvents(session.user.id);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Image src="/logo.svg" alt="Bird Cage" width={48} height={48} className={styles.logo} />
        <div className={styles.headerActions}>
          <span className={styles.username}>Welcome, {session.user.name}</span>
          <Link href="/events/new" className={styles.newEventBtn}>
            <Bird size={16} />
            New Event
          </Link>
          <a href="/api/export" className={styles.exportBtn}>
            Download CSV
          </a>
          <LogoutButton />
        </div>
      </header>

      <main className={styles.main}>
        <DashboardTabs view={view} events={eventsWithBirds} />
      </main>
    </div>
  );
}
