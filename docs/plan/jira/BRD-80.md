# BRD-80 - Add Billing with Stripe for AI Usage

Implement Stripe-based billing with monthly spending limits, subscription management, and usage-gated model access.

## Implementation Steps

### 1. Install and Configure Stripe

Use the `stripe` skill to install the Stripe npm package, configure API keys (.env.local), and set up webhook signing secret. Add `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET` to environment variables.

### 2. Extend Database Schema

Add new columns to the `users` table via Drizzle migration:
- `spending_limit_cents` (integer, nullable, default null)
- `current_month_usage_cents` (integer, default 0)
- `subscription_status` (text: "active", "canceled", or "paused")
- `stripe_customer_id` (text, nullable, unique)
- `stripe_subscription_id` (text, nullable)

Create a new `usage_logs` table: `id`, `user_id`, `model_used`, `cost_cents`, `created_at`, indexed on `(user_id, created_at)`.

### 3. Create Stripe Customer and Subscription DAL Functions

Add functions to `src/lib/dal/billing.ts`:
- `createStripeCustomer(userId, email)`
- `createSubscription(userId, priceId)`
- `cancelSubscription(userId)`
- `updateSpendingLimit(userId, limitCents)`
- `logUsage(userId, modelUsed, costCents)`
- `getCurrentMonthUsage(userId)`
- `isLimitReached(userId)`

### 4. Create Stripe Checkout Session API Route

Add `POST /api/billing/checkout-session` — creates a Checkout Session and returns the session ID for redirect to Stripe Checkout.

### 5. Implement Webhook Handler for Stripe Events

Add `POST /api/webhooks/stripe` to handle:
- `customer.subscription.created` → set status "active"
- `customer.subscription.deleted` → set status "canceled"
- `invoice.payment_failed` → set status "paused"

### 6. Add Billing Page

Create `src/app/billing/page.tsx` with subscription status, spending limit input, Subscribe/Resubscribe buttons.

### 7. Integrate Usage Tracking in AI Chat and Photo Identify

Log usage after each successful OpenRouter API call. Check `isLimitReached` and return flag to client when limit is hit.

### 8. Gate Model Selection by Spending Limit

Fall back to free OpenRouter model when spending limit is reached.

### 9. Hide and Disable Photo Identify Feature

Hide photo upload section in `AddBirdForm` and `BirdEditForm` when limit is reached.

### 10. Add Billing Management to Profile Page

Add "Billing" section to `/app/dashboard/profile/page.tsx`: subscription status, usage vs limit, update limit, cancel/resubscribe.

### 11. Create Usage Summary Component for Dashboard

Small widget showing current month spending vs limit with a progress bar.

### 12. Reset Monthly Usage on Renewal

Document or implement a monthly reset mechanism for `current_month_usage_cents`.

## Acceptance Criteria

- [ ] Stripe integration fully configured
- [ ] Users can subscribe via Stripe Checkout
- [ ] Monthly spending limit persisted and editable on profile
- [ ] Usage logged on each AI/photo call
- [ ] When limit reached: free model only, photo identify hidden
- [ ] Subscription cancelable and resubscribable from profile
- [ ] Webhook handler updates subscription status correctly
- [ ] All new DAL functions have unit tests
- [ ] Profile page shows current month usage and limit
