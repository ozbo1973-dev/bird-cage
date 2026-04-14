import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";

export type BillingPlan = "free" | "paid";

const FREE_MODEL_DEFAULT = "openrouter/auto";
const PAID_MODEL_DEFAULT = "openrouter/openai/gpt-oss-120b";

/**
 * Returns the user's billing plan from the database.
 * Falls back to "free" if the user is not found.
 */
export async function getUserBillingPlan(userId: string): Promise<BillingPlan> {
  const [row] = await db
    .select({ billingPlan: userTable.billingPlan, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return (row?.billingPlan as BillingPlan) ?? "free";
}

/**
 * Returns the user's role and billing plan from the database.
 * Returns null if the user is not found.
 */
export async function getUserBillingInfo(
  userId: string,
): Promise<{ role: string; billingPlan: BillingPlan } | null> {
  const [row] = await db
    .select({ billingPlan: userTable.billingPlan, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!row) return null;
  return { role: row.role, billingPlan: row.billingPlan as BillingPlan };
}

/**
 * Returns true if the user can access paid features.
 * Admins always have access.
 * Paid users have access unless their spending limit is reached.
 *
 * @param role - User's role
 * @param billingPlan - User's billing plan
 * @param limitReached - Whether the spending limit has been reached (default false)
 */
export function canAccessPaidFeatures(
  role: string,
  billingPlan: BillingPlan,
  limitReached = false,
): boolean {
  if (role === "admin") return true;
  if (billingPlan !== "paid") return false;
  return !limitReached;
}

/**
 * Returns the appropriate chat model based on billing plan, role, and spending limit.
 * Admins always get the paid model (bypass limit).
 * Paid users get the paid model unless their spending limit is reached.
 * Free users always get the free model.
 *
 * @param role - User's role
 * @param billingPlan - User's billing plan
 * @param limitReached - Whether the spending limit has been reached (default false)
 */
export function selectChatModel(
  role: string,
  billingPlan: BillingPlan,
  limitReached = false,
): string {
  if (canAccessPaidFeatures(role, billingPlan, limitReached)) {
    return process.env.OPENROUTER_MODEL ?? PAID_MODEL_DEFAULT;
  }
  return process.env.OPENROUTER_FREE_MODEL ?? FREE_MODEL_DEFAULT;
}

/**
 * Returns whether a spending limit is actively restricting the user.
 * A convenience function for clarity in components.
 */
export function isSpendingLimitAware(limitReached: boolean): boolean {
  return limitReached;
}
