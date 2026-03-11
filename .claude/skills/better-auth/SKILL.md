---
name: better-auth
description: >
  Implements Better Auth authentication in a Next.js 16 project with email/password and Google social OAuth,
  using SQLite + Drizzle ORM. Use this skill whenever the user asks to implement authentication, add Better Auth,
  set up sign-in/sign-up, replace mock auth, add Google login, or configure an auth system in this project.
  Trigger even if the user says things like "hook up auth", "wire up login", or "make sign-in work".
---

# Better Auth Implementation

## Prerequisites

Fetch the latest Better Auth docs via DocsExplorer before writing any code if there is any uncertainty about APIs.

Required env vars (add to `.env` and `.env.example`):

```
BETTER_AUTH_SECRET=        # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 1 — Install

```bash
pnpm add better-auth
```

## Step 2 — Auth server config (`lib/auth.ts`)

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
```

## Step 3 — Generate and run DB schema

```bash
npx auth@latest generate   # outputs Drizzle schema additions
npx drizzle-kit generate   # create migration
npx drizzle-kit migrate    # apply to SQLite DB
```

Merge any generated schema into the existing `db/schema.ts`. The tables needed are: `user`, `session`, `account`, `verification`.

## Step 4 — API route handler (`app/api/auth/[...all]/route.ts`)

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

## Step 5 — Proxy (`proxy.ts` at project root)

Next.js 16 uses `proxy.ts` instead of `middleware.ts`. Use full session validation for sensitive routes:

```ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

For non-sensitive routes a lightweight cookie check avoids the DB round-trip:

```ts
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}
```

## Step 6 — Auth client (`lib/auth-client.ts`)

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});
```

## Step 7 — Server-side session helper

In Server Components and Server Actions:

```ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
```

## Client usage patterns

```ts
// Sign up
await authClient.signUp.email({ email, password, name });

// Sign in with email
await authClient.signIn.email({ email, password });

// Sign in with Google
await authClient.signIn.social({
  provider: "google",
  callbackURL: "/dashboard",
});

// Sign out
await authClient.signOut();

// React hook
const { data: session, isPending } = authClient.useSession();
```

## Google OAuth setup

Register the callback URL in Google Cloud Console:

- Dev: `http://localhost:3000/api/auth/callback/google`
- Prod: `https://<domain>/api/auth/callback/google`

## Docker notes

- The SQLite DB path must be a volume-mounted path so it persists between container restarts.
- All env vars must be passed through `docker-compose.yml` or `.env` file at container runtime.
- `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` should reflect the public-facing URL, not `localhost`, in production.

## Code style reminders

- No emojis in any output
- Strict TypeScript — no `any`, no non-null assertions except for required env vars
- Server Components by default; only use `"use client"` where auth client hooks are needed
- Keep auth logic in `lib/` — no auth code in UI components directly
