# Bird Cage — Domain Context

## Purpose

Bird Cage is a birding journal application. Users record birding outings, log individual bird sightings within each outing, and use an AI assistant to identify birds from text descriptions or photos.

---

## Glossary

### Core birding concepts

| Term | Definition | Avoid |
|------|-----------|-------|
| **birding event** | A single outing during which one or more birds are observed. Has a date, title, and optional notes. | "session", "trip", "log" |
| **bird entry** | A single bird sighting recorded within a birding event. Has type, species, optional location and photo. | "bird record", "sighting record", "observation" |
| **type** | Broad classification of a bird (e.g. Raptor, Songbird, Waterfowl). | "category", "class" |
| **species** | The specific bird name within a type (e.g. Red-tailed Hawk). Common name preferred in UI. | "name", "bird name" |
| **Birdy** | The AI assistant persona. Friendly, knowledgeable birding companion. | "the AI", "the bot", "the assistant" |

### AI identification concepts

| Term | Definition | Avoid |
|------|-----------|-------|
| **text identification** | Identifying a bird from a user's text description via Birdy Chat. Free-tier feature. | "chat identification", "description-based ID" |
| **photo identification** | Identifying a bird from an uploaded image using a vision model. Paid-tier feature. | "image identification", "vision ID" |
| **identification result** | Structured output `{ type, species, summary }` returned by both identification paths. | "AI response", "parsed result" |

### Billing concepts

| Term | Definition | Avoid |
|------|-----------|-------|
| **billing plan** | The user's current tier: `free` or `paid`. | "subscription tier", "plan level" |
| **subscription** | A Stripe recurring charge granting paid-plan access. | "membership", "recurring plan" |
| **extra usage** | One-time Stripe purchase of additional AI credits (cents). | "top-up", "credits" |
| **drain state** | When a user cancels their subscription but retains paid access until extra usage is exhausted. | "grace period", "wind-down" |
| **spending limit** | The maximum `currentMonthUsageCents` a user may accumulate before AI calls are blocked. | "budget cap", "usage cap" |

---

## Domain model

```
User
 ├── billingPlan (free | paid)
 ├── role (user | admin)
 ├── BirdingEvent[]
 │    └── BirdEntry[]
 │         ├── type
 │         ├── species
 │         ├── location (lat, lng, locationName)
 │         └── photoPath | photoData
 ├── BirdyChat[]
 │    └── BirdyChatMessage[]
 └── UsageLog[]
```

---

## Invariants

- A **bird entry** always belongs to a **birding event** which belongs to the same user. Cross-user access is never permitted.
- **Photo identification** is gated: only available to `paid` plan users and `admin` users.
- **Admins** bypass all billing limits and always have paid-tier access.
- All database calls go through the `/src/lib/dal/` layer — never query the DB directly from a route or component.
- All routes and server actions enforce server-side authentication before any data access.

---

## Boundaries

| Area | Responsibility |
|------|---------------|
| `src/lib/dal/` | All database reads and writes, with owner enforcement |
| `src/app/api/` | HTTP boundary — auth checks, billing gates, input validation |
| `src/lib/billing.ts` | All billing logic and model selection based on plan |
| `src/lib/chat.ts` | AI response parsing (`parseIdentification`) |
| `src/db/schema.ts` | Authoritative source of truth for entity shapes |
