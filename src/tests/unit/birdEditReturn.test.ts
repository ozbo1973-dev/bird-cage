import { describe, it, expect } from "vitest";

/** Mirrors the returnTo derivation logic in BirdEditPage */
function resolveReturnTo(from: string | undefined): string {
  return from ?? "/dashboard";
}

/** Mirrors the Edit link href construction in EventForm */
function buildEditBirdHref(birdId: number, eventId: number): string {
  return `/birds/${birdId}/edit?from=/events/${eventId}/edit`;
}

describe("resolveReturnTo", () => {
  it("returns the from param when provided", () => {
    expect(resolveReturnTo("/events/5/edit")).toBe("/events/5/edit");
  });

  it("defaults to /dashboard when from is undefined", () => {
    expect(resolveReturnTo(undefined)).toBe("/dashboard");
  });
});

describe("buildEditBirdHref", () => {
  it("builds correct href with bird and event ids", () => {
    expect(buildEditBirdHref(42, 7)).toBe("/birds/42/edit?from=/events/7/edit");
  });

  it("encodes numeric ids in the path", () => {
    expect(buildEditBirdHref(1, 99)).toBe("/birds/1/edit?from=/events/99/edit");
  });
});
