import { describe, it, expect } from "vitest";

/** Mirrors the geolocation autofill guard in AddBirdForm */
function shouldAutofillCoord(currentValue: string): boolean {
  return currentValue === "";
}

/** Builds the OpenStreetMap URL used by the map button in LocationView */
function buildMapUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=14`;
}

/** Mirrors the map button visibility condition in LocationView */
function shouldShowMapButton(lat: number | null, lng: number | null): boolean {
  return lat != null && lng != null;
}

describe("geolocation autofill guard", () => {
  it("autofills when field is blank", () => {
    expect(shouldAutofillCoord("")).toBe(true);
  });

  it("does not autofill when field already has a value", () => {
    expect(shouldAutofillCoord("40.7851")).toBe(false);
    expect(shouldAutofillCoord("-73.9683")).toBe(false);
  });
});

describe("buildMapUrl", () => {
  it("builds correct OpenStreetMap URL", () => {
    const url = buildMapUrl(40.7851, -73.9683);
    expect(url).toBe(
      "https://www.openstreetmap.org/?mlat=40.7851&mlon=-73.9683&zoom=14",
    );
  });

  it("handles negative latitude", () => {
    const url = buildMapUrl(-33.8688, 151.2093);
    expect(url).toContain("mlat=-33.8688");
    expect(url).toContain("mlon=151.2093");
  });
});

/** Mirrors the conditional location button display in BirdEditForm */
function shouldShowLocationButton(lat: string, lng: string): boolean {
  return lat === "" && lng === "";
}

describe("shouldShowLocationButton (BirdEditForm)", () => {
  it("shows button when both lat and lng are blank", () => {
    expect(shouldShowLocationButton("", "")).toBe(true);
  });

  it("hides button when lat has a value", () => {
    expect(shouldShowLocationButton("40.7851", "")).toBe(false);
  });

  it("hides button when lng has a value", () => {
    expect(shouldShowLocationButton("", "-73.9683")).toBe(false);
  });

  it("hides button when both have values", () => {
    expect(shouldShowLocationButton("40.7851", "-73.9683")).toBe(false);
  });
});

describe("shouldShowMapButton", () => {
  it("shows button when both lat and lng are present", () => {
    expect(shouldShowMapButton(40.7851, -73.9683)).toBe(true);
  });

  it("hides button when lat is null", () => {
    expect(shouldShowMapButton(null, -73.9683)).toBe(false);
  });

  it("hides button when lng is null", () => {
    expect(shouldShowMapButton(40.7851, null)).toBe(false);
  });

  it("hides button when both are null", () => {
    expect(shouldShowMapButton(null, null)).toBe(false);
  });
});
