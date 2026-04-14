---
name: stripe
description: >
  Implement Stripe payments, subscriptions, and billing in Next.js projects.
  Use this skill whenever the user wants to add payments, set up a billing page,
  integrate Stripe Checkout, handle subscriptions, manage webhooks, sync subscription
  status to the database, or configure Stripe for development or production.
  Also use this when the user asks about Stripe API usage, idempotency, webhook
  signature verification, or gating features behind a paid plan.
---

# Stripe Integration Skill

## Overview

This skill covers end-to-end Stripe integration in a Next.js 16 / TypeScript / pnpm project:
- One-time payments and subscriptions via Stripe Checkout
- Webhook handling with signature verification
- Subscription lifecycle management (create, renew, cancel, fail)
- Database sync for subscription status
- Dev and production environment setup

Read `references/stripe-patterns.md` for detailed code patterns and examples.

---

## 1. Installation

```bash
pnpm add stripe @stripe/stripe-js
```

- `stripe` — Node.js server-side SDK
- `@stripe/stripe-js` — Client-side Stripe.js (lazy-loads from Stripe CDN)

---

## 2. Environment Variables

`.env.local` (development — use Stripe test keys):
```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # from `stripe listen` output or Dashboard
```

`.env.production` (live keys):
```env
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...   # from Dashboard webhook endpoint
```

**Rules:**
- `STRIPE_SECRET_KEY` — server only, never expose to client
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — safe to expose, prefixed `NEXT_PUBLIC_`
- `STRIPE_WEBHOOK_SECRET` — server only

---

## 3. Stripe Client Singleton

`src/lib/stripe.ts`:
```ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
  typescript: true,
});
```

Use the latest API version (`2025-06-30.basil`). Import this singleton wherever server-side Stripe calls are needed.

---

## 4. Checkout Session (Subscription)

Create a Route Handler — not a server action — because Stripe redirects require a 303 response:

`src/app/api/checkout/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSession } from '@/lib/auth'; // your auth helper

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL!;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: session.user.email,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${origin}/billing?success=true`,
    cancel_url: `${origin}/billing?canceled=true`,
    metadata: { userId: session.user.id },
  });

  return NextResponse.redirect(checkoutSession.url!, 303);
}
```

For one-time payments change `mode: 'payment'`.

---

## 5. Webhooks

Webhooks are the source of truth for subscription state. **Never trust client-side redirects alone.**

### Local development
```bash
# Install Stripe CLI (once)
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the webhook secret printed (whsec_...) into .env.local
```

### Webhook route

`src/app/api/webhooks/stripe/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { handleStripeEvent } from '@/lib/stripe-handlers';

// CRITICAL: disable body parsing — Stripe needs raw bytes for signature check
export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  await handleStripeEvent(event);
  return NextResponse.json({ received: true });
}
```

> **Next.js App Router note:** Use `req.text()` (not `req.json()`) to get the raw body. The App Router does not pre-parse bodies, so this works without extra config.

---

## 6. Subscription Event Handlers

`src/lib/stripe-handlers.ts`:
```ts
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;
      await db.update(users)
        .set({ billingPlan: 'paid', stripeCustomerId: session.customer as string })
        .where(eq(users.id, userId));
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscription(sub);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await db.update(users)
        .set({ billingPlan: 'free' })
        .where(eq(users.stripeCustomerId, sub.customer as string));
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      // Optionally email the customer or set plan to past_due
      console.warn('Payment failed for customer:', invoice.customer);
      break;
    }
  }
}

async function syncSubscription(sub: Stripe.Subscription) {
  const plan = sub.status === 'active' || sub.status === 'trialing' ? 'paid' : 'free';
  await db.update(users)
    .set({ billingPlan: plan, stripeSubscriptionId: sub.id })
    .where(eq(users.stripeCustomerId, sub.customer as string));
}
```

### Key events to handle

| Event | Action |
|---|---|
| `checkout.session.completed` | Grant access; save customer ID |
| `customer.subscription.updated` | Sync status (active, past_due, canceled) |
| `customer.subscription.deleted` | Revoke access; set plan to free |
| `invoice.paid` | Confirm renewal; extend access |
| `invoice.payment_failed` | Notify user; optionally downgrade |
| `customer.subscription.trial_will_end` | Remind user to add payment method |

---

## 7. Database Schema

Add to your Drizzle schema:
```ts
stripeCustomerId: text('stripe_customer_id'),
stripeSubscriptionId: text('stripe_subscription_id'),
billingPlan: text('billing_plan').default('free').notNull(), // 'free' | 'paid'
```

Then run a migration:
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

---

## 8. Gating Features

Server component / server action pattern:
```ts
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/dal/users';

export async function requirePaidPlan() {
  const session = await getSession();
  if (!session) redirect('/login');
  const user = await getUserById(session.user.id);
  if (user.billingPlan !== 'paid') redirect('/billing');
}
```

Admin bypass (from this project's convention):
```ts
if (user.role === 'admin') return; // admins always have paid access
```

---

## 9. Customer Portal (Manage Subscription)

Let users cancel/upgrade without you building a UI:

```ts
// src/app/api/billing-portal/route.ts
export async function POST(req: NextRequest) {
  const session = await getSession();
  const user = await getUserById(session!.user.id);

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId!,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  });

  return NextResponse.redirect(portalSession.url, 303);
}
```

---

## 10. Dev vs Production Checklist

### Development
- [ ] Use `sk_test_` and `pk_test_` keys
- [ ] Run `stripe listen` for local webhooks
- [ ] Use test card `4242 4242 4242 4242`, any future expiry, any CVC
- [ ] Use `stripe trigger checkout.session.completed` to test handlers without a real browser session

### Production
- [ ] Swap to `sk_live_` and `pk_live_` keys in Vercel/hosting env vars
- [ ] Register webhook endpoint in Stripe Dashboard → Webhooks → Add endpoint
- [ ] Set `STRIPE_WEBHOOK_SECRET` to the live `whsec_` from the dashboard endpoint
- [ ] Enable only the events you handle (reduces noise and latency)
- [ ] Test with a real card in live mode before launch

---

## 11. Security Rules

1. **Never log `STRIPE_SECRET_KEY`** or include it in client bundles.
2. **Always verify webhook signatures** — skip this and anyone can spoof events.
3. **Use `req.text()` for raw body** in the webhook route — parsed JSON breaks verification.
4. **Idempotency:** Check if you've already processed an event before acting. Either store processed event IDs or use Drizzle upsert logic keyed on `stripeCustomerId`.
5. **Use metadata** on checkout sessions to pass `userId` — don't rely on email matching alone.

---

## References

- Full code patterns and examples: `references/stripe-patterns.md`
- [Stripe Checkout quickstart (Next.js)](https://docs.stripe.com/checkout/quickstart?client=next)
- [Build a subscriptions integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions)
- [Webhook signature verification](https://docs.stripe.com/webhooks/signature)
- [Subscription webhook events](https://docs.stripe.com/billing/subscriptions/webhooks)
