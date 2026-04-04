"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import type { BirdEntry } from "@/db/schema";
import DragDropZone from "./DragDropZone";
import styles from "./BirdEditForm.module.css";

interface Props {
  bird: BirdEntry;
  returnTo?: string;
}

export default function BirdEditForm({ bird, returnTo = "/dashboard" }: Props) {
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
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [photoPath, setPhotoPath] = useState(bird.photoPath ?? "");
  const [photoData, setPhotoData] = useState(bird.photoData ?? "");
  const [photoPreview, setPhotoPreview] = useState(
    bird.photoData
      ? bird.photoData
      : bird.photoPath
      ? `/api/uploads/${bird.photoPath}`
      : "",
  );
  const [photoStatus, setPhotoStatus] = useState("");
  const [photoError, setPhotoError] = useState("");
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
    setPhotoStatus("Reading photo...");
    setPhotoUploading(true);
    setPhotoPreview(URL.createObjectURL(file));

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setPhotoData(base64);
      setPhotoPath("");
      setPhotoStatus("Photo ready.");
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
          photoPath: photoData ? null : (photoPath || null),
          photoData: photoData || null,
        }),
      });

      setSaving(false);

      if (res.ok) {
        router.push(returnTo);
        router.refresh();
      } else {
        setError("Failed to save changes. Please try again.");
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
          {photoPreview && (
            <img src={photoPreview} alt="Bird photo" className={styles.photoThumb} />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            disabled={photoUploading}
            className={styles.photoInput}
          />
          {photoStatus && <span className={styles.photoStatus}>{photoStatus}</span>}
          {photoError && <span className={styles.photoError}>{photoError}</span>}
        </div>
      </DragDropZone>

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

      {lat === "" && lng === "" && (
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
      )}

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
          onClick={() => router.push(returnTo)}
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
