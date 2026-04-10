import { notFound } from "next/navigation";
import { requireVerifiedAuth } from "@/lib/session";
import { getEventWithBirds } from "@/lib/dal/events";
import { getUserById } from "@/lib/dal/users";
import EventForm from "@/components/EventForm";
import NavDropdown from "@/components/NavDropdown";
import Link from "next/link";
import styles from "./page.module.css";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireVerifiedAuth();
  const { id } = await params;
  const eventId = parseInt(id, 10);

  if (isNaN(eventId)) notFound();

  const [data, dbUser] = await Promise.all([
    getEventWithBirds(eventId, session.user.id),
    getUserById(session.user.id),
  ]);
  if (!data) notFound();

  const isAdmin = dbUser?.role === "admin";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.back}>
          ← Back to Dashboard
        </Link>
        <h1 className={styles.title}>Edit Event</h1>
        <div className={styles.navMenu}>
          <NavDropdown isAdmin={isAdmin} returnPath="/dashboard" />
        </div>
      </header>
      <main className={styles.main}>
        <EventForm initialData={{ event: data, birds: data.birds }} />
      </main>
    </div>
  );
}
