import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable, usageLogs } from "@/db/schema";
import { getStripe } from "@/lib/stripe";

export type SubscriptionStatus = "active" | "canceled" | "paused";

/** Fixed monthly AI usage allowance for Pro plan users (in cents). */
export const PRO_LIMIT_CENTS = 400; // $4.00

/**
 * Log a usage entry and increment the user's current month usage.
 * If the user is in drain state (paid plan, no active subscription, extra usage exhausted),
 * flip billing_plan to "free".
 */
export async function logUsage(
  userId: string,
  modelUsed: string,
  costCents: number,
): Promise<void> {
  await db.insert(usageLogs).values({ userId, modelUsed, costCents });

  await db
    .update(userTable)
    .set({
      currentMonthUsageCents: sql`${userTable.currentMonthUsageCents} + ${costCents}`,
    })
    .where(eq(userTable.id, userId));

  // Drain state: subscription canceled (no stripeSubscriptionId) but extra usage remained.
  // When limit is now exhausted, flip to free.
  const [row] = await db
    .select({
      billingPlan: userTable.billingPlan,
      stripeSubscriptionId: userTable.stripeSubscriptionId,
      subscriptionStatus: userTable.subscriptionStatus,
      currentMonthUsageCents: userTable.currentMonthUsageCents,
      extraUsageCents: userTable.extraUsageCents,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  // Drain state: subscription explicitly canceled (stripeSubscriptionId nulled out,
  // subscriptionStatus="canceled") but user kept on paid plan due to remaining extra credits.
  // When extra credits are now exhausted, flip to free.
  if (
    row &&
    row.billingPlan === "paid" &&
    row.stripeSubscriptionId === null &&
    row.subscriptionStatus === "canceled" &&
    row.currentMonthUsageCents >= PRO_LIMIT_CENTS + (row.extraUsageCents ?? 0)
  ) {
    await db
      .update(userTable)
      .set({ billingPlan: "free" })
      .where(eq(userTable.id, userId));
  }
}

/**
 * Returns the user's current month usage in cents.
 * Returns 0 if user is not found.
 */
export async function getCurrentMonthUsage(userId: string): Promise<number> {
  const [row] = await db
    .select({ currentMonthUsageCents: userTable.currentMonthUsageCents })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return row?.currentMonthUsageCents ?? 0;
}

/**
 * Returns true if the user has exhausted their total AI usage budget for the month.
 *
 * For paid users: budget = PRO_LIMIT_CENTS ($4) + extraUsageCents (purchased top-ups).
 * Returns false for free users and admins (no fixed limit applies).
 */
export async function isLimitReached(userId: string): Promise<boolean> {
  const [row] = await db
    .select({
      billingPlan: userTable.billingPlan,
      currentMonthUsageCents: userTable.currentMonthUsageCents,
      extraUsageCents: userTable.extraUsageCents,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!row || row.billingPlan !== "paid") return false;

  const totalLimit = PRO_LIMIT_CENTS + (row.extraUsageCents ?? 0);
  return row.currentMonthUsageCents >= totalLimit;
}

/**
 * Returns true if the user has reached the base $4 Pro allowance (before extra usage).
 * Used to decide whether to show the "Add Extra Usage" section.
 */
export async function isProAllowanceReached(userId: string): Promise<boolean> {
  const [row] = await db
    .select({
      billingPlan: userTable.billingPlan,
      currentMonthUsageCents: userTable.currentMonthUsageCents,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!row || row.billingPlan !== "paid") return false;
  return row.currentMonthUsageCents >= PRO_LIMIT_CENTS;
}

/**
 * Adds extra usage cents to the user's balance (from a one-time Stripe purchase).
 */
export async function addExtraUsage(
  userId: string,
  cents: number,
): Promise<void> {
  await db
    .update(userTable)
    .set({
      extraUsageCents: sql`${userTable.extraUsageCents} + ${cents}`,
    })
    .where(eq(userTable.id, userId));
}

/**
 * Update subscription status for a user.
 */
export async function updateSubscriptionStatus(
  userId: string,
  status: SubscriptionStatus,
): Promise<void> {
  await db
    .update(userTable)
    .set({ subscriptionStatus: status })
    .where(eq(userTable.id, userId));
}

/**
 * Get the Stripe customer ID for a user, or null if not set.
 */
export async function getStripeCustomerId(
  userId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ stripeCustomerId: userTable.stripeCustomerId })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return row?.stripeCustomerId ?? null;
}

/**
 * Set the Stripe customer ID for a user.
 */
export async function setStripeCustomerId(
  userId: string,
  customerId: string,
): Promise<void> {
  await db
    .update(userTable)
    .set({ stripeCustomerId: customerId })
    .where(eq(userTable.id, userId));
}

/**
 * Set the Stripe subscription ID for a user.
 */
export async function setStripeSubscriptionId(
  userId: string,
  subscriptionId: string,
): Promise<void> {
  await db
    .update(userTable)
    .set({ stripeSubscriptionId: subscriptionId })
    .where(eq(userTable.id, userId));
}

/**
 * Get user ID by Stripe customer ID.
 * Returns null if not found.
 */
export async function getUserIdByStripeCustomerId(
  stripeCustomerId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.stripeCustomerId, stripeCustomerId))
    .limit(1);

  return row?.id ?? null;
}

