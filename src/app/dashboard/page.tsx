import { requireVerifiedAuth } from "../../lib/session";
import { getUserEvents } from "../../lib/dal/events";
import Link from "next/link";
import Image from "next/image";
import { CalendarPlus } from "lucide-react";
import NavDropdown from "../../components/NavDropdown";
import DashboardTabs from "../../components/DashboardTabs";
import styles from "./page.module.css";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await requireVerifiedAuth();
  const { view = "timeline" } = await searchParams;

  const eventsWithBirds = await getUserEvents(session.user.id);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Image
          src="/logo-text.svg"
          alt="Bird Cage"
          width={120}
          height={50}
          className={styles.logo}
        />
        <div className={styles.headerActions}>
          <span className={styles.username}>Welcome, {session.user.name}</span>
          <Link href="/events/new" className={`${styles.newEventBtn} ${styles.headerNewEventBtn}`}>
            <CalendarPlus size={16} />
            New Event
          </Link>
          <NavDropdown returnPath="/dashboard" hasEvents={eventsWithBirds.length > 0} />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.mobileNewEventWrap}>
          <Link href="/events/new" className={styles.newEventBtn}>
            <CalendarPlus size={16} />
            New Event
          </Link>
        </div>
        <DashboardTabs view={view} events={eventsWithBirds} />
      </main>
    </div>
  );
}
