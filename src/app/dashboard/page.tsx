import { requireVerifiedAuth } from "../../lib/session";
import { getUserEvents } from "../../lib/dal/events";
import { getUserById } from "../../lib/dal/users";
import Link from "next/link";
import Image from "next/image";
import { CalendarPlus, Zap } from "lucide-react";
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

  const [eventsWithBirds, dbUser] = await Promise.all([
    getUserEvents(session.user.id),
    getUserById(session.user.id),
  ]);

  const billingPlan = dbUser?.billingPlan ?? "free";
  const isAdmin = dbUser?.role === "admin";
  const isFree = billingPlan === "free" && !isAdmin;

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
          <NavDropdown returnPath="/dashboard" isAdmin={isAdmin} hasEvents={eventsWithBirds.length > 0} />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.mobileNewEventWrap}>
          <Link href="/events/new" className={styles.newEventBtn}>
            <CalendarPlus size={16} />
            New Event
          </Link>
        </div>
        {isFree && (
          <div className={styles.upgradeBanner}>
            <div className={styles.upgradeBannerContent}>
              <Zap size={18} />
              <span>
                You&apos;re on the <strong>Free plan</strong>. Upgrade to unlock AI photo identification and premium models.
              </span>
            </div>
            <Link href="/billing" className={styles.upgradeBtn}>
              Upgrade to Pro
            </Link>
          </div>
        )}
        <DashboardTabs view={view} events={eventsWithBirds} />
      </main>
    </div>
  );
}
