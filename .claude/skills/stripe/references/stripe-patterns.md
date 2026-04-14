# Stripe Patterns Reference

## Table of Contents
1. [Stripe singleton setup](#1-stripe-singleton-setup)
2. [Products and prices via API](#2-products-and-prices-via-api)
3. [Checkout: one-time payment](#3-checkout-one-time-payment)
4. [Checkout: subscription](#4-checkout-subscription)
5. [Webhook raw body in Next.js App Router](#5-webhook-raw-body-in-nextjs-app-router)
6. [Idempotent event processing](#6-idempotent-event-processing)
7. [Retrieve subscription from customer ID](#7-retrieve-subscription-from-customer-id)
8. [Cancel a subscription server-side](#8-cancel-a-subscription-server-side)
9. [Test cards](#9-test-cards)

---

## 1. Stripe singleton setup

```ts
// src/lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
  typescript: true,
});
```

Import from here everywhere. Do not instantiate `new Stripe(...)` inline.

---

## 2. Products and prices via API

Prefer creating products/prices in the Stripe Dashboard and referencing their IDs via env vars. For seeding test data programmatically:

```ts
const product = await stripe.products.create({ name: 'Bird Cage Pro' });

const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 999,        // $9.99 in cents
  currency: 'usd',
  recurring: { interval: 'month' },
});

// Store price.id as STRIPE_PRICE_ID in .env
```

---

## 3. Checkout: one-time payment

```ts
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
  success_url: `${origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/pricing`,
  metadata: { userId },
});
return NextResponse.redirect(session.url!, 303);
```

---

## 4. Checkout: subscription

```ts
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer_email: user.email,
  line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
  success_url: `${origin}/billing?success=1`,
  cancel_url: `${origin}/billing`,
  metadata: { userId: user.id },
  subscription_data: {
    trial_period_days: 14,  // optional free trial
  },
});
return NextResponse.redirect(session.url!, 303);
```

---

## 5. Webhook raw body in Next.js App Router

```ts
// src/app/api/webhooks/stripe/route.ts
export async function POST(req: NextRequest) {
  // req.text() gives raw body string — required for signature verification
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  // handle event...
  return NextResponse.json({ received: true });
}
```

Do NOT call `req.json()` before this — it consumes the body and breaks verification.

---

## 6. Idempotent event processing

Option A: Check-then-act in the handler using DB upsert:
```ts
// upsert keyed on stripeCustomerId prevents double-processing
await db.insert(users)
  .values({ stripeCustomerId: customerId, billingPlan: 'paid' })
  .onConflictDoUpdate({
    target: users.stripeCustomerId,
    set: { billingPlan: 'paid' },
  });
```

Option B: Track processed event IDs:
```ts
const existing = await db.query.processedEvents.findFirst({
  where: eq(processedEvents.stripeEventId, event.id),
});
if (existing) return NextResponse.json({ received: true }); // already handled

await db.insert(processedEvents).values({ stripeEventId: event.id });
// ... proceed with handling
```

Option A is simpler for most cases. Option B is necessary if your handler has side effects beyond DB writes (e.g., sending emails).

---

## 7. Retrieve subscription from customer ID

```ts
const subscriptions = await stripe.subscriptions.list({
  customer: stripeCustomerId,
  status: 'active',
  limit: 1,
});
const sub = subscriptions.data[0];
```

---

## 8. Cancel a subscription server-side

```ts
// Cancel at period end (recommended — user keeps access until billing cycle ends)
await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true,
});

// Immediate cancellation
await stripe.subscriptions.cancel(subscriptionId);
```

After cancellation, `customer.subscription.deleted` webhook fires — your handler should downgrade the user.

---

## 9. Test cards

| Card number | Behavior |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |
| `4000 0000 0000 0002` | Always declined |

Use any future expiry date and any 3-digit CVC. For 3D Secure cards, enter `123456` when prompted.

Trigger test webhook events without going through checkout:
```bash
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```
