---
name: resend
description: >
  Install, configure, and integrate Resend email service into a Next.js 16 project with React Email
  templates. Use this skill whenever the user asks to send emails, set up transactional email,
  add email notifications, integrate Resend, create email templates, or send welcome/confirmation
  emails. Trigger even if the user says things like "send an email", "hook up email", "add email
  support", or "notify users by email".
---

# Resend Email Integration

A complete implementation guide for transactional email in Next.js 16 using:
- **Resend** — email delivery API
- **@react-email/components** — React components for HTML email templates
- **Next.js App Router** — server-side API route for sending

> **Before writing any code:** fetch the latest Resend docs via DocsExplorer if there is any uncertainty about APIs.
> Reference: https://resend.com/docs/send-with-nextjs

---

## Prerequisites

### Resend account setup

1. Create an account at [resend.com](https://resend.com)
2. Generate an API key at [resend.com/api-keys](https://resend.com/api-keys)
3. For production: verify your sending domain at [resend.com/domains](https://resend.com/domains)
   - Dev/testing: use `onboarding@resend.dev` (no verification needed)
   - Production: requires a verified domain (e.g. `noreply@yourdomain.com`)

### Environment variables

Add to `.env` and `.env.example`:

```env
# Resend email delivery
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
# Sender address — use onboarding@resend.dev for dev, verified address for production
RESEND_FROM_EMAIL=onboarding@resend.dev
```

---

## Step 1 — Install

```bash
pnpm add resend @react-email/components -E
```

> The `-E` flag pins exact versions — recommended by the React Email team to prevent breaking changes.

---

## Step 2 — Resend client (`lib/resend.ts`)

Create a reusable server-side client. Never import this in client components.

```typescript
// lib/resend.ts
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);
```

---

## Step 3 — Email template component

Place templates in `components/emails/`. Each template is a typed React component.

```typescript
// components/emails/welcome-email.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
} from "@react-email/components";

interface WelcomeEmailProps {
  name: string;
  actionUrl: string;
}

export function WelcomeEmail({ name, actionUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9f9f9" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
          <Heading>Welcome, {name}</Heading>
          <Text>Thanks for signing up. Click below to get started.</Text>
          <Button
            href={actionUrl}
            style={{ backgroundColor: "#753991", color: "#fff", padding: "12px 24px" }}
          >
            Get started
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

**Available components** (all from `@react-email/components`):
`Html`, `Head`, `Body`, `Preview`, `Container`, `Section`, `Column`, `Row`, `Heading`, `Text`, `Button`, `Link`, `Image`, `Divider`, `Font`, `Markdown`

---

## Step 4 — Send email from a Server Action

Call `resend.emails.send()` directly from a Server Action — pass the template as a direct function call. Do **not** use `React.createElement` or pass templates through a JSON API route (React elements are not JSON-serializable).

```typescript
// app/actions/send-welcome.ts
"use server";

import { resend } from "@/lib/resend";
import { WelcomeEmail } from "@/components/emails/welcome-email";

export async function sendWelcomeEmail(to: string, name: string) {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: "Welcome to Bird Cage",
    react: WelcomeEmail({
      name,
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }),
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data?.id;
}
```

### Calling from a Server Component or API route

```typescript
import { sendWelcomeEmail } from "@/app/actions/send-welcome";

// After user registration:
await sendWelcomeEmail(user.email, user.name);
```

---

## Step 5 — Adding additional email types

For each new email type (password reset, confirmation, notification):

1. Create a new template in `components/emails/` following the pattern in Step 3
2. Create a new Server Action in `app/actions/` following the pattern in Step 4
3. Call the action from the relevant Server Component, API route, or Server Action

No changes to the Resend client are needed.

---

## Step 6 — next.config.ts (if needed)

If you encounter module resolution errors with `@react-email/components`, add it to `serverExternalPackages` (top-level in Next.js 15+, not under `experimental`):

```typescript
// next.config.ts
const nextConfig = {
  serverExternalPackages: ["@react-email/components"],
};

export default nextConfig;
```

---

## Environment variable reference

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | Yes | API key from resend.com/api-keys |
| `RESEND_FROM_EMAIL` | Yes | Sender address — `onboarding@resend.dev` for dev, verified address for production |
| `NEXT_PUBLIC_APP_URL` | Recommended | Used to build absolute URLs in email templates |

Add all to `.env` (local) and your production environment (Vercel, Docker, etc.).

---

## Production deployment checklist

- [ ] Verify sending domain at [resend.com/domains](https://resend.com/domains)
- [ ] Update `RESEND_FROM_EMAIL` from `onboarding@resend.dev` to `noreply@yourdomain.com`
- [ ] Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to Vercel env vars (or `docker-compose.yml`)
- [ ] Confirm `NEXT_PUBLIC_APP_URL` points to the production domain
- [ ] Test with a real inbox before launch (Resend provides a test mode)

---

## Common pitfalls

| Problem | Fix |
|---|---|
| `RESEND_FROM_EMAIL` rejected in production | Verify your domain at resend.com/domains and update `RESEND_FROM_EMAIL` to use that domain |
| `RESEND_API_KEY` exposed to client | Never prefix with `NEXT_PUBLIC_` — keep server-side only |
| `error` is null but email not received | Check the Resend dashboard logs; `data.id` confirms delivery acceptance, not inbox delivery |
| Module resolution error with react-email | Add `@react-email/components` to `serverExternalPackages` in `next.config.ts` (see Step 6) |
| SDK throws instead of returning error | The Resend SDK uses a result pattern `{ data, error }` — check `error` first, do not rely on try/catch as the primary error path |
| React Email component renders blank | Ensure the component returns `<Html>` as root with `<Head />` and `<Body>` |
| Sending to unverified recipients in test | Use `delivered@resend.dev` as a safe test recipient that always succeeds |

---

## References

- [Resend — Send with Next.js](https://resend.com/docs/send-with-nextjs)
- [Resend — API reference: send email](https://resend.com/docs/api-reference/emails/send-email)
- [React Email — component reference](https://react.email/docs/introduction)
- [Resend — domain verification](https://resend.com/docs/dashboard/domains/introduction)
