import { requireAuth } from "@/lib/auth";
import { initDb } from "@/db";
import EventForm from "@/components/EventForm";
import Link from "next/link";
import styles from "./page.module.css";

export default async function NewEventPage() {
  await requireAuth();
  initDb();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.back}>
          ← Back to Dashboard
        </Link>
        <h1 className={styles.title}>New Birding Event</h1>
      </header>
      <main className={styles.main}>
        <EventForm />
      </main>
    </div>
  );
}
