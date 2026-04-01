# Bird Cage

## Overview

This is an application used by serious birding enthusiasts to track the birds they encounter at each outing. The user can enter a description of the bird into an AI chat to determine the type and species of the bird. In a future update the user will be able to add photo of the bird and the AI will determine the type and species.

## Development process

When instructed to build a feature:

1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your ai-chat skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
This is a full stack application built in Next.js 16.
The database should use SQLLite with Drizzle ORM and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
The authentication currently has a mock auth system but will use Better Auth in future.
Always use server side authentication. Do not implement client side authentication unless told specifically to do so.
All server pages, actions, routes and data access layers should be implemented with server authentication.
React.FormEvent is deprecated, if using in a Form to handle event, use React.SubmitEvent.
-example:

```tsx
function handleSubmit(e: React.SubmitEven) {
  e.preventDefault();
  //...rest of function
}
```

## Color Scheme

- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation Status

### BRD-6 - Docker Setup (complete, PR #5)

Multi-stage Dockerfile with standalone Next.js output. Lazy DB connection fix for build-time SQLITE_BUSY. Entrypoint runs Drizzle migrations on startup so DB is created fresh each container run. `docker-compose.yml` wires all env vars. `next.config.ts` added with `output: "standalone"`.

### BRD-9 - Seed Database for Dev (complete, PR #6)

Adds `scripts/seed.ts` that clears all data and re-seeds 4 test users (Alice, Bob, Carol, David) each with 2 birding events and multiple bird sightings. Uses `auth.api.signUpEmail()` for proper Better Auth password hashing. All users share password `password1234`. Run with `pnpm db:seed`.

### BRD-12 - AI Chat UI Updates (complete, PR #8)

Moved `BirdChatWidget` to the top of each bird sighting card so users can identify without scrolling. Removed `useEffect` auto-scroll. `parseIdentification` now extracts the AI summary text before the JSON block and returns it as `summary`. The `onIdentified` callback now also auto-populates the bird sighting `notes` field with the AI summary.

### BRD-13 - Fix Vitest ERR_REQUIRE_ESM (complete, PR #9)

Renamed `vitest.config.ts` to `vitest.config.mts` to force ESM loading. Root cause: vitest@4.x depends on `std-env@4.0.0` (ESM-only); vite@7 was loading the config as CJS and calling `require()` on it. All 17 unit tests pass.

### BRD-10 - Improve Editing of Events and Bird Sightings (complete, PR #10)

Events can now be created without bird sightings (birds optional, form starts empty). Dashboard cards have Edit, Delete, and Add Bird actions on all three views (Timeline, Species, Location). Edit navigates to `/events/[id]/edit`, Add Bird to `/events/[id]/add-bird`. Delete uses a CSS-modules confirmation dialog. Individual bird sightings can also be deleted. New DAL layer (`src/lib/dal/events.ts`) fixes a security bug where all users' birds were fetched. PUT is wrapped in a Drizzle transaction for atomicity.

### BRD-16 - Fix Dialog UI Issues (complete, PR #11)

Added `position: static` to `.dialog` in `ConfirmDialog.module.css`. Root cause: HTML `<dialog>` defaults to `position: absolute`, bypassing the backdrop's flexbox centering and rendering the dialog at the far left. The fix makes it participate in flex layout and center correctly on screen.

### BRD-21 - Improve Bird Record UX (complete, PR #12)

View button added to each bird record card on the dashboard (next to Delete), linking to `/birds/[id]/edit`. New server-authenticated `/birds/[id]/edit` page with `BirdEditForm` client component for viewing and updating all sighting fields (no AI chat). `PUT /api/birds/[id]` route added with ownership verification and required-field validation. `getBirdEntry` DAL function added with user ownership enforcement. `BirdChatWidget` hidden in `EventForm` when editing (`{!isEdit && ...}`).

### BRD-31 - Bird Edit from Event Edit Page (complete, PR #13)

