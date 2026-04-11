import type { NewBirdEntry } from "@/db/schema";

export type BirdFormInput = {
  type: string;
  species: string;
  locationName: string;
  lat?: number | null;
  lng?: number | null;
  dateStamp: string;
  notes?: string | null;
  photoPath?: string | null;
  photoData?: string | null;
};

/**
 * Transforms bird form input into a DB insert payload.
 *
 * Photo mutex rule: when photoData is present, photoPath is set to null
 * so the DB never stores both representations simultaneously.
 */
export function toBirdInsert(b: BirdFormInput, eventId: number): NewBirdEntry {
  return {
    eventId,
    type: b.type,
    species: b.species,
    locationName: b.locationName,
    lat: b.lat ?? null,
    lng: b.lng ?? null,
    dateStamp: b.dateStamp,
    notes: b.notes ?? null,
    photoPath: b.photoData ? null : (b.photoPath ?? null),
    photoData: b.photoData ?? null,
  };
}
