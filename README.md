# Bird Cage

Application for identifying and tracking your birds. For serious birders only.

## Features

- **Mock authentication** — demo login (username: `demo`, password: `password`)
- **Dashboard** with three views: Timeline, Species, Location
- **Create birding events** with multiple bird sightings per event
- **Bird fields**: type, species, location name, optional GPS coordinates, date, notes
- **CSV export** of all events and bird entries

## Tech Stack

- [Next.js 16](https://nextjs.org/) — App Router
- [Drizzle ORM](https://orm.drizzle.team/) + SQLite (`better-sqlite3`)
- CSS Modules
- [Vitest](https://vitest.dev/) — unit tests
- [Playwright](https://playwright.dev/) — E2E tests

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with `demo` / `password`.

## Testing

```bash
# Unit tests
npm test

# E2E tests (requires dev server or starts automatically)
npm run test:e2e
```

## Deployment (Vercel)

Deploy via the [Vercel platform](https://vercel.com/).

> **Note:** SQLite is a local file database. For production Vercel deployments, consider using [Turso](https://turso.tech/) (libSQL-compatible, works with Drizzle) or another hosted database.
