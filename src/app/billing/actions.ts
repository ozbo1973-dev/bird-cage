"use server";

import { redirect } from "next/navigation";
import { requireVerifiedAuth } from "@/lib/session";
import { updateUserBillingPlan } from "@/lib/dal/users";
import { updateSpendingLimit } from "@/lib/dal/billing";
import type { BillingPlan } from "@/lib/billing";

/**
 * Updates the current user's billing plan.
 * Requires authenticated, verified user.
 * Redirects to /dashboard on success.
 */
export async function updateBillingPlan(plan: BillingPlan): Promise<void> {
  const session = await requireVerifiedAuth();

  await updateUserBillingPlan(session.user.id, plan);

  redirect("/dashboard");
}

/**
 * Updates the spending limit (in dollars) for the current user.
 * Pass 0 or empty to remove the limit.
 */
export async function updateSpendingLimitAction(
  limitDollars: number | null,
): Promise<void> {
  const session = await requireVerifiedAuth();

  const limitCents =
    limitDollars != null && limitDollars > 0
      ? Math.round(limitDollars * 100)
      : null;

  await updateSpendingLimit(session.user.id, limitCents);
  redirect("/billing");
}
