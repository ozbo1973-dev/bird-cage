"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import type { BirdEntry } from "@/db/schema";
import styles from "./BirdEditForm.module.css";

interface Props {
  bird: BirdEntry;
}

export default function BirdEditForm({ bird }: Props) {
  const router = useRouter();
  const [type, setType] = useState(bird.type);
  const [species, setSpecies] = useState(bird.species);
  const [locationName, setLocationName] = useState(bird.locationName);
  const [lat, setLat] = useState(bird.lat != null ? String(bird.lat) : "");
  const [lng, setLng] = useState(bird.lng != null ? String(bird.lng) : "");
  const [dateStamp, setDateStamp] = useState(bird.dateStamp);
  const [notes, setNotes] = useState(bird.notes ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    startTransition(async () => {
      const res = await fetch(`/api/birds/${bird.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          species,
          locationName,
          lat: lat !== "" ? parseFloat(lat) : null,
          lng: lng !== "" ? parseFloat(lng) : null,
          dateStamp,
          notes,
        }),
      });

      setSaving(false);

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("Failed to save changes. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="type" className={styles.label}>
            Type
          </label>
          <input
            id="type"
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={styles.input}
            placeholder="e.g. Raptor"
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="species" className={styles.label}>
            Species
          </label>
          <input
            id="species"
            type="text"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className={styles.input}
            placeholder="e.g. Red-tailed Hawk"
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="locationName" className={styles.label}>
            Location Name
          </label>
          <input
            id="locationName"
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className={styles.input}
            placeholder="e.g. Central Park, NY"
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="dateStamp" className={styles.label}>
            Date Observed
          </label>
          <input
            id="dateStamp"
            type="date"
            value={dateStamp}
            onChange={(e) => setDateStamp(e.target.value)}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="lat" className={styles.label}>
            Latitude (optional)
          </label>
          <input
            id="lat"
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className={styles.input}
            placeholder="e.g. 40.7851"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="lng" className={styles.label}>
            Longitude (optional)
          </label>
          <input
            id="lng"
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className={styles.input}
            placeholder="e.g. -73.9683"
          />
        </div>
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
          placeholder="Optional notes about this sighting"
        />
      </div>

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
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
