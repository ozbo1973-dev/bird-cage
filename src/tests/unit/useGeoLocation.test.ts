import { describe, it, expect } from "vitest";
import { defaultShouldFill } from "@/hooks/useGeoLocation";

describe("useGeoLocation - defaultShouldFill", () => {
  it("returns true when both lat and lng are empty strings", () => {
    expect(defaultShouldFill("", "")).toBe(true);
  });

  it("returns false when lat has a value", () => {
    expect(defaultShouldFill("40.7851", "")).toBe(false);
  });

  it("returns false when lng has a value", () => {
    expect(defaultShouldFill("", "-73.9683")).toBe(false);
  });

  it("returns false when both have values", () => {
    expect(defaultShouldFill("40.7851", "-73.9683")).toBe(false);
  });
});