/**
 * Activate subscription: set billing plan to "paid", subscription status to "active",
 * save stripe IDs, reset cancelAtPeriodEnd, and optionally store currentPeriodEnd.
 */
export async function activateSubscription(
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  currentPeriodEnd?: number,
): Promise<void> {
  await db
    .update(userTable)
    .set({
      billingPlan: "paid",
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionStatus: "active",
      cancelAtPeriodEnd: false,
      ...(currentPeriodEnd !== undefined ? { currentPeriodEnd } : {}),
    })
    .where(eq(userTable.id, userId));
}

/**
 * Cancel subscription by Stripe customer ID.
 * If extra_usage_cents > 0, keeps billing_plan="paid" (drain state) and nulls stripeSubscriptionId.
 * If extra_usage_cents = 0, flips billing_plan to "free".
 * Always clears cancelAtPeriodEnd and currentPeriodEnd.
 */
export async function cancelSubscriptionByCustomerId(
  stripeCustomerId: string,
): Promise<void> {
  const [row] = await db
    .select({ extraUsageCents: userTable.extraUsageCents })
    .from(userTable)
    .where(eq(userTable.stripeCustomerId, stripeCustomerId))
    .limit(1);

  const inDrainState = (row?.extraUsageCents ?? 0) > 0;

  await db
    .update(userTable)
    .set({
      billingPlan: inDrainState ? "paid" : "free",
      subscriptionStatus: "canceled",
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    })
    .where(eq(userTable.stripeCustomerId, stripeCustomerId));
}

/**
 * Pause subscription by Stripe customer ID (payment failed):
 * set subscription status to "paused".
 */
export async function pauseSubscriptionByCustomerId(
  stripeCustomerId: string,
): Promise<void> {
  await db
    .update(userTable)
    .set({ subscriptionStatus: "paused" })
    .where(eq(userTable.stripeCustomerId, stripeCustomerId));
}

/**
 * Reset the current month usage to 0 for a specific user.
 * Optionally updates currentPeriodEnd (called on subscription renewal).
 * Extra usage carries over to the next month.
 */
export async function resetMonthlyUsage(
  userId: string,
  currentPeriodEnd?: number,
): Promise<void> {
  await db
    .update(userTable)
    .set({
      currentMonthUsageCents: 0,
      ...(currentPeriodEnd !== undefined ? { currentPeriodEnd } : {}),
    })
    .where(eq(userTable.id, userId));
}

/**
 * Schedule cancellation at period end by Stripe customer ID.
 * Sets cancelAtPeriodEnd=true, stores currentPeriodEnd, and marks subscriptionStatus="canceled".
 */
