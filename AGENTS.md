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

### BRD-3 - Better Auth (complete, PR #4)

Replaced mock auth with Better Auth. Email/password + Google OAuth. New /signup page. DB schema updated with Better Auth tables. Startup migration via scripts/migrate.ts.
