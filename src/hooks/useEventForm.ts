"use client";

import { useState, startTransition } from "react";
import type { BirdEntry } from "@/db/schema";

// ── Types ────────────────────────────────────────────────────────────────────

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
  uploading: boolean;
  identified: boolean;
  status: string;
}

export interface BirdGeoState {
  loading: boolean;
  error: string;
}

export interface BirdRecord {
  /** Stable crypto.randomUUID() — never an array index */
  id: string;
  formData: BirdFormEntry;
  photo: BirdPhotoState;
  geo: BirdGeoState;
}

// ── Constant defaults (exported for testing) ─────────────────────────────────

export const BIRD_FORM_DEFAULTS: Omit<BirdFormEntry, "dateStamp"> = {
  type: "",
  species: "",
  locationName: "",
  lat: "",
  lng: "",
  notes: "",
  photoPath: "",
  photoData: "",
};

// ── Pure helper functions (exported for unit testing) ─────────────────────────

export function emptyBirdFormData(): BirdFormEntry {
  return {
    ...BIRD_FORM_DEFAULTS,
    dateStamp: new Date().toISOString().slice(0, 10),
  };
}

export function emptyPhotoState(): BirdPhotoState {
  return {
    preview: "",
    error: "",
    uploading: false,
    identified: false,
    status: "",
  };
}

export function emptyGeoState(): BirdGeoState {
  return { loading: false, error: "" };
}

export function toBirdRecord(b: BirdEntry): BirdRecord {
  return {
    id: crypto.randomUUID(),
    formData: {
      type: b.type,
      species: b.species,
      locationName: b.locationName,
      lat: b.lat != null ? String(b.lat) : "",
      lng: b.lng != null ? String(b.lng) : "",
      dateStamp: b.dateStamp,
      notes: b.notes ?? "",
      photoPath: b.photoPath ?? "",
      photoData: b.photoData ?? "",
    },
    photo: emptyPhotoState(),
    geo: emptyGeoState(),
  };
}

export function updateBirdFieldInRecords(
  records: BirdRecord[],
  id: string,
  field: keyof BirdFormEntry,
  value: string,
): BirdRecord[] {
  return records.map((r) =>
    r.id === id ? { ...r, formData: { ...r.formData, [field]: value } } : r,
  );
}

export function buildEventPayload(
  title: string,
  date: string,
  notes: string,
  records: BirdRecord[],
) {
  return {
    title,
    date,
    notes,
    birds: records
      .filter((r) => r.formData.species.trim() !== "")
      .map((r) => ({
        ...r.formData,
        lat: r.formData.lat !== "" ? parseFloat(r.formData.lat) : null,
        lng: r.formData.lng !== "" ? parseFloat(r.formData.lng) : null,
        photoPath: r.formData.photoData
          ? null
          : r.formData.photoPath || null,
        photoData: r.formData.photoData || null,
      })),
  };
}

export function shouldShowEditLink(
  isEdit: boolean,
  birdId: number | undefined,
  eventId: number | undefined,
): boolean {
  return isEdit && birdId != null && eventId != null;
}

export function shouldShowPhotoSection(isEdit: boolean): boolean {
  return !isEdit;
}

export function shouldShowGeoButton(isEdit: boolean): boolean {
  return !isEdit;
}

