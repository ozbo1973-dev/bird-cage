"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";
import styles from "./BirdActions.module.css";

interface Props {
  birdId: number;
  birdSpecies: string;
}

export default function BirdActions({ birdId, birdSpecies }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const res = await fetch(`/api/birds/${birdId}`, { method: "DELETE" });
    if (!res.ok) {
      setConfirming(false);
      setError("Failed to delete. Please try again.");
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={styles.deleteBtn}
      >
        Delete
      </button>
      {error && <p className={styles.error}>{error}</p>}
      <ConfirmDialog
        open={confirming}
        message={`Delete sighting of "${birdSpecies}"?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
