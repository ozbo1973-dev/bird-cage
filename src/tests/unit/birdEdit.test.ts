import { describe, it, expect } from "vitest";

/** Mirrors the payload-building logic in BirdEditForm and AddBirdForm */
function buildBirdPayload(fields: {
  type: string;
  species: string;
  locationName: string;
  lat: string;
  lng: string;
  dateStamp: string;
  notes: string;
}) {
  return {
    type: fields.type,
    species: fields.species,
    locationName: fields.locationName,
    lat: fields.lat !== "" ? parseFloat(fields.lat) : null,
    lng: fields.lng !== "" ? parseFloat(fields.lng) : null,
    dateStamp: fields.dateStamp,
    notes: fields.notes,
  };
}

describe("buildBirdPayload", () => {
  it("converts numeric lat/lng strings to floats", () => {
    const payload = buildBirdPayload({
      type: "Raptor",
      species: "Osprey",
      locationName: "Lake View",
      lat: "40.7851",
      lng: "-73.9683",
      dateStamp: "2025-03-01",
      notes: "Seen near water",
    });
    expect(payload.lat).toBe(40.7851);
    expect(payload.lng).toBe(-73.9683);
  });

  it("sets lat/lng to null when empty strings", () => {
    const payload = buildBirdPayload({
      type: "Songbird",
      species: "Robin",
      locationName: "Park",
      lat: "",
      lng: "",
      dateStamp: "2025-03-01",
      notes: "",
    });
    expect(payload.lat).toBeNull();
    expect(payload.lng).toBeNull();
  });

  it("preserves all string fields unchanged", () => {
    const payload = buildBirdPayload({
      type: "Waterfowl",
      species: "Mallard",
      locationName: "River Bend",
      lat: "",
      lng: "",
      dateStamp: "2025-06-15",
      notes: "Near the reeds",
    });
    expect(payload.type).toBe("Waterfowl");
    expect(payload.species).toBe("Mallard");
    expect(payload.locationName).toBe("River Bend");
    expect(payload.dateStamp).toBe("2025-06-15");
    expect(payload.notes).toBe("Near the reeds");
  });
});