export async function scheduleCancellation(
  stripeCustomerId: string,
  currentPeriodEnd: number,
): Promise<void> {
  await db
    .update(userTable)
    .set({
      cancelAtPeriodEnd: true,
      currentPeriodEnd,
      subscriptionStatus: "canceled",
    })
    .where(eq(userTable.stripeCustomerId, stripeCustomerId));
}

/**
 * Reactivate a subscription that was scheduled for cancellation.
 * Sets cancelAtPeriodEnd=false, updates currentPeriodEnd, and marks subscriptionStatus="active".
 * Does NOT reset usage.
 */
export async function reactivateSubscription(
  stripeCustomerId: string,
  currentPeriodEnd: number,
): Promise<void> {
  await db
    .update(userTable)
    .set({
      cancelAtPeriodEnd: false,
      currentPeriodEnd,
      subscriptionStatus: "active",
    })
    .where(eq(userTable.stripeCustomerId, stripeCustomerId));
}

/**
 * Get billing summary for a user (for profile/billing page display).
 */
export async function getBillingInfo(userId: string): Promise<{
  billingPlan: string;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentMonthUsageCents: number;
  extraUsageCents: number;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
} | null> {
  const [row] = await db
    .select({
      billingPlan: userTable.billingPlan,
      subscriptionStatus: userTable.subscriptionStatus,
      stripeCustomerId: userTable.stripeCustomerId,
      stripeSubscriptionId: userTable.stripeSubscriptionId,
      currentMonthUsageCents: userTable.currentMonthUsageCents,
      extraUsageCents: userTable.extraUsageCents,
      cancelAtPeriodEnd: userTable.cancelAtPeriodEnd,
      currentPeriodEnd: userTable.currentPeriodEnd,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!row) return null;
  return row;
}

/**
 * Fetch the current subscription state from Stripe and sync it to the DB.
 * Handles the case where a user cancels via the Stripe Customer Portal
 * and the webhook hasn't arrived yet.
 */
export async function syncSubscriptionFromStripe(userId: string): Promise<void> {
  const [row] = await db
    .select({
      stripeSubscriptionId: userTable.stripeSubscriptionId,
      cancelAtPeriodEnd: userTable.cancelAtPeriodEnd,
      subscriptionStatus: userTable.subscriptionStatus,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!row?.stripeSubscriptionId) return;

  const sub = await getStripe().subscriptions.retrieve(row.stripeSubscriptionId);

  // Subscription is canceling if either cancel_at_period_end or cancel_at (portal fixed-date cancel) is set
  const stripeCanceling = sub.cancel_at_period_end || (sub.cancel_at != null && sub.cancel_at > 0);
  const stripeStatus = sub.status;
  const periodEnd = sub.cancel_at ?? sub.items.data[0]?.current_period_end ?? 0;

  const dbCanceling = row.cancelAtPeriodEnd;
  const dbStatus = row.subscriptionStatus;

  // Only update if Stripe disagrees with the DB
  if (stripeCanceling === dbCanceling && stripeStatus !== "past_due") return;

  if (stripeCanceling && !dbCanceling) {
    // Portal cancel: mark canceling in DB
    await db
      .update(userTable)
      .set({ cancelAtPeriodEnd: true, currentPeriodEnd: periodEnd, subscriptionStatus: "canceled" })
      .where(eq(userTable.id, userId));
  } else if (!stripeCanceling && dbCanceling && stripeStatus === "active") {
    // Portal reactivation: mark active in DB
    await db
      .update(userTable)
      .set({ cancelAtPeriodEnd: false, currentPeriodEnd: periodEnd, subscriptionStatus: "active" })
      .where(eq(userTable.id, userId));
  } else if (stripeStatus === "past_due" && dbStatus !== "paused") {
    await db
      .update(userTable)
      .set({ subscriptionStatus: "paused" })
      .where(eq(userTable.id, userId));
  }
}
