import { describe, it, expect } from "vitest";
import {
  formatPeriodEndDate,
  isDrainingState,
  getPlanLabel,
  getCancelDialogMessage,
  computeBillingState,
  getVisibleActions,
} from "@/lib/billing-ui";

// May 15, 2026 00:00:00 UTC
const MAY_15_2026 = 1778803200;
// Jan 3, 2026 00:00:00 UTC
const JAN_3_2026 = 1767398400;

// ──────────────────────────────────────────────────────────────────────────────
// formatPeriodEndDate
// ──────────────────────────────────────────────────────────────────────────────

describe("formatPeriodEndDate", () => {
  it("formats a Unix timestamp as 'Month Day, Year'", () => {
    expect(formatPeriodEndDate(MAY_15_2026)).toBe("May 15, 2026");
  });

  it("formats a January date correctly", () => {
    expect(formatPeriodEndDate(JAN_3_2026)).toBe("January 3, 2026");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// isDrainingState
// ──────────────────────────────────────────────────────────────────────────────

describe("isDrainingState", () => {
  it("returns true when paid + canceled + no subscription ID", () => {
    expect(isDrainingState("paid", "canceled", null)).toBe(true);
  });

  it("returns false when subscription ID still present", () => {
    expect(isDrainingState("paid", "canceled", "sub_abc")).toBe(false);
  });

  it("returns false when subscription status is active", () => {
    expect(isDrainingState("paid", "active", null)).toBe(false);
  });

  it("returns false for free plan", () => {
    expect(isDrainingState("free", "canceled", null)).toBe(false);
  });

  it("returns false when stripeSubscriptionId is undefined", () => {
    expect(isDrainingState("paid", "canceled", undefined)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getPlanLabel
// ──────────────────────────────────────────────────────────────────────────────

describe("getPlanLabel", () => {
  const base = { subscriptionStatus: "active" as string | null };

  it("returns 'Admin (all access)' for admin users regardless of plan", () => {
    expect(getPlanLabel({ ...base, currentPlan: "free", isAdmin: true, cancelAtPeriodEnd: false, isDraining: false })).toBe("Admin (all access)");
  });

  it("returns 'Free' for free plan non-admin users", () => {
    expect(getPlanLabel({ ...base, currentPlan: "free", isAdmin: false, cancelAtPeriodEnd: false, isDraining: false })).toBe("Free");
  });

  it("returns 'Paid (active)' for active paid subscription", () => {
    expect(getPlanLabel({ ...base, currentPlan: "paid", isAdmin: false, cancelAtPeriodEnd: false, isDraining: false })).toBe("Paid (active)");
  });

  it("returns 'Paid (canceling)' when cancelAtPeriodEnd is true", () => {
    expect(getPlanLabel({ ...base, currentPlan: "paid", isAdmin: false, cancelAtPeriodEnd: true, isDraining: false })).toBe("Paid (canceling)");
  });

  it("returns 'Paid (using credits)' when in drain state", () => {
    expect(getPlanLabel({ ...base, currentPlan: "paid", isAdmin: false, cancelAtPeriodEnd: false, isDraining: true })).toBe("Paid (using credits)");
  });

  it("drain state takes priority over cancelAtPeriodEnd", () => {
    expect(getPlanLabel({ ...base, currentPlan: "paid", isAdmin: false, cancelAtPeriodEnd: true, isDraining: true })).toBe("Paid (using credits)");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getCancelDialogMessage
// ──────────────────────────────────────────────────────────────────────────────

describe("getCancelDialogMessage", () => {
  it("includes the period end date when provided", () => {
    const msg = getCancelDialogMessage("May 15, 2026", 0);
    expect(msg).toContain("May 15, 2026");
  });

  it("uses a fallback phrase when no date is provided", () => {
    const msg = getCancelDialogMessage(undefined, 0);
    expect(msg).toContain("end of your billing period");
  });

  it("mentions extra credits when extra usage dollars > 0", () => {
    const msg = getCancelDialogMessage("May 15, 2026", 2.5);
    expect(msg).toContain("$2.50");
    expect(msg).toContain("credits will not be lost");
  });

  it("omits credit amount when extra usage is 0", () => {
    const msg = getCancelDialogMessage("May 15, 2026", 0);
    expect(msg).not.toContain("$0.00");
    expect(msg).toContain("credits will not be lost");
  });

  it("starts with a confirmation prompt", () => {
    const msg = getCancelDialogMessage("May 15, 2026", 0);
    expect(msg).toContain("Are you sure you want to cancel");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// computeBillingState
// ──────────────────────────────────────────────────────────────────────────────

describe("computeBillingState", () => {
  it("returns 'admin' for admin users", () => {
    expect(computeBillingState({ currentPlan: "free", isAdmin: true, subscriptionStatus: null, cancelAtPeriodEnd: false, stripeSubscriptionId: null })).toBe("admin");
  });

  it("returns 'free' for free plan non-admin users", () => {
    expect(computeBillingState({ currentPlan: "free", isAdmin: false, subscriptionStatus: null, cancelAtPeriodEnd: false, stripeSubscriptionId: null })).toBe("free");
  });

  it("returns 'active' for paid active subscription", () => {
    expect(computeBillingState({ currentPlan: "paid", isAdmin: false, subscriptionStatus: "active", cancelAtPeriodEnd: false, stripeSubscriptionId: "sub_abc" })).toBe("active");
  });

  it("returns 'canceling' when cancelAtPeriodEnd is true", () => {
    expect(computeBillingState({ currentPlan: "paid", isAdmin: false, subscriptionStatus: "active", cancelAtPeriodEnd: true, stripeSubscriptionId: "sub_abc" })).toBe("canceling");
  });

  it("returns 'draining' when subscription canceled and no sub ID", () => {
    expect(computeBillingState({ currentPlan: "paid", isAdmin: false, subscriptionStatus: "canceled", cancelAtPeriodEnd: false, stripeSubscriptionId: null })).toBe("draining");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getVisibleActions
// ──────────────────────────────────────────────────────────────────────────────

describe("getVisibleActions", () => {
  it("active state shows cancel + update payment, not resubscribe", () => {
    const actions = getVisibleActions("active");
    expect(actions.showCancel).toBe(true);
    expect(actions.showUpdatePayment).toBe(true);
    expect(actions.showResubscribe).toBe(false);
  });

  it("canceling state shows only resubscribe", () => {
    const actions = getVisibleActions("canceling");
    expect(actions.showCancel).toBe(false);
    expect(actions.showUpdatePayment).toBe(false);
    expect(actions.showResubscribe).toBe(true);
  });

  it("draining state shows no action buttons", () => {
    const actions = getVisibleActions("draining");
    expect(actions.showCancel).toBe(false);
    expect(actions.showUpdatePayment).toBe(false);
    expect(actions.showResubscribe).toBe(false);
  });

  it("free state shows no action buttons", () => {
    const actions = getVisibleActions("free");
    expect(actions.showCancel).toBe(false);
    expect(actions.showUpdatePayment).toBe(false);
    expect(actions.showResubscribe).toBe(false);
  });

  it("admin state shows no action buttons", () => {
    const actions = getVisibleActions("admin");
    expect(actions.showCancel).toBe(false);
    expect(actions.showUpdatePayment).toBe(false);
    expect(actions.showResubscribe).toBe(false);
  });
});
