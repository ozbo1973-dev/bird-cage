"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireVerifiedAuth } from "@/lib/session";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { isValidPlan, type BillingPlan } from "@/lib/billing";

export async function updateBillingPlan(plan: BillingPlan): Promise<void> {
  const session = await requireVerifiedAuth();

  if (!isValidPlan(plan)) {
    throw new Error("Invalid billing plan");
  }

  await db
    .update(userTable)
    .set({ billingPlan: plan })
    .where(eq(userTable.id, session.user.id));

  redirect("/dashboard");
}
