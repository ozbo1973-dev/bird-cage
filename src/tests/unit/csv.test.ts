import { describe, it, expect } from "vitest";
import { generateCsv } from "@/lib/csv";
import type { BirdingEvent, BirdEntry } from "@/db/schema";

const baseEvent: BirdingEvent = {
  id: 1,
  userId: "user_1",
  title: "Morning Walk",
  date: "2024-03-01",
  notes: "Sunny day",
  createdAt: "2024-03-01T08:00:00.000Z",
};

const baseBird: BirdEntry = {
  id: 1,
  eventId: 1,
  type: "Raptor",
  species: "Red-tailed Hawk",
  locationName: "Central Park",
  lat: 40.7851,
  lng: -73.9683,
  dateStamp: "2024-03-01",
  notes: "Spotted near the pond",
};

describe("generateCsv", () => {
  it("includes header row", () => {
    const csv = generateCsv([]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Event ID");
    expect(lines[0]).toContain("Bird Species");
    expect(lines[0]).toContain("Latitude");
  });

  it("returns only header for empty events", () => {
    const csv = generateCsv([]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(1);
  });

  it("generates a row per bird entry", () => {
    const event = { ...baseEvent, birds: [baseBird, { ...baseBird, id: 2, species: "Osprey" }] };
    const csv = generateCsv([event]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3); // header + 2 birds
  });

  it("generates one row for event with no birds", () => {
    const event = { ...baseEvent, birds: [] };
    const csv = generateCsv([event]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2); // header + 1 empty row
  });

  it("includes correct event data in row", () => {
    const event = { ...baseEvent, birds: [baseBird] };
    const csv = generateCsv([event]);
    expect(csv).toContain("Morning Walk");
    expect(csv).toContain("2024-03-01");
    expect(csv).toContain("Red-tailed Hawk");
    expect(csv).toContain("Central Park");
  });

  it("includes lat/lng when present", () => {
    const event = { ...baseEvent, birds: [baseBird] };
    const csv = generateCsv([event]);
    expect(csv).toContain("40.7851");
    expect(csv).toContain("-73.9683");
  });

  it("leaves lat/lng empty when null", () => {
    const bird = { ...baseBird, lat: null, lng: null };
    const event = { ...baseEvent, birds: [bird] };
    const csv = generateCsv([event]);
    const dataRow = csv.split("\n")[1];
    const cols = dataRow.split(",");
    // lat is col index 7, lng is col index 8
    expect(cols[7]).toBe("");
    expect(cols[8]).toBe("");
  });

  it("escapes commas in cell values", () => {
    const event = { ...baseEvent, title: "Walk, Run, Fly", birds: [] };
    const csv = generateCsv([event]);
    expect(csv).toContain('"Walk, Run, Fly"');
  });

  it("escapes double quotes in cell values", () => {
    const event = { ...baseEvent, title: 'Say "hello"', birds: [] };
    const csv = generateCsv([event]);
    expect(csv).toContain('"Say ""hello"""');
  });

  it("handles multiple events", () => {
    const event1 = { ...baseEvent, id: 1, birds: [baseBird] };
    const event2 = { ...baseEvent, id: 2, title: "Afternoon Stroll", birds: [] };
    const csv = generateCsv([event1, event2]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3); // header + bird row + empty event row
  });
});
