"use server";

import { redirect } from "next/navigation";
import { requireVerifiedAuth } from "@/lib/session";
import { updateUserBillingPlan } from "@/lib/dal/users";
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
