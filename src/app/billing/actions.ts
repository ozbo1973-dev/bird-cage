"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireVerifiedAuth } from "@/lib/session";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import type { BillingPlan } from "@/lib/billing";

/**
 * Updates the current user's billing plan.
 * Requires authenticated, verified user.
 * Redirects to /dashboard on success.
 */
export async function updateBillingPlan(plan: BillingPlan): Promise<void> {
  const session = await requireVerifiedAuth();

  await db
    .update(userTable)
    .set({ billingPlan: plan })
    .where(eq(userTable.id, session.user.id));

  redirect("/dashboard");
}
