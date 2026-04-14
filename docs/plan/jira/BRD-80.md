# BRD-80 - Add Billing with Stripe for AI usage

Implement Stripe-based billing with monthly spending limits, subscription management, and usage-gated model access.

## Implementation Steps

### 1. Install and Configure Stripe

Use the `stripe` skill to install the Stripe npm package, configure API keys (.env.local), and set up webhook signing secret. Add `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET` to environment variables.

### 2. Extend Database Schema

Add three new columns to the `users` table via Drizzle migration:
- `spending_limit_cents` (integer, nullable, default null = no limit set)
- `current_month_usage_cents` (integer, default 0)
- `subscription_status` (text: "active", "canceled", or "paused")
- `stripe_customer_id` (text, nullable, unique)
- `stripe_subscription_id` (text, nullable)

Create a new `usage_logs` table with columns: `id`, `user_id`, `model_used`, `cost_cents`, `created_at`, indexed on `(user_id, created_at)` for efficient monthly aggregation.

### 3. Create Stripe Customer and Subscription DAL Functions

Add functions to `src/lib/dal/billing.ts`:
- `createStripeCustomer(userId, email)` — creates Stripe Customer and stores `stripe_customer_id`
- `createSubscription(userId, priceId)` — creates a Stripe Subscription (recurring monthly) and stores `stripe_subscription_id`
- `cancelSubscription(userId)` — cancels the user's subscription in Stripe and updates `subscription_status` to "canceled"
- `updateSpendingLimit(userId, limitCents)` — updates `spending_limit_cents` in the users table
- `logUsage(userId, modelUsed, costCents)` — inserts a row into `usage_logs`
- `getCurrentMonthUsage(userId)` — sums `usage_logs` for the current calendar month
- `isLimitReached(userId)` — returns true if current month usage >= spending_limit

### 4. Create Stripe Checkout Session API Route

Add `POST /api/billing/checkout-session` authenticated endpoint that:
- Verifies user is authenticated and has not already subscribed
- Retrieves or creates the user's Stripe Customer ID
- Creates a Checkout Session with the monthly price ID
- Returns the session ID to the client for redirect to Stripe Checkout

### 5. Implement Webhook Handler for Stripe Events

Add `POST /api/webhooks/stripe` endpoint to:
- Verify webhook signature using `stripe_webhook_secret`
- Handle `customer.subscription.created` — set `subscription_status` to "active"
- Handle `customer.subscription.deleted` — set `subscription_status` to "canceled"
- Handle `invoice.payment_failed` — set `subscription_status` to "paused" (optional: notify user)
- Idempotently update the database for each event type

### 6. Add Billing Page Before Event Creation

Create `src/app/billing/page.tsx` (post-verification, pre-event-creation gate) that displays:
- Current subscription status (active, canceled, or not yet set up)
- Monthly spending limit input field (in cents or dollars with conversion)
- Stripe Checkout button ("Subscribe Now") — only shown if no active subscription
- Resubscribe button — shown if subscription is canceled
- Text explaining the billing model (paid users can use paid OpenRouter models; free tier only if limit reached)

This page redirects authenticated but non-paying users before they reach `/dashboard`.

### 7. Integrate Usage Tracking in AI Chat and Photo Identify

Identify all endpoints that call OpenRouter (chat and photo identify). After each successful API call:
- Extract the model used and cost from the response
- Call `logUsage(userId, model, costCents)` via a DAL function
- Check `isLimitReached(userId)` — if true, return a flag in the response to disable further paid-model requests

### 8. Gate Model Selection by Spending Limit

Modify the LLM model selection logic:
- If user has no spending limit set, allow all paid models (behavior unchanged)
- If user has a limit and has not reached it, allow all paid models
- If user has reached their limit, fall back to free OpenRouter model only
- Store a flag in the user session or fetch it on each request to determine available models

### 9. Hide and Disable Photo Identify Feature

In `AddBirdForm` and `BirdEditForm`:
- Fetch the user's current spending status via a new DAL function `getUserBillingStatus(userId)`
- If the user's limit is reached, hide the photo upload section entirely and display a message: "Photo identification is only available with an active paid subscription."
- If limit not yet reached or no limit set, show photo upload as normal

### 10. Add Billing Management to Profile Page

Extend `/app/dashboard/profile/page.tsx` with a "Billing" section that shows:
- Current subscription status (Active, Canceled, or Not Set Up)
- Current monthly spending limit
- Current month usage (in cents or formatted as currency)
- Input field to update spending limit with a "Save Limit" button
- "Cancel Subscription" button (if status is Active) — calls a server action to cancel
- "Resubscribe" button (if status is Canceled) — redirects to checkout

Use a server action `app/dashboard/profile/actions.ts` to handle subscription cancellations and limit updates with proper authorization.

### 11. Create Usage Summary Component for Dashboard

Add a small widget to the dashboard showing:
- Current month spending vs. limit (e.g., "$3.50 of $5.00")
- Percentage bar (red when limit approaching)
- Call-to-action link to `/dashboard/profile` for billing management

### 12. Reset Monthly Usage on Renewal

Set up a scheduled task (cron job via a background service or manual trigger) to reset `current_month_usage_cents` to 0 on the 1st of each month. For initial release, document a manual process or use a utility endpoint protected by an admin API key.

## Acceptance Criteria

- Stripe integration is fully configured with API keys in environment
- Users can create a Stripe Customer and subscribe to a monthly billing plan via Checkout
- Monthly spending limit is persisted and editable on the profile page
- Usage is logged to the database on each AI chat and photo identify call
- When spending limit is reached, only free OpenRouter models are available
- Photo identify feature is hidden and disabled when limit is reached
- Subscription can be canceled and resubscribed from the profile page
- Webhook handler correctly updates subscription status on Stripe events
- All new DAL functions are tested with unit tests
- Profile page displays current month usage and spending limit