export function shouldShowChatWidget(isEdit: boolean, identified: boolean): boolean {
  return !isEdit && !identified;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

interface EventInitialData {
  event: { id: number; title: string; date: string; notes: string };
  birds: BirdEntry[];
}

interface UseEventFormOptions {
  initialData?: EventInitialData;
  onSuccess?: () => void;
}

export interface UseEventFormReturn {
  // Event fields
  title: string;
  date: string;
  notes: string;
  setTitle: (v: string) => void;
  setDate: (v: string) => void;
  setNotes: (v: string) => void;

  // Bird management — stable UUID keys, no parallel arrays
  birdRecords: BirdRecord[];
  addBird: () => void;
  removeBird: (id: string) => void;
  updateBirdField: (id: string, field: keyof BirdFormEntry, value: string) => void;
  handlePhotoFile: (id: string, file: File) => Promise<void>;
  handlePhotoError: (id: string, msg: string) => void;
  handleUseLocation: (id: string) => void;
  handleIdentified: (
    id: string,
    result: { type: string; species: string; summary: string },
  ) => void;

  // Submission
  saving: boolean;
  error: string;
  handleSubmit: (e: React.SubmitEvent) => void;
  isEdit: boolean;
}

export function useEventForm(options: UseEventFormOptions): UseEventFormReturn {
  const { initialData, onSuccess } = options;
  const isEdit = !!initialData;

  const [title, setTitle] = useState(initialData?.event.title ?? "");
  const [date, setDate] = useState(
    initialData?.event.date ?? new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState(initialData?.event.notes ?? "");
  const [birdRecords, setBirdRecords] = useState<BirdRecord[]>(
    initialData ? initialData.birds.map(toBirdRecord) : [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Bird record helpers ──────────────────────────────────────────────────

  function patchPhoto(id: string, patch: Partial<BirdPhotoState>) {
    setBirdRecords((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, photo: { ...r.photo, ...patch } } : r,
      ),
    );
  }

  function patchGeo(id: string, patch: Partial<BirdGeoState>) {
    setBirdRecords((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, geo: { ...r.geo, ...patch } } : r,
      ),
    );
  }

  // ── Bird management ──────────────────────────────────────────────────────

  function addBird() {
    setBirdRecords((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        formData: emptyBirdFormData(),
        photo: emptyPhotoState(),
        geo: emptyGeoState(),
      },
    ]);
  }

  function removeBird(id: string) {
    setBirdRecords((prev) => prev.filter((r) => r.id !== id));
  }

  function updateBirdField(
    id: string,
    field: keyof BirdFormEntry,
    value: string,
  ) {
    setBirdRecords((prev) => updateBirdFieldInRecords(prev, id, field, value));
  }

  // ── Photo handling ───────────────────────────────────────────────────────

  async function handlePhotoFile(id: string, file: File) {
    patchPhoto(id, {
      uploading: true,
      error: "",
      status: "Reading photo...",
    });

    const preview = URL.createObjectURL(file);
    patchPhoto(id, { preview });

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      updateBirdField(id, "photoData", base64);
      updateBirdField(id, "photoPath", "");

      patchPhoto(id, { status: "Identifying bird from photo..." });

      const res = await fetch("/api/identify-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoBase64: base64 }),
      });

      if (res.ok) {
        const result = (await res.json()) as {
          type: string;
          species: string;
          summary: string;
        };
        updateBirdField(id, "type", result.type);
        updateBirdField(id, "species", result.species);
        if (result.summary) updateBirdField(id, "notes", result.summary);
        patchPhoto(id, {
          identified: true,
          status: "Bird identified from photo — fields populated.",
        });
      } else {
        patchPhoto(id, {
          status:
            "Photo ready. Could not identify bird — please use the chat below.",
        });
      }
    } catch {
      patchPhoto(id, { error: "Something went wrong. Please try again." });
    } finally {
      patchPhoto(id, { uploading: false });
    }
  }

  function handlePhotoError(id: string, msg: string) {
    patchPhoto(id, { error: msg });
  }

  // ── Geolocation handling ─────────────────────────────────────────────────

  function handleUseLocation(id: string) {
    if (!navigator.geolocation) {
      patchGeo(id, {
        error: "Geolocation is not supported by your browser.",
      });
      return;
    }

    patchGeo(id, { loading: true, error: "" });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Only fill when both fields are still empty
        setBirdRecords((prev) => {
          const record = prev.find((r) => r.id === id);
          if (
            record?.formData.lat === "" &&
            record?.formData.lng === ""
          ) {
            return updateBirdFieldInRecords(
              updateBirdFieldInRecords(
                prev,
                id,
                "lat",
                String(position.coords.latitude),
              ),
              id,
              "lng",
              String(position.coords.longitude),
            );
          }
          return prev;
        });
        patchGeo(id, { loading: false });
      },
      () => {
        patchGeo(id, {
          loading: false,
          error: "Unable to retrieve your location.",
        });
      },
    );
  }

  // ── Chat identification ──────────────────────────────────────────────────

  function handleIdentified(
    id: string,
    result: { type: string; species: string; summary: string },
  ) {
    updateBirdField(id, "type", result.type);
    updateBirdField(id, "species", result.species);
    if (result.summary) updateBirdField(id, "notes", result.summary);
    patchPhoto(id, { identified: true });
  }

  // ── Form submission ──────────────────────────────────────────────────────

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = buildEventPayload(title, date, notes, birdRecords);
    const url = isEdit
      ? `/api/events/${initialData!.event.id}`
      : "/api/events";
    const method = isEdit ? "PUT" : "POST";

    startTransition(async () => {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setSaving(false);

      if (res.ok) {
        onSuccess?.();
      } else {
        setError("Failed to save event. Please try again.");
      }
    });
  }

  return {
    title,
    date,
    notes,
    setTitle,
    setDate,
    setNotes,
    birdRecords,
    addBird,
    removeBird,
    updateBirdField,
    handlePhotoFile,
    handlePhotoError,
    handleUseLocation,
    handleIdentified,
    saving,
    error,
    handleSubmit,
    isEdit,
  };
}
