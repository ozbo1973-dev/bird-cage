import { describe, it, expect } from "vitest";
import { toBirdInsert, BirdFormInput } from "@/lib/birds";

describe("toBirdInsert", () => {
  const baseInput: BirdFormInput = {
    type: "Songbird",
    species: "American Robin",
    locationName: "Central Park",
    dateStamp: "2026-04-11",
  };

  it("maps required fields and sets optional fields to null when absent", () => {
    const result = toBirdInsert(baseInput, 42);
    expect(result).toEqual({
      eventId: 42,
      type: "Songbird",
      species: "American Robin",
      locationName: "Central Park",
      dateStamp: "2026-04-11",
      lat: null,
      lng: null,
      notes: null,
      photoPath: null,
      photoData: null,
    });
  });

  it("includes lat and lng when provided", () => {
    const input: BirdFormInput = { ...baseInput, lat: 40.785, lng: -73.968 };
    const result = toBirdInsert(input, 1);
    expect(result.lat).toBe(40.785);
    expect(result.lng).toBe(-73.968);
  });

  it("includes notes when provided", () => {
    const input: BirdFormInput = { ...baseInput, notes: "Singing loudly" };
    const result = toBirdInsert(input, 1);
    expect(result.notes).toBe("Singing loudly");
  });

  it("photo mutex rule: sets photoPath to null when photoData is present", () => {
    const input: BirdFormInput = {
      ...baseInput,
      photoData: "data:image/png;base64,abc123",
      photoPath: "/uploads/photo.png",
    };
    const result = toBirdInsert(input, 1);
    expect(result.photoData).toBe("data:image/png;base64,abc123");
    expect(result.photoPath).toBeNull();
  });

  it("photo mutex rule: uses photoPath when photoData is absent", () => {
    const input: BirdFormInput = {
      ...baseInput,
      photoPath: "/uploads/photo.png",
    };
    const result = toBirdInsert(input, 1);
    expect(result.photoPath).toBe("/uploads/photo.png");
    expect(result.photoData).toBeNull();
  });

  it("photo mutex rule: both null when neither is provided", () => {
    const result = toBirdInsert(baseInput, 1);
    expect(result.photoPath).toBeNull();
    expect(result.photoData).toBeNull();
  });

  it("photo mutex rule: photoPath used when photoData is empty string (falsy), photoData preserved as empty string", () => {
    const input: BirdFormInput = {
      ...baseInput,
      photoData: "",
      photoPath: "/uploads/photo.png",
    };
    const result = toBirdInsert(input, 1);
    // empty string is falsy → photoData does NOT override photoPath
    // ?? null coercion preserves "" as "" (only nullish values become null)
    expect(result.photoPath).toBe("/uploads/photo.png");
    expect(result.photoData).toBe("");
  });

  it("sets eventId correctly", () => {
    expect(toBirdInsert(baseInput, 99).eventId).toBe(99);
    expect(toBirdInsert(baseInput, 1).eventId).toBe(1);
  });

  it("coerces explicit null optional fields to null", () => {
    const input: BirdFormInput = {
      ...baseInput,
      lat: null,
      lng: null,
      notes: null,
      photoPath: null,
      photoData: null,
    };
    const result = toBirdInsert(input, 5);
    expect(result.lat).toBeNull();
    expect(result.lng).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.photoPath).toBeNull();
    expect(result.photoData).toBeNull();
  });
});
