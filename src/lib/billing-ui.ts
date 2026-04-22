/**
 * Pure utility functions for billing UI state and display logic.
 * Components import from here so tests exercise real code paths.
 */

export type BillingState = "active" | "canceling" | "draining" | "free" | "admin";

/** Formats a Unix timestamp (seconds) as "Month Day, Year" in UTC. */
export function formatPeriodEndDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Determines whether the user is in the "draining" state:
 * paid plan, subscription canceled (stripeSubscriptionId removed), no active sub.
 */
export function isDrainingState(
  billingPlan: string,
  subscriptionStatus: string | null,
  stripeSubscriptionId: string | null | undefined,
): boolean {
  return (
    billingPlan === "paid" &&
    subscriptionStatus === "canceled" &&
    !stripeSubscriptionId
  );
}

/**
 * Returns the plan label string shown on billing/profile pages.
 */
export function getPlanLabel(opts: {
  currentPlan: string;
  isAdmin: boolean;
  cancelAtPeriodEnd: boolean;
  isDraining: boolean;
  subscriptionStatus: string | null;
}): string {
  const { currentPlan, isAdmin, cancelAtPeriodEnd, isDraining } = opts;
  if (isAdmin) return "Admin (all access)";
  if (currentPlan !== "paid") return "Free";
  if (isDraining) return "Paid (using credits)";
  if (cancelAtPeriodEnd) return "Paid (canceling)";
  return "Paid (active)";
}

/**
 * Returns the confirmation dialog message for the cancel subscription button.
 */
export function getCancelDialogMessage(
  periodEndDate: string | undefined,
  extraUsageDollars: number,
): string {
  const dateClause = periodEndDate
    ? `Your subscription will remain active until ${periodEndDate}.`
    : "Your subscription will remain active until the end of your billing period.";

  const creditsClause =
    extraUsageDollars > 0
      ? ` Your $${extraUsageDollars.toFixed(2)} in extra credits will not be lost — paid features stay active until they're used up.`
      : " Any unused credits will not be lost.";

  return `Are you sure you want to cancel? ${dateClause}${creditsClause}`;
}

/**
 * Which action buttons are visible given the billing state.
 * Returns a set of action names.
 */
export function getVisibleActions(
  state: BillingState,
): {
  showCancel: boolean;
  showUpdatePayment: boolean;
  showResubscribe: boolean;
} {
  switch (state) {
    case "active":
      return { showCancel: true, showUpdatePayment: true, showResubscribe: false };
    case "canceling":
      return { showCancel: false, showUpdatePayment: false, showResubscribe: true };
    case "draining":
      return { showCancel: false, showUpdatePayment: false, showResubscribe: false };
    default:
      return { showCancel: false, showUpdatePayment: false, showResubscribe: false };
  }
}

/**
 * Determines the current BillingState from raw billing data.
 */
export function computeBillingState(opts: {
  currentPlan: string;
  isAdmin: boolean;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null | undefined;
}): BillingState {
  const { currentPlan, isAdmin, subscriptionStatus, cancelAtPeriodEnd, stripeSubscriptionId } = opts;
  if (isAdmin) return "admin";
  if (currentPlan !== "paid") return "free";
  if (isDrainingState(currentPlan, subscriptionStatus, stripeSubscriptionId)) return "draining";
  if (cancelAtPeriodEnd) return "canceling";
  return "active";
}
