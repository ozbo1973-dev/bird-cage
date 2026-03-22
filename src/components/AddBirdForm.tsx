"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import BirdChatWidget from "./BirdChatWidget";
import DragDropZone from "./DragDropZone";
import styles from "./AddBirdForm.module.css";

interface Props {
  eventId: number;
}

export default function AddBirdForm({ eventId }: Props) {
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
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [photoPath, setPhotoPath] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoStatus, setPhotoStatus] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoIdentified, setPhotoIdentified] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (lat === "") setLat(String(position.coords.latitude));
        if (lng === "") setLng(String(position.coords.longitude));
        setGeoLoading(false);
      },
      () => {
        setGeoError("Unable to retrieve your location.");
        setGeoLoading(false);
      },
    );
  }

  async function handlePhotoFile(file: File) {

    setPhotoError("");
    setPhotoStatus("Uploading photo...");
    setPhotoUploading(true);
    setPhotoPreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });

    const form = new FormData();
    form.append("file", file);

    try {
      const uploadRes = await fetch("/api/uploads", { method: "POST", body: form });
      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => ({}));
        setPhotoError((body as { error?: string }).error ?? "Upload failed");
        setPhotoStatus("");
        return;
      }

      const { path: uploadedPath } = (await uploadRes.json()) as { path: string };
      setPhotoPath(uploadedPath);
      setPhotoStatus("Identifying bird from photo...");

      const identRes = await fetch("/api/identify-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoPath: uploadedPath }),
      });

      if (!identRes.ok) {
        setPhotoStatus("Photo uploaded. Could not identify bird — please use the chat below.");
        return;
      }

      const result = (await identRes.json()) as { type: string; species: string; summary: string };
      setType(result.type);
      setSpecies(result.species);
      if (result.summary) setNotes(result.summary);
      setPhotoIdentified(true);
      setPhotoStatus("Bird identified from photo — fields populated.");
    } catch {
      setPhotoError("Something went wrong. Please try again.");
      setPhotoStatus("");
    } finally {
      setPhotoUploading(false);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handlePhotoFile(file);
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
          photoPath: photoPath || null,
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

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <DragDropZone
        onFile={handlePhotoFile}
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

      {!photoIdentified && (
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
          onClick={useMyLocation}
          disabled={geoLoading}
          className={styles.geoBtn}
        >
          {geoLoading ? "Detecting location..." : "Use my location"}
        </button>
        {geoError && <span className={styles.geoError}>{geoError}</span>}
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
