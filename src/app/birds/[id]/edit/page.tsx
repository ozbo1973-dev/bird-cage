import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { getBirdEntry } from "@/lib/dal/events";
import BirdEditForm from "@/components/BirdEditForm";
import Link from "next/link";
import styles from "./page.module.css";

export default async function BirdEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;
  const birdId = parseInt(id, 10);

  if (isNaN(birdId)) notFound();

  const bird = await getBirdEntry(birdId, session.user.id);
  if (!bird) notFound();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.back}>
          ← Back to Dashboard
        </Link>
        <h1 className={styles.title}>Edit Bird Sighting</h1>
      </header>
      <main className={styles.main}>
        <BirdEditForm bird={bird} />
      </main>
    </div>
  );
}
