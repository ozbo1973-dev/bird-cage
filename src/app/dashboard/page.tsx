import { requireAuth } from "../../lib/session";
import { db } from "../../db";
import { birdingEvents, birdEntries } from "../../db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
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

  const events = await db
    .select()
    .from(birdingEvents)
    .where(eq(birdingEvents.userId, session.user.id))
    .orderBy(birdingEvents.date);

  const birds = await db.select().from(birdEntries);

  const eventsWithBirds = events.map((event) => ({
    ...event,
    birds: birds.filter((b) => b.eventId === event.id),
  }));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.logo}>Bird Cage</h1>
        <div className={styles.headerActions}>
          <span className={styles.username}>Welcome, {session.user.name}</span>
          <Link href="/events/new" className={styles.newEventBtn}>
            + New Event
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
