"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import BirdChatWidget from "./BirdChatWidget";
import DragDropZone from "./DragDropZone";
import styles from "./AddBirdForm.module.css";
import { useGeoLocation, defaultShouldFill } from "@/hooks/useGeoLocation";
import { usePhotoReader } from "@/hooks/usePhotoReader";
import { usePhotoIdentify } from "@/hooks/usePhotoIdentify";

interface Props {
  eventId: number;
  isPaidUser?: boolean;
}

export default function AddBirdForm({ eventId, isPaidUser = false }: Props) {
  const router = useRouter();
  const [type, setType] = useState("");
  const [species, setSpecies] = useState("");
  const [locationName, setLocationName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [dateStamp, setDateStamp] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoData, setPhotoData] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState("");

  const geo = useGeoLocation({
    onFill: (newLat, newLng) => {
      setLat((cur) => (defaultShouldFill(cur, "") ? newLat : cur));
      setLng((cur) => (defaultShouldFill("", cur) ? newLng : cur));
    },
  });

  const identify = usePhotoIdentify({
    onIdentified: ({ type: t, species: s, summary }) => {
      setType(t);
      setSpecies(s);
      if (summary) setNotes(summary);
    },
    onError: setPhotoError,
  });

  const reader = usePhotoReader({
    onBase64Ready: async (base64) => {
      setPhotoData(base64);
      await identify.identify(base64);
    },
    onPreviewReady: setPhotoPreview,
    onError: setPhotoError,
  });

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) reader.readFile(file);
  }

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/birds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          species,
          locationName,
          lat: lat !== "" ? parseFloat(lat) : null,
          lng: lng !== "" ? parseFloat(lng) : null,
          dateStamp,
          notes,
          photoData: photoData || null,
        }),
      });

      setSaving(false);

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("Failed to save bird sighting. Please try again.");
      }
    });
  }

  const photoUploading = reader.reading || identify.identifying;
  const photoStatus = reader.reading ? "Reading photo..." : identify.status;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {isPaidUser && (
        <DragDropZone
          onFile={(file) => reader.readFile(file)}
          onError={setPhotoError}
          disabled={photoUploading}
        >
          <div className={styles.photoSection}>
            <label className={styles.photoLabel}>Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              disabled={photoUploading}
              className={styles.photoInput}
            />
            {photoPreview && (
              <img src={photoPreview} alt="Preview" className={styles.photoThumb} />
            )}
            {photoStatus && <span className={styles.photoStatus}>{photoStatus}</span>}
            {photoError && <span className={styles.photoError}>{photoError}</span>}
          </div>
        </DragDropZone>
      )}

      {!identify.identified && (
        <BirdChatWidget
          onIdentified={({ type: t, species: s, summary }) => {
            setType(t);
            setSpecies(s);
            if (summary) setNotes(summary);
          }}
        />
      )}

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

      <div className={styles.geoRow}>
        <button
          type="button"
          onClick={geo.requestLocation}
          disabled={geo.loading}
          className={styles.geoBtn}
        >
          {geo.loading ? "Detecting location..." : "Use my location"}
        </button>
        {geo.error && <span className={styles.geoError}>{geo.error}</span>}
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
          {saving ? "Saving…" : "Add Bird"}
        </button>
      </div>
    </form>
  );
}