Edit link added to each bird sighting card on the event edit page, navigating to `/birds/[id]/edit?from=/events/[eventId]/edit`. `BirdEditPage` reads the `?from=` search param and passes it as `returnTo` to `BirdEditForm`. Both Cancel and on-save redirect use `returnTo`, defaulting to `/dashboard` when no param is present.

### BRD-5 - Improve UX with Location Identification and UI (complete, PR #14)

"Use my location" button added to `AddBirdForm` — calls browser Geolocation API and autofills lat/lng only when fields are blank; does not trigger on edit. In the dashboard Location tab, a Map button (dark green, `#2c6e49`) is conditionally shown per bird record when coordinates are present; clicking it opens an embedded OpenStreetMap iframe in an in-app `MapDialog` dialog. New `MapDialog` component and 8 unit tests added (33 total passing).

### BRD-15 - Bird Identification by Photo (complete, PR #15)

Photo upload added to `AddBirdForm` and `BirdEditForm`. `POST /api/uploads` saves files to filesystem (`UPLOAD_DIR` env, default `./uploads/`); `GET /api/uploads/[filename]` serves them with canonical path check and `nosniff` headers. `POST /api/identify-photo` base64-encodes the image and sends it to `openai/gpt-4o` via OpenRouter, parsing the response with `parseIdentification`. On success the chat widget is hidden and type/species/notes are auto-populated. `photo_path` nullable column added to `bird_entries` via migration `0002_add_photo_path.sql`. All 3 dashboard views show a 48px inline thumbnail or a "No Photo" placeholder. 7 new unit tests (40 total).

### BRD-52 - UI Improvement with Logo and Buttons (complete, PR #16)

Installed `lucide-react`. Added `logo.svg` to dashboard nav bar and `logo-text.svg` to sign-in/sign-up pages via Next.js `Image`. Added `Bird` icon to View and Delete buttons in `BirdActions`, Add Bird button in `EventActions`. Added `CalendarPlus` icon to New Event button and `Calendar` icon to event Edit and Delete buttons. Button CSS updated to `inline-flex` for icon alignment.

### BRD-46 - Drag-and-Drop Photo Upload (complete, PR #21)

Drag-and-drop photo upload added to `AddBirdForm` and `BirdEditForm`. Users can drag an image onto the upload area or click to browse. Existing file-upload and photo-identification flow unchanged.

### BRD-43 - Missing Photo Upload and Use Location on Bird Form (complete, PR #17)

Photo upload section and "Use My Location" button added to `EventForm` inline bird cards (new event flow). `BirdEditForm` now shows "Use My Location" only when lat/lng fields are blank. `POST /api/events` updated to persist `photoPath` for inline birds. `deleteUploadedFile` helper added to `uploads.ts`; called in `DELETE /api/birds/[id]`, `DELETE /api/events/[id]`, and `PUT /api/events/[id]` to clean up photo files when records are removed. 4 new unit tests (44 total).

### BRD-60 - Review for Production and Create Plan for Changes (complete)

Full codebase audit for Vercel production readiness. Documented Vercel deployment requirements, planned migration from SQLite to Turso (libSQL), reviewed Better Auth configuration needs, and compiled a detailed production readiness report covering env vars, DB changes, and auth setup.

### BRD-66 - Create Skill to set up and use Resend for emails (complete)

Created a reusable `resend` skill for agents to install and configure Resend email service in Next.js projects. Covers package installation, API key setup, React Email templates, and transactional email sending via Next.js API routes.

### BRD-69 - Finish BetterAuth Email Verification (complete)

Email verification flow completed using Resend. `nextCookies()` plugin added to `auth.ts` for server-side cookie handling. Signup and login converted from client-side `authClient` to server actions (`app/signup/actions.ts`, `app/login/actions.ts`) calling `auth.api.signUpEmail()` / `auth.api.signInEmail()`. Unverified users redirected to `/verify-email` page with resend option. `auth-client.ts` simplified — now only used for Google OAuth and `useSession()`.

### BRD-3 - Better Auth (complete, PR #4)

Replaced mock auth with Better Auth. Email/password + Google OAuth. New /signup page. DB schema updated with Better Auth tables. Startup migration via scripts/migrate.ts.
