import { requireVerifiedAuth } from "@/lib/session";
import { getUserBillingInfo } from "@/lib/billing";
import BirdyChatPage from "./BirdyChatPage";
import type { BillingPlan } from "@/lib/billing";

export default async function BirdyChatServerPage() {
  const session = await requireVerifiedAuth();
  const billingInfo = await getUserBillingInfo(session.user.id);
  const billingPlan: BillingPlan = billingInfo?.billingPlan ?? "free";
  const isAdmin = billingInfo?.role === "admin";

  return <BirdyChatPage billingPlan={billingPlan} isAdmin={isAdmin} />;
}
