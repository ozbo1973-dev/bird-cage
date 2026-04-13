"use client";

import Link from "next/link";
import BirdChatWidget from "./BirdChatWidget";
import DragDropZone from "./DragDropZone";
import styles from "./EventForm.module.css";
import {
  shouldShowEditLink,
  shouldShowPhotoSection,
  shouldShowGeoButton,
  shouldShowChatWidget,
} from "@/hooks/useEventForm";
import type { BirdRecord, BirdFormEntry } from "@/hooks/useEventForm";

// Re-export types that EventForm and other callers import from this module
export type { BirdRecord, BirdFormEntry };

interface Props {
  record: BirdRecord;
  displayIndex: number;
  isEdit: boolean;
  existingBirdId?: number;
  eventId?: number;
  isPaidUser?: boolean;
  onFieldChange: (field: keyof BirdFormEntry, value: string) => void;
  onRemove: () => void;
  onPhotoFile: (file: File) => void;
  onPhotoError: (msg: string) => void;
  onUseLocation: () => void;
  onIdentified: (result: {
    type: string;
    species: string;
    summary: string;
  }) => void;
}

/**
 * Pure presentational component — NO hooks, NO internal state.
 * All state lives in the parent's BirdRecord and is passed via props.
 */
export default function BirdCard({
  record,
  displayIndex,
  isEdit,
  existingBirdId,
  eventId,
  isPaidUser = false,
  onFieldChange,
  onRemove,
  onPhotoFile,
  onPhotoError,
  onUseLocation,
  onIdentified,
}: Props) {
  const { formData, photo, geo } = record;

  const showEditLink = shouldShowEditLink(isEdit, existingBirdId, eventId);
  const showPhotoSection = shouldShowPhotoSection(isEdit) && isPaidUser;
  const showGeoButton = shouldShowGeoButton(isEdit);
  const showChatWidget = shouldShowChatWidget(isEdit, photo.identified);

  const photoUploading = photo.uploading;
  const photoStatus = photo.status;

  return (
    <div className={styles.birdCard}>
      <div className={styles.birdCardHeader}>
        <span className={styles.birdIndex}>Bird #{displayIndex + 1}</span>
        <div className={styles.birdCardActions}>
          {showEditLink && (
            <Link
              href={`/birds/${existingBirdId}/edit?from=/events/${eventId}/edit`}
              className={styles.editBirdBtn}
            >
              Edit
            </Link>
          )}
          <button type="button" onClick={onRemove} className={styles.removeBtn}>
            Remove
          </button>
        </div>
      </div>

      {showPhotoSection && (
        <>
          <DragDropZone
            onFile={onPhotoFile}
            onError={onPhotoError}
            disabled={photoUploading}
          >
            <div className={styles.photoSection}>
              <label className={styles.photoLabel}>Photo (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPhotoFile(file);
                }}
                disabled={photoUploading}
                className={styles.photoInput}
              />
              {photo.preview && (
                <img
                  src={photo.preview}
                  alt="Preview"
                  className={styles.photoThumb}
                />
              )}
              {photoStatus && (
                <span className={styles.photoStatus}>{photoStatus}</span>
              )}
              {photo.error && (
                <span className={styles.photoError}>{photo.error}</span>
              )}
            </div>
          </DragDropZone>
          {showChatWidget && <BirdChatWidget onIdentified={onIdentified} />}
        </>
      )}

      <div className={styles.birdGrid}>
        <div className={styles.field}>
          <label
            htmlFor={`bird-type-${displayIndex}`}
            className={styles.label}
          >
            Type
          </label>
          <input
            id={`bird-type-${displayIndex}`}
            type="text"
            value={formData.type}
            onChange={(e) => onFieldChange("type", e.target.value)}
            className={styles.input}
            placeholder="e.g. Raptor"
            required
          />
        </div>
        <div className={styles.field}>
          <label
            htmlFor={`bird-species-${displayIndex}`}
            className={styles.label}
          >
            Species
          </label>
          <input
            id={`bird-species-${displayIndex}`}
            type="text"
            value={formData.species}
            onChange={(e) => onFieldChange("species", e.target.value)}
            className={styles.input}
            placeholder="e.g. Red-tailed Hawk"
            required
          />
        </div>
        <div className={styles.field}>
          <label
            htmlFor={`bird-location-${displayIndex}`}
            className={styles.label}
          >
            Location Name
          </label>
          <input
            id={`bird-location-${displayIndex}`}
            type="text"
            value={formData.locationName}
            onChange={(e) => onFieldChange("locationName", e.target.value)}
            className={styles.input}
            placeholder="e.g. Central Park, NY"
            required
          />
        </div>
        <div className={styles.field}>
          <label
            htmlFor={`bird-date-${displayIndex}`}
            className={styles.label}
          >
            Date Observed
          </label>
          <input
            id={`bird-date-${displayIndex}`}
            type="date"
            value={formData.dateStamp}
            onChange={(e) => onFieldChange("dateStamp", e.target.value)}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.field}>
          <label
            htmlFor={`bird-lat-${displayIndex}`}
            className={styles.label}
          >
            Latitude (optional)
          </label>
          <input
            id={`bird-lat-${displayIndex}`}
            type="number"
            step="any"
            value={formData.lat}
            onChange={(e) => onFieldChange("lat", e.target.value)}
            className={styles.input}
            placeholder="e.g. 40.7851"
          />
        </div>
        <div className={styles.field}>
          <label
            htmlFor={`bird-lng-${displayIndex}`}
            className={styles.label}
          >
            Longitude (optional)
          </label>
          <input
            id={`bird-lng-${displayIndex}`}
            type="number"
            step="any"
            value={formData.lng}
            onChange={(e) => onFieldChange("lng", e.target.value)}
            className={styles.input}
            placeholder="e.g. -73.9683"
          />
        </div>
      </div>

      {showGeoButton && (
        <div className={styles.geoRow}>
          <button
            type="button"
            onClick={onUseLocation}
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
        <label
          htmlFor={`bird-notes-${displayIndex}`}
          className={styles.label}
        >
          Notes
        </label>
        <textarea
          id={`bird-notes-${displayIndex}`}
          value={formData.notes}
          onChange={(e) => onFieldChange("notes", e.target.value)}
          className={styles.textarea}
          rows={2}
          placeholder="Optional notes about this sighting"
        />
      </div>
    </div>
  );
}
