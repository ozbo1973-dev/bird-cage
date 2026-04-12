"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { BirdEntry } from "@/db/schema";
import type { EventWithBirds } from "@/lib/dal/events";
import EventActions from "./EventActions";
import BirdActions from "./BirdActions";
import MapDialog from "./MapDialog";
import styles from "./DashboardTabs.module.css";

interface Props {
  view: string;
  events: EventWithBirds[];
}

export default function DashboardTabs({ view, events }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function setView(v: string) {
    router.push(`${pathname}?view=${v}`);
  }

  return (
    <div>
      <div className={styles.tabs} role="tablist">
        {["timeline", "species", "location"].map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={view === tab}
            onClick={() => setView(tab)}
            className={`${styles.tab} ${view === tab ? styles.active : ""}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {events.length === 0 ? (
          <div className={styles.empty}>
            <svg className={styles.emptyBird} viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <ellipse cx="55" cy="48" rx="22" ry="16" fill="#e8f4fb" stroke="#209dd7" strokeWidth="1.5"/>
              <circle cx="72" cy="36" r="11" fill="#e8f4fb" stroke="#209dd7" strokeWidth="1.5"/>
              <polygon points="83,35 92,37 83,39" fill="#ecad0a" stroke="#c8920a" strokeWidth="0.8"/>
              <circle cx="75" cy="33" r="2" fill="#032147"/>
              <circle cx="75.7" cy="32.3" r="0.7" fill="white"/>
              <path d="M33 48 C28 42 20 44 16 50" stroke="#209dd7" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <path d="M38 52 C32 50 24 54 22 60" stroke="#209dd7" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <path d="M48 62 C46 68 50 72 55 70" stroke="#032147" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
              <path d="M62 62 C64 68 60 72 55 70" stroke="#032147" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
              <path d="M10 65 Q30 60 50 63 Q70 66 90 62 Q105 59 110 62" stroke="#c8d8e4" strokeWidth="1" fill="none" strokeDasharray="3 3"/>
            </svg>
            <h3 className={styles.emptyTitle}>No birding events yet</h3>
            <p className={styles.emptySubtitle}>Start logging your outings and let AI identify the birds you encounter.</p>
            <p className={styles.emptyHint}>Click <strong>New Event</strong> in the header to get started.</p>
          </div>
        ) : (
          <>
            {view === "timeline" && <TimelineView events={events} />}
            {view === "species" && <SpeciesView events={events} />}
            {view === "location" && <LocationView events={events} />}
          </>
        )}
      </div>
    </div>
  );
}

function TimelineView({ events }: { events: EventWithBirds[] }) {
  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className={styles.list}>
      {sorted.map((event) => (
        <div key={event.id} className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{event.title}</h2>
            <span className={styles.date}>{event.date}</span>
          </div>
          {event.notes && <p className={styles.notes}>{event.notes}</p>}
          {event.birds.length > 0 && (
            <ul className={styles.birdList}>
              {event.birds.map((bird) => (
                <li key={bird.id} className={styles.birdItem}>
                  {bird.photoData || bird.photoPath
                    ? <img src={bird.photoData ?? `/api/uploads/${bird.photoPath}`} alt={bird.species} className={styles.birdThumb} />
                    : <div className={styles.noPhoto}>No Photo</div>}
                  <div className={styles.birdItemInfo}>
                    <span className={styles.birdName}>{bird.species}</span>
                    <span className={styles.birdMeta}>{bird.type} · {bird.locationName}</span>
                  </div>
                  <BirdActions birdId={bird.id} birdSpecies={bird.species} />
                </li>
              ))}
            </ul>
          )}
          <EventActions eventId={event.id} eventTitle={event.title} />
        </div>
      ))}
    </div>
  );
}

function SpeciesView({ events }: { events: EventWithBirds[] }) {
  const speciesMap = new Map<string, { bird: BirdEntry; eventTitle: string; eventDate: string }[]>();
  for (const event of events) {
    for (const bird of event.birds) {
      const key = `${bird.type} / ${bird.species}`;
      if (!speciesMap.has(key)) speciesMap.set(key, []);
      speciesMap.get(key)!.push({ bird, eventTitle: event.title, eventDate: event.date });
    }
  }
  const sorted = [...speciesMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  if (sorted.length === 0) {
    return <p className={styles.emptyMsg}>No bird entries recorded yet.</p>;
  }

  return (
    <div className={styles.list}>
      {sorted.map(([key, entries]) => (
        <div key={key} className={styles.card}>
          <h2 className={styles.cardTitle}>{key}</h2>
          <ul className={styles.birdList}>
            {entries.map(({ bird, eventTitle, eventDate }) => (
              <li key={bird.id} className={styles.birdItem}>
                {bird.photoData || bird.photoPath
                  ? <img src={bird.photoData ?? `/api/uploads/${bird.photoPath}`} alt={bird.species} className={styles.birdThumb} />
                  : <div className={styles.noPhoto}>No Photo</div>}
                <div className={styles.birdItemInfo}>
                  <span className={styles.birdName}>{eventTitle}</span>
                  <span className={styles.birdMeta}>{eventDate} · {bird.locationName}</span>
                  {bird.notes && <span className={styles.birdNotes}>{bird.notes}</span>}
                </div>
                <BirdActions birdId={bird.id} birdSpecies={bird.species} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function LocationView({ events }: { events: EventWithBirds[] }) {
  const [mapBird, setMapBird] = useState<BirdEntry | null>(null);

  const locationMap = new Map<string, { bird: BirdEntry; eventTitle: string; eventDate: string }[]>();
  for (const event of events) {
    for (const bird of event.birds) {
      const key = bird.locationName;
      if (!locationMap.has(key)) locationMap.set(key, []);
      locationMap.get(key)!.push({ bird, eventTitle: event.title, eventDate: event.date });
    }
  }
  const sorted = [...locationMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  if (sorted.length === 0) {
    return <p className={styles.emptyMsg}>No bird entries recorded yet.</p>;
  }

  return (
    <>
      <div className={styles.list}>
        {sorted.map(([location, entries]) => (
          <div key={location} className={styles.card}>
            <h2 className={styles.cardTitle}>{location}</h2>
            <ul className={styles.birdList}>
              {entries.map(({ bird, eventTitle, eventDate }) => (
                <li key={bird.id} className={styles.birdItem}>
                  {bird.photoData || bird.photoPath
                    ? <img src={bird.photoData ?? `/api/uploads/${bird.photoPath}`} alt={bird.species} className={styles.birdThumb} />
                    : <div className={styles.noPhoto}>No Photo</div>}
                  <div className={styles.birdItemInfo}>
                    <span className={styles.birdName}>{bird.species} ({bird.type})</span>
                    <span className={styles.birdMeta}>{eventTitle} · {eventDate}</span>
                    {bird.lat != null && bird.lng != null && (
                      <span className={styles.birdMeta}>
                        {bird.lat.toFixed(4)}, {bird.lng.toFixed(4)}
                      </span>
                    )}
                  </div>
                  <div className={styles.birdActions}>
                    {bird.lat != null && bird.lng != null && (
                      <button
                        type="button"
                        onClick={() => setMapBird(bird)}
                        className={styles.mapBtn}
                      >
                        Map
                      </button>
                    )}
                    <BirdActions birdId={bird.id} birdSpecies={bird.species} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {mapBird?.lat != null && mapBird?.lng != null && (
        <MapDialog
          open={true}
          lat={mapBird.lat}
          lng={mapBird.lng}
          label={`${mapBird.species} — ${mapBird.locationName}`}
          onClose={() => setMapBird(null)}
        />
      )}
    </>
  );
}
