import { describe, it, expect } from "vitest";
import {
  emptyBirdFormData,
  emptyPhotoState,
  emptyGeoState,
  toBirdRecord,
  updateBirdFieldInRecords,
  buildEventPayload,
  shouldShowEditLink,
  shouldShowPhotoSection,
  shouldShowGeoButton,
  shouldShowChatWidget,
  BIRD_FORM_DEFAULTS,
} from "@/hooks/useEventForm";
import type { BirdRecord } from "@/hooks/useEventForm";

// Minimal BirdEntry shape for testing (mirrors db schema fields used in toBirdRecord)
interface MockBirdEntry {
  id: number;
  type: string;
  species: string;
  locationName: string;
  lat: number | null;
  lng: number | null;
  dateStamp: string;
  notes: string | null;
  photoPath: string | null;
  photoData: string | null;
}

function makeMockBird(overrides: Partial<MockBirdEntry> = {}): MockBirdEntry {
  return {
    id: 1,
    type: "Raptor",
    species: "Red-tailed Hawk",
    locationName: "Central Park",
    lat: 40.7851,
    lng: -73.9683,
    dateStamp: "2026-01-15",
    notes: "Circling overhead",
    photoPath: "/uploads/hawk.jpg",
    photoData: null,
    ...overrides,
  };
}

// ── emptyBirdFormData ────────────────────────────────────────────────────────

