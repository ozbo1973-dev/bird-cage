import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable, usageLogs } from "@/db/schema";

export type SubscriptionStatus = "active" | "canceled" | "paused";

/** Fixed monthly AI usage allowance for Pro plan users (in cents). */
export const PRO_LIMIT_CENTS = 400; // $4.00

/**
 * Log a usage entry and increment the user's current month usage.
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
 * and save the stripe customer ID and subscription ID.
 */
export async function activateSubscription(
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
): Promise<void> {
  await db
    .update(userTable)
    .set({
      billingPlan: "paid",
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionStatus: "active",
    })
    .where(eq(userTable.id, userId));
}

/**
 * Cancel subscription by Stripe customer ID: set billing plan to "free",
 * subscription status to "canceled".
 */
export async function cancelSubscriptionByCustomerId(
  stripeCustomerId: string,
): Promise<void> {
  await db
    .update(userTable)
    .set({
      billingPlan: "free",
      subscriptionStatus: "canceled",
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
 * Called on subscription renewal — extra usage carries over to the next month.
 */
export async function resetMonthlyUsage(userId: string): Promise<void> {
  await db
    .update(userTable)
    .set({ currentMonthUsageCents: 0 })
    .where(eq(userTable.id, userId));
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
} | null> {
  const [row] = await db
    .select({
      billingPlan: userTable.billingPlan,
      subscriptionStatus: userTable.subscriptionStatus,
      stripeCustomerId: userTable.stripeCustomerId,
      stripeSubscriptionId: userTable.stripeSubscriptionId,
      currentMonthUsageCents: userTable.currentMonthUsageCents,
      extraUsageCents: userTable.extraUsageCents,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!row) return null;
  return row;
}
