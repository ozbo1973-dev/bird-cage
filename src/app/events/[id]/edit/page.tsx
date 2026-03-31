import { notFound } from "next/navigation";
import { requireVerifiedAuth } from "@/lib/session";
import { getEventWithBirds } from "@/lib/dal/events";
import EventForm from "@/components/EventForm";
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

  const data = await getEventWithBirds(eventId, session.user.id);
  if (!data) notFound();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.back}>
          ← Back to Dashboard
        </Link>
        <h1 className={styles.title}>Edit Event</h1>
      </header>
      <main className={styles.main}>
        <EventForm initialData={{ event: data, birds: data.birds }} />
      </main>
    </div>
  );
}
