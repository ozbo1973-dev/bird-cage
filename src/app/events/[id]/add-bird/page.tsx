import { notFound } from "next/navigation";
import { requireVerifiedAuth } from "@/lib/session";
import { getEventWithBirds } from "@/lib/dal/events";
import AddBirdForm from "@/components/AddBirdForm";
import Link from "next/link";
import styles from "./page.module.css";

export default async function AddBirdPage({
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
        <h1 className={styles.title}>Add Bird to: {data.title}</h1>
      </header>
      <main className={styles.main}>
        <AddBirdForm eventId={eventId} />
      </main>
    </div>
  );
}