describe("emptyBirdFormData", () => {
  it("returns empty strings for all text fields", () => {
    const data = emptyBirdFormData();
    expect(data.type).toBe("");
    expect(data.species).toBe("");
    expect(data.locationName).toBe("");
    expect(data.lat).toBe("");
    expect(data.lng).toBe("");
    expect(data.notes).toBe("");
    expect(data.photoPath).toBe("");
    expect(data.photoData).toBe("");
  });

  it("sets dateStamp to today's ISO date (YYYY-MM-DD)", () => {
    const data = emptyBirdFormData();
    expect(data.dateStamp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("two calls return independent objects", () => {
    const a = emptyBirdFormData();
    const b = emptyBirdFormData();
    a.type = "mutated";
    expect(b.type).toBe("");
  });
});

// ── emptyPhotoState ──────────────────────────────────────────────────────────

describe("emptyPhotoState", () => {
  it("starts with no preview, no error, not uploading, not identified", () => {
    const p = emptyPhotoState();
    expect(p.preview).toBe("");
    expect(p.error).toBe("");
    expect(p.uploading).toBe(false);
    expect(p.identified).toBe(false);
    expect(p.status).toBe("");
  });
});

// ── emptyGeoState ────────────────────────────────────────────────────────────

describe("emptyGeoState", () => {
  it("starts not loading and with no error", () => {
    const g = emptyGeoState();
    expect(g.loading).toBe(false);
    expect(g.error).toBe("");
  });
});

// ── toBirdRecord ─────────────────────────────────────────────────────────────

describe("toBirdRecord", () => {
  it("maps all string fields from a BirdEntry", () => {
    const entry = makeMockBird();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = toBirdRecord(entry as any);
    expect(record.formData.type).toBe("Raptor");
    expect(record.formData.species).toBe("Red-tailed Hawk");
    expect(record.formData.locationName).toBe("Central Park");
    expect(record.formData.dateStamp).toBe("2026-01-15");
    expect(record.formData.notes).toBe("Circling overhead");
    expect(record.formData.photoPath).toBe("/uploads/hawk.jpg");
  });

  it("converts numeric lat/lng to strings", () => {
    const entry = makeMockBird({ lat: 40.7851, lng: -73.9683 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = toBirdRecord(entry as any);
    expect(record.formData.lat).toBe("40.7851");
    expect(record.formData.lng).toBe("-73.9683");
  });

  it("converts null lat/lng to empty strings", () => {
    const entry = makeMockBird({ lat: null, lng: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = toBirdRecord(entry as any);
    expect(record.formData.lat).toBe("");
    expect(record.formData.lng).toBe("");
  });

  it("converts null notes to empty string", () => {
    const entry = makeMockBird({ notes: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = toBirdRecord(entry as any);
    expect(record.formData.notes).toBe("");
  });

  it("converts null photoPath to empty string", () => {
    const entry = makeMockBird({ photoPath: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = toBirdRecord(entry as any);
    expect(record.formData.photoPath).toBe("");
  });

  it("assigns a non-empty UUID as id", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = toBirdRecord(makeMockBird() as any);
    expect(record.id).toBeTruthy();
    expect(record.id.length).toBeGreaterThan(0);
  });

  it("initialises photo and geo states as empty/default", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = toBirdRecord(makeMockBird() as any);
    expect(record.photo).toEqual(emptyPhotoState());
    expect(record.geo).toEqual(emptyGeoState());
  });
});

// ── updateBirdFieldInRecords ─────────────────────────────────────────────────

describe("updateBirdFieldInRecords", () => {
  function makeRecord(id: string, overrides: Partial<ReturnType<typeof emptyBirdFormData>> = {}): BirdRecord {
    return {
      id,
      formData: { ...emptyBirdFormData(), ...overrides },
      photo: emptyPhotoState(),
      geo: emptyGeoState(),
    };
  }

  it("updates the target bird's field", () => {
    const records = [makeRecord("a"), makeRecord("b")];
    const updated = updateBirdFieldInRecords(records, "a", "species", "Sparrow");
    expect(updated[0].formData.species).toBe("Sparrow");
  });

  it("does not mutate other birds", () => {
    const records = [makeRecord("a"), makeRecord("b", { species: "Hawk" })];
    const updated = updateBirdFieldInRecords(records, "a", "species", "Sparrow");
    expect(updated[1].formData.species).toBe("Hawk");
  });

  it("returns a new array (immutable update)", () => {
    const records = [makeRecord("a")];
    const updated = updateBirdFieldInRecords(records, "a", "type", "Songbird");
    expect(updated).not.toBe(records);
  });

  it("does not modify the original records array", () => {
    const records = [makeRecord("a")];
    updateBirdFieldInRecords(records, "a", "type", "Songbird");
    expect(records[0].formData.type).toBe("");
  });

  it("ignores update when id is not found", () => {
    const records = [makeRecord("a")];
    const updated = updateBirdFieldInRecords(records, "unknown", "type", "X");
    expect(updated[0].formData.type).toBe("");
  });
});

// ── buildEventPayload ────────────────────────────────────────────────────────

describe("buildEventPayload", () => {
  function makeRecord(id: string, overrides: Partial<ReturnType<typeof emptyBirdFormData>> = {}): BirdRecord {
    return {
      id,
      formData: { ...emptyBirdFormData(), ...overrides },
      photo: emptyPhotoState(),
      geo: emptyGeoState(),
    };
  }

  it("includes event-level title, date, and notes", () => {
    const payload = buildEventPayload("Morning Walk", "2026-01-15", "Sunny", []);
    expect(payload.title).toBe("Morning Walk");
    expect(payload.date).toBe("2026-01-15");
    expect(payload.notes).toBe("Sunny");
  });

  it("filters out birds with empty species", () => {
    const records = [
      makeRecord("a", { species: "Hawk", type: "Raptor" }),
      makeRecord("b", { species: "", type: "Songbird" }),
    ];
    const payload = buildEventPayload("Test", "2026-01-15", "", records);
    expect(payload.birds).toHaveLength(1);
    expect(payload.birds[0].species).toBe("Hawk");
  });

  it("converts lat/lng strings to numbers when non-empty", () => {
    const records = [makeRecord("a", { species: "Hawk", lat: "40.7851", lng: "-73.9683" })];
    const payload = buildEventPayload("Test", "2026-01-15", "", records);
    expect(payload.birds[0].lat).toBe(40.7851);
    expect(payload.birds[0].lng).toBe(-73.9683);
  });

  it("converts empty lat/lng strings to null", () => {
    const records = [makeRecord("a", { species: "Hawk", lat: "", lng: "" })];
    const payload = buildEventPayload("Test", "2026-01-15", "", records);
    expect(payload.birds[0].lat).toBeNull();
    expect(payload.birds[0].lng).toBeNull();
  });

  it("uses null for photoPath when photoData is present (base64 upload)", () => {
    const records = [
      makeRecord("a", { species: "Hawk", photoData: "data:image/jpeg;base64,abc", photoPath: "/old/path.jpg" }),
    ];
    const payload = buildEventPayload("Test", "2026-01-15", "", records);
    expect(payload.birds[0].photoData).toBe("data:image/jpeg;base64,abc");
    expect(payload.birds[0].photoPath).toBeNull();
  });

  it("uses photoPath when no photoData (stored file)", () => {
    const records = [
      makeRecord("a", { species: "Hawk", photoData: "", photoPath: "/uploads/hawk.jpg" }),
    ];
    const payload = buildEventPayload("Test", "2026-01-15", "", records);
    expect(payload.birds[0].photoPath).toBe("/uploads/hawk.jpg");
    expect(payload.birds[0].photoData).toBeNull();
  });

  it("sets both to null when neither photoData nor photoPath is present", () => {
    const records = [makeRecord("a", { species: "Hawk", photoData: "", photoPath: "" })];
    const payload = buildEventPayload("Test", "2026-01-15", "", records);
    expect(payload.birds[0].photoPath).toBeNull();
    expect(payload.birds[0].photoData).toBeNull();
  });

  it("returns empty birds array when all records have empty species", () => {
    const records = [makeRecord("a"), makeRecord("b")];
    const payload = buildEventPayload("Test", "2026-01-15", "", records);
    expect(payload.birds).toHaveLength(0);
  });
});

// ── shouldShowEditLink ───────────────────────────────────────────────────────

describe("shouldShowEditLink", () => {
  it("returns true when isEdit, birdId, and eventId are all present", () => {
    expect(shouldShowEditLink(true, 5, 3)).toBe(true);
  });

  it("returns false when not in edit mode", () => {
    expect(shouldShowEditLink(false, 5, 3)).toBe(false);
  });

  it("returns false when birdId is undefined", () => {
    expect(shouldShowEditLink(true, undefined, 3)).toBe(false);
  });

  it("returns false when eventId is undefined", () => {
    expect(shouldShowEditLink(true, 5, undefined)).toBe(false);
  });

  it("returns false when both ids are undefined", () => {
    expect(shouldShowEditLink(true, undefined, undefined)).toBe(false);
  });
});

// ── shouldShowPhotoSection ───────────────────────────────────────────────────

describe("shouldShowPhotoSection", () => {
  it("returns true when not in edit mode", () => {
    expect(shouldShowPhotoSection(false)).toBe(true);
  });

  it("returns false when in edit mode", () => {
    expect(shouldShowPhotoSection(true)).toBe(false);
  });
});

// ── shouldShowGeoButton ──────────────────────────────────────────────────────

describe("shouldShowGeoButton", () => {
  it("returns true when not in edit mode", () => {
    expect(shouldShowGeoButton(false)).toBe(true);
  });

  it("returns false when in edit mode", () => {
    expect(shouldShowGeoButton(true)).toBe(false);
  });
});

// ── shouldShowChatWidget ─────────────────────────────────────────────────────

describe("shouldShowChatWidget", () => {
  it("returns true when not in edit mode and bird not yet identified", () => {
    expect(shouldShowChatWidget(false, false)).toBe(true);
  });

  it("returns false when in edit mode", () => {
    expect(shouldShowChatWidget(true, false)).toBe(false);
  });

  it("returns false when bird is already identified", () => {
    expect(shouldShowChatWidget(false, true)).toBe(false);
  });

  it("returns false when both isEdit and identified are true", () => {
    expect(shouldShowChatWidget(true, true)).toBe(false);
  });
});

// ── BIRD_FORM_DEFAULTS ───────────────────────────────────────────────────────

describe("BIRD_FORM_DEFAULTS", () => {
  it("exports default empty string values for form fields", () => {
    expect(BIRD_FORM_DEFAULTS.type).toBe("");
    expect(BIRD_FORM_DEFAULTS.species).toBe("");
    expect(BIRD_FORM_DEFAULTS.locationName).toBe("");
    expect(BIRD_FORM_DEFAULTS.notes).toBe("");
    expect(BIRD_FORM_DEFAULTS.photoPath).toBe("");
    expect(BIRD_FORM_DEFAULTS.photoData).toBe("");
  });
});
