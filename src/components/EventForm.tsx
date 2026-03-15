"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./EventForm.module.css";
import BirdChatWidget from "./BirdChatWidget";
import type { BirdingEvent, BirdEntry } from "@/db/schema";

interface BirdFormEntry {
  type: string;
  species: string;
  locationName: string;
  lat: string;
  lng: string;
  dateStamp: string;
  notes: string;
}

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
  };
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
  }

  function removeBird(index: number) {
    setBirds((prev) => prev.filter((_, i) => i !== index));
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
          <div key={index} className={styles.birdCard}>
            <div className={styles.birdCardHeader}>
              <span className={styles.birdIndex}>Bird #{index + 1}</span>
              <div className={styles.birdCardActions}>
                {isEdit && initialData!.birds[index] && (
                  <Link
                    href={`/birds/${initialData!.birds[index].id}/edit?from=/events/${initialData!.event.id}/edit`}
                    className={styles.editBirdBtn}
                  >
                    Edit
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => removeBird(index)}
                  className={styles.removeBtn}
                >
                  Remove
                </button>
              </div>
            </div>
            {!isEdit && (
              <BirdChatWidget
                onIdentified={({ type, species, summary }) => {
                  updateBird(index, "type", type);
                  updateBird(index, "species", species);
                  if (summary) updateBird(index, "notes", summary);
                }}
              />
            )}
            <div className={styles.birdGrid}>
              <div className={styles.field}>
                <label htmlFor={`bird-type-${index}`} className={styles.label}>
                  Type
                </label>
                <input
                  id={`bird-type-${index}`}
                  type="text"
                  value={bird.type}
                  onChange={(e) => updateBird(index, "type", e.target.value)}
                  className={styles.input}
                  placeholder="e.g. Raptor"
                  required
                />
              </div>
              <div className={styles.field}>
                <label
                  htmlFor={`bird-species-${index}`}
                  className={styles.label}
                >
                  Species
                </label>
                <input
                  id={`bird-species-${index}`}
                  type="text"
                  value={bird.species}
                  onChange={(e) => updateBird(index, "species", e.target.value)}
                  className={styles.input}
                  placeholder="e.g. Red-tailed Hawk"
                  required
                />
              </div>
              <div className={styles.field}>
                <label
                  htmlFor={`bird-location-${index}`}
                  className={styles.label}
                >
                  Location Name
                </label>
                <input
                  id={`bird-location-${index}`}
                  type="text"
                  value={bird.locationName}
                  onChange={(e) =>
                    updateBird(index, "locationName", e.target.value)
                  }
                  className={styles.input}
                  placeholder="e.g. Central Park, NY"
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor={`bird-date-${index}`} className={styles.label}>
                  Date Observed
                </label>
                <input
                  id={`bird-date-${index}`}
                  type="date"
                  value={bird.dateStamp}
                  onChange={(e) =>
                    updateBird(index, "dateStamp", e.target.value)
                  }
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor={`bird-lat-${index}`} className={styles.label}>
                  Latitude (optional)
                </label>
                <input
                  id={`bird-lat-${index}`}
                  type="number"
                  step="any"
                  value={bird.lat}
                  onChange={(e) => updateBird(index, "lat", e.target.value)}
                  className={styles.input}
                  placeholder="e.g. 40.7851"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor={`bird-lng-${index}`} className={styles.label}>
                  Longitude (optional)
                </label>
                <input
                  id={`bird-lng-${index}`}
                  type="number"
                  step="any"
                  value={bird.lng}
                  onChange={(e) => updateBird(index, "lng", e.target.value)}
                  className={styles.input}
                  placeholder="e.g. -73.9683"
                />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor={`bird-notes-${index}`} className={styles.label}>
                Notes
              </label>
              <textarea
                id={`bird-notes-${index}`}
                value={bird.notes}
                onChange={(e) => updateBird(index, "notes", e.target.value)}
                className={styles.textarea}
                rows={2}
                placeholder="Optional notes about this sighting"
              />
            </div>
          </div>
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
