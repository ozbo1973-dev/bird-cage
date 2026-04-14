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
 * Admins always have access. Paid plan users have access.
 */
export function canAccessPaidFeatures(
  role: string,
  billingPlan: BillingPlan,
): boolean {
  return role === "admin" || billingPlan === "paid";
}

/**
 * Returns the appropriate chat model based on billing plan and role.
 * Admins and paid users get the paid model.
 * Free users get the free model.
 */
export function selectChatModel(
  role: string,
  billingPlan: BillingPlan,
): string {
  if (canAccessPaidFeatures(role, billingPlan)) {
    return process.env.OPENROUTER_MODEL ?? PAID_MODEL_DEFAULT;
  }
  return process.env.OPENROUTER_FREE_MODEL ?? FREE_MODEL_DEFAULT;
}
