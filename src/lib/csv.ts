import type { BirdingEvent, BirdEntry } from "@/db/schema";

type EventWithBirds = BirdingEvent & { birds: BirdEntry[] };

export function generateCsv(events: EventWithBirds[]): string {
  const rows: string[][] = [];

  rows.push([
    "Event ID",
    "Event Title",
    "Event Date",
    "Event Notes",
    "Bird Type",
    "Bird Species",
    "Location Name",
    "Latitude",
    "Longitude",
    "Bird Date",
    "Bird Notes",
  ]);

  for (const event of events) {
    if (event.birds.length === 0) {
      rows.push([
        String(event.id),
        event.title,
        event.date,
        event.notes ?? "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    } else {
      for (const bird of event.birds) {
        rows.push([
          String(event.id),
          event.title,
          event.date,
          event.notes ?? "",
          bird.type,
          bird.species,
          bird.locationName,
          bird.lat != null ? String(bird.lat) : "",
          bird.lng != null ? String(bird.lng) : "",
          bird.dateStamp,
          bird.notes ?? "",
        ]);
      }
    }
  }

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
