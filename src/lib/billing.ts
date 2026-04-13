import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";

export type BillingPlan = "free" | "paid";

/** Returns true if the user can access paid features. Admins always bypass. */
export function canAccessPaidFeatures(role: string, billingPlan: BillingPlan): boolean {
  if (role === "admin") return true;
  return billingPlan === "paid";
}

/** Returns the correct OpenRouter model for the user's plan and role. */
export function selectChatModel(role: string, billingPlan: BillingPlan): string {
  const freeModel = process.env.OPENROUTER_FREE_MODEL ?? "openrouter/auto";
  const paidModel = process.env.OPENROUTER_MODEL ?? "openrouter/openai/gpt-oss-120b";
  if (role === "admin") return paidModel;
  if (billingPlan === "paid") return paidModel;
  return freeModel;
}

/** Validates that a string is a valid billing plan value. */
export function isValidPlan(plan: unknown): plan is BillingPlan {
  return plan === "free" || plan === "paid";
}

/** Fetches role and billing plan for a user by ID. Returns null if not found. */
export async function getUserBillingInfo(
  userId: string,
): Promise<{ role: string; billingPlan: BillingPlan } | null> {
  const [row] = await db
    .select({ role: userTable.role, billingPlan: userTable.billingPlan })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (!row) return null;
  return { role: row.role, billingPlan: row.billingPlan as BillingPlan };
}
