"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./EventForm.module.css";
import BirdChatWidget from "./BirdChatWidget";
import DragDropZone from "./DragDropZone";
import type { BirdingEvent, BirdEntry } from "@/db/schema";

interface BirdFormEntry {
  type: string;
  species: string;
  locationName: string;
  lat: string;
  lng: string;
  dateStamp: string;
  notes: string;
  photoPath: string;
}

interface BirdPhotoState {
  preview: string;
  status: string;
  error: string;
  uploading: boolean;
  identified: boolean;
}

interface BirdGeoState {
  loading: boolean;
  error: string;
}

function emptyPhotoState(): BirdPhotoState {
  return { preview: "", status: "", error: "", uploading: false, identified: false };
}

function emptyGeoState(): BirdGeoState {
  return { loading: false, error: "" };
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
    photoPath: "",
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
    photoPath: b.photoPath ?? "",
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
    initialData ? initialData.birds.map(() => emptyPhotoState()) : [],
  );
  const [birdGeo, setBirdGeo] = useState<BirdGeoState[]>(
    initialData ? initialData.birds.map(() => emptyGeoState()) : [],
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
    setBirdPhotos((prev) => [...prev, emptyPhotoState()]);
    setBirdGeo((prev) => [...prev, emptyGeoState()]);
  }

  function removeBird(index: number) {
    setBirds((prev) => prev.filter((_, i) => i !== index));
    setBirdPhotos((prev) => prev.filter((_, i) => i !== index));
    setBirdGeo((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePhoto(index: number, patch: Partial<BirdPhotoState>) {
    setBirdPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  }

  function updateGeo(index: number, patch: Partial<BirdGeoState>) {
    setBirdGeo((prev) =>
      prev.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    );
  }

  async function handlePhotoFile(index: number, file: File) {

    updatePhoto(index, { error: "", status: "Uploading photo...", uploading: true });
    const preview = URL.createObjectURL(file);
    updatePhoto(index, { preview });

    const form = new FormData();
    form.append("file", file);

    try {
      const uploadRes = await fetch("/api/uploads", { method: "POST", body: form });
      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => ({}));
        updatePhoto(index, { error: (body as { error?: string }).error ?? "Upload failed", status: "", uploading: false });
        return;
      }

      const { path: uploadedPath } = (await uploadRes.json()) as { path: string };
      updateBird(index, "photoPath", uploadedPath);

      updatePhoto(index, { status: "Identifying bird from photo..." });

      const identRes = await fetch("/api/identify-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoPath: uploadedPath }),
      });

      if (!identRes.ok) {
        updatePhoto(index, { status: "Photo uploaded. Could not identify bird — please use the chat below.", uploading: false });
        return;
      }

      const result = (await identRes.json()) as { type: string; species: string; summary: string };
      updateBird(index, "type", result.type);
      updateBird(index, "species", result.species);
      if (result.summary) updateBird(index, "notes", result.summary);
      updatePhoto(index, { identified: true, status: "Bird identified from photo — fields populated.", uploading: false });
    } catch {
      updatePhoto(index, { error: "Something went wrong. Please try again.", status: "", uploading: false });
    }
  }

  function handlePhotoChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handlePhotoFile(index, file);
  }

  function useMyLocation(index: number) {
    if (!navigator.geolocation) {
      updateGeo(index, { error: "Geolocation is not supported by your browser." });
      return;
    }
    updateGeo(index, { loading: true, error: "" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (birds[index].lat === "") updateBird(index, "lat", String(position.coords.latitude));
        if (birds[index].lng === "") updateBird(index, "lng", String(position.coords.longitude));
        updateGeo(index, { loading: false });
      },
      () => {
        updateGeo(index, { loading: false, error: "Unable to retrieve your location." });
      },
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
          photoPath: b.photoPath || null,
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
              <>
                <DragDropZone
                  onFile={(file) => handlePhotoFile(index, file)}
                  onError={(msg) => updatePhoto(index, { error: msg })}
                  disabled={birdPhotos[index]?.uploading}
                >
                  <div className={styles.photoSection}>
                    <label className={styles.photoLabel}>Photo (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoChange(index, e)}
                      disabled={birdPhotos[index]?.uploading}
                      className={styles.photoInput}
                    />
                    {birdPhotos[index]?.preview && (
                      <img src={birdPhotos[index].preview} alt="Preview" className={styles.photoThumb} />
                    )}
                    {birdPhotos[index]?.status && (
                      <span className={styles.photoStatus}>{birdPhotos[index].status}</span>
                    )}
                    {birdPhotos[index]?.error && (
                      <span className={styles.photoError}>{birdPhotos[index].error}</span>
                    )}
                  </div>
                </DragDropZone>
                {!birdPhotos[index]?.identified && (
                  <BirdChatWidget
                    onIdentified={({ type, species, summary }) => {
                      updateBird(index, "type", type);
                      updateBird(index, "species", species);
                      if (summary) updateBird(index, "notes", summary);
                    }}
                  />
                )}
              </>
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
            {!isEdit && (
              <div className={styles.geoRow}>
                <button
                  type="button"
                  onClick={() => useMyLocation(index)}
                  disabled={birdGeo[index]?.loading}
                  className={styles.geoBtn}
                >
                  {birdGeo[index]?.loading ? "Detecting location..." : "Use my location"}
                </button>
                {birdGeo[index]?.error && (
                  <span className={styles.geoError}>{birdGeo[index].error}</span>
                )}
              </div>
            )}
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
