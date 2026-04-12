"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "./EventForm.module.css";
import BirdCard from "./BirdCard";
import type { BirdFormEntry, BirdPhotoState } from "./BirdCard";
import type { BirdingEvent, BirdEntry } from "@/db/schema";

interface InitialData {
  event: BirdingEvent;
  birds: BirdEntry[];
}

interface Props {
  initialData?: InitialData;
}

function emptyBird(): BirdFormEntry {
  return {
    type: "",
    species: "",
    locationName: "",
    lat: "",
    lng: "",
    dateStamp: new Date().toISOString().slice(0, 10),
    notes: "",
    photoPath: "",
    photoData: "",
  };
}

function emptyPhoto(): BirdPhotoState {
  return { preview: "", error: "" };
}

function toBirdFormEntry(b: BirdEntry): BirdFormEntry {
  return {
    type: b.type,
    species: b.species,
    locationName: b.locationName,
    lat: b.lat != null ? String(b.lat) : "",
    lng: b.lng != null ? String(b.lng) : "",
    dateStamp: b.dateStamp,
    notes: b.notes ?? "",
    photoPath: b.photoPath ?? "",
    photoData: b.photoData ?? "",
  };
}

export default function EventForm({ initialData }: Props) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [title, setTitle] = useState(initialData?.event.title ?? "");
  const [date, setDate] = useState(
    initialData?.event.date ?? new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState(initialData?.event.notes ?? "");
  const [birds, setBirds] = useState<BirdFormEntry[]>(
    initialData ? initialData.birds.map(toBirdFormEntry) : [],
  );
  const [birdPhotos, setBirdPhotos] = useState<BirdPhotoState[]>(
    initialData ? initialData.birds.map(() => emptyPhoto()) : [],
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateBird(
    index: number,
    field: keyof BirdFormEntry,
    value: string,
  ) {
    setBirds((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    );
  }

  function addBird() {
    setBirds((prev) => [...prev, emptyBird()]);
    setBirdPhotos((prev) => [...prev, emptyPhoto()]);
  }

  function removeBird(index: number) {
    setBirds((prev) => prev.filter((_, i) => i !== index));
    setBirdPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePhoto(index: number, patch: Partial<BirdPhotoState>) {
    setBirdPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  }

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = {
      title,
      date,
      notes,
      birds: birds
        .filter((b) => b.species.trim() !== "")
        .map((b) => ({
          ...b,
          lat: b.lat !== "" ? parseFloat(b.lat) : null,
          lng: b.lng !== "" ? parseFloat(b.lng) : null,
          photoPath: b.photoData ? null : (b.photoPath || null),
          photoData: b.photoData || null,
        })),
    };

    const url = isEdit ? `/api/events/${initialData!.event.id}` : "/api/events";
    const method = isEdit ? "PUT" : "POST";

    startTransition(async () => {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setSaving(false);

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("Failed to save event. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Event Details</h2>
        <div className={styles.field}>
          <label htmlFor="title" className={styles.label}>
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
            placeholder="e.g. Morning walk at the park"
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="date" className={styles.label}>
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="notes" className={styles.label}>
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={styles.textarea}
            rows={3}
            placeholder="Optional notes about the event"
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Bird Sightings</h2>
        {birds.map((bird, index) => (
          <BirdCard
            key={index}
            bird={bird}
            photo={birdPhotos[index] ?? emptyPhoto()}
            index={index}
            isEdit={isEdit}
            editBirdId={initialData?.birds[index]?.id}
            editEventId={initialData?.event.id}
            updateBird={updateBird}
            updatePhoto={updatePhoto}
            removeBird={removeBird}
          />
        ))}

        <button type="button" onClick={addBird} className={styles.addBirdBtn}>
          + Add Bird
        </button>
      </section>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className={styles.cancelBtn}
        >
          Cancel
        </button>
        <button type="submit" disabled={saving} className={styles.saveBtn}>
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Save Event"}
        </button>
      </div>
    </form>
  );
}
