"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./EventForm.module.css";
import BirdChatWidget from "./BirdChatWidget";

interface BirdEntry {
  type: string;
  species: string;
  locationName: string;
  lat: string;
  lng: string;
  dateStamp: string;
  notes: string;
}

function emptyBird(): BirdEntry {
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

export default function EventForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [birds, setBirds] = useState<BirdEntry[]>([emptyBird()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateBird(index: number, field: keyof BirdEntry, value: string) {
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

  async function handleSubmit(e: React.SubmitEvent) {
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

    const res = await fetch("/api/events", {
      method: "POST",
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
              {birds.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBird(index)}
                  className={styles.removeBtn}
                >
                  Remove
                </button>
              )}
            </div>
            <BirdChatWidget
              onIdentified={({ type, species, summary }) => {
                updateBird(index, "type", type);
                updateBird(index, "species", species);
                if (summary) updateBird(index, "notes", summary);
              }}
            />
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
          + Add Another Bird
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
          {saving ? "Saving…" : "Save Event"}
        </button>
      </div>
    </form>
  );
}
