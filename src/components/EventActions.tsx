"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bird, Calendar } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import styles from "./EventActions.module.css";

interface Props {
  eventId: number;
  eventTitle: string;
}

export default function EventActions({ eventId, eventTitle }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    if (!res.ok) {
      setConfirming(false);
      setError("Failed to delete event. Please try again.");
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  return (
    <>
      <div className={styles.actions}>
        <Link href={`/events/${eventId}/add-bird`} className={styles.btn}>
          <Bird size={14} />
          Add Bird
        </Link>
        <Link href={`/events/${eventId}/edit`} className={styles.btn}>
          <Calendar size={14} />
          Edit
        </Link>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={styles.dangerBtn}
        >
          <Calendar size={14} />
          Delete
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <ConfirmDialog
        open={confirming}
        message={`Delete event "${eventTitle}"? This will also delete all bird sightings.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
