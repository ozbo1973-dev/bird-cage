"use client";

import Link from "next/link";
import BirdChatWidget from "./BirdChatWidget";
import DragDropZone from "./DragDropZone";
import styles from "./EventForm.module.css";
import { useGeoLocation, defaultShouldFill } from "@/hooks/useGeoLocation";
import { usePhotoReader } from "@/hooks/usePhotoReader";
import { usePhotoIdentify } from "@/hooks/usePhotoIdentify";

export interface BirdFormEntry {
  type: string;
  species: string;
  locationName: string;
  lat: string;
  lng: string;
  dateStamp: string;
  notes: string;
  photoPath: string;
  photoData: string;
}

export interface BirdPhotoState {
  preview: string;
  error: string;
}

interface Props {
  bird: BirdFormEntry;
  photo: BirdPhotoState;
  index: number;
  isEdit: boolean;
  editBirdId?: number;
  editEventId?: number;
  updateBird: (index: number, field: keyof BirdFormEntry, value: string) => void;
  updatePhoto: (index: number, patch: Partial<BirdPhotoState>) => void;
  removeBird: (index: number) => void;
}

export default function BirdCard({
  bird,
  photo,
  index,
  isEdit,
  editBirdId,
  editEventId,
  updateBird,
  updatePhoto,
  removeBird,
}: Props) {
  const geo = useGeoLocation({
    onFill: (newLat, newLng) => {
      updateBird(index, "lat", defaultShouldFill(bird.lat, "") ? newLat : bird.lat);
      updateBird(index, "lng", defaultShouldFill("", bird.lng) ? newLng : bird.lng);
    },
  });

  const identify = usePhotoIdentify({
    onIdentified: ({ type, species, summary }) => {
      updateBird(index, "type", type);
      updateBird(index, "species", species);
      if (summary) updateBird(index, "notes", summary);
    },
  });

  const reader = usePhotoReader({
    onBase64Ready: async (base64) => {
      updateBird(index, "photoData", base64);
      updateBird(index, "photoPath", "");
      await identify.identify(base64);
    },
    onPreviewReady: (url) => updatePhoto(index, { preview: url }),
    onError: (msg) => updatePhoto(index, { error: msg }),
  });

  const photoUploading = reader.reading || identify.identifying;
  const photoStatus = reader.reading ? "Reading photo..." : identify.status;

  return (
    <div className={styles.birdCard}>
      <div className={styles.birdCardHeader}>
        <span className={styles.birdIndex}>Bird #{index + 1}</span>
        <div className={styles.birdCardActions}>
          {isEdit && editBirdId != null && editEventId != null && (
            <Link
              href={`/birds/${editBirdId}/edit?from=/events/${editEventId}/edit`}
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
            onFile={(file) => reader.readFile(file)}
            onError={(msg) => updatePhoto(index, { error: msg })}
            disabled={photoUploading}
          >
            <div className={styles.photoSection}>
              <label className={styles.photoLabel}>Photo (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) reader.readFile(file);
                }}
                disabled={photoUploading}
                className={styles.photoInput}
              />
              {photo.preview && (
                <img src={photo.preview} alt="Preview" className={styles.photoThumb} />
              )}
              {photoStatus && (
                <span className={styles.photoStatus}>{photoStatus}</span>
              )}
              {photo.error && (
                <span className={styles.photoError}>{photo.error}</span>
              )}
            </div>
          </DragDropZone>
          {!identify.identified && (
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
          <label htmlFor={`bird-species-${index}`} className={styles.label}>
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
          <label htmlFor={`bird-location-${index}`} className={styles.label}>
            Location Name
          </label>
          <input
            id={`bird-location-${index}`}
            type="text"
            value={bird.locationName}
            onChange={(e) => updateBird(index, "locationName", e.target.value)}
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
            onChange={(e) => updateBird(index, "dateStamp", e.target.value)}
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
            onClick={geo.requestLocation}
            disabled={geo.loading}
            className={styles.geoBtn}
          >
            {geo.loading ? "Detecting location..." : "Use my location"}
          </button>
          {geo.error && (
            <span className={styles.geoError}>{geo.error}</span>
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
  );
}
