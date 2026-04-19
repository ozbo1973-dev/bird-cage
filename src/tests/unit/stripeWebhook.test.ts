/**
 * Unit tests for the Stripe webhook handler.
 * Mocks getStripe() and all billing DAL functions.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

// ── Hoist mocks before vi.mock factory calls ──────────────────────────────────
const mocks = vi.hoisted(() => ({
  subscriptionsRetrieve: vi.fn(),
  constructEvent: vi.fn(),
  activateSubscription: vi.fn(),
  cancelSubscriptionByCustomerId: vi.fn(),
  pauseSubscriptionByCustomerId: vi.fn(),
  getUserIdByStripeCustomerId: vi.fn(),
  setStripeSubscriptionId: vi.fn(),
  resetMonthlyUsage: vi.fn(),
  addExtraUsage: vi.fn(),
  scheduleCancellation: vi.fn(),
  reactivateSubscription: vi.fn(),
}));

// ── Stripe mock ───────────────────────────────────────────────────────────────
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mocks.constructEvent },
    subscriptions: { retrieve: mocks.subscriptionsRetrieve },
  }),
}));

// ── DAL mock ──────────────────────────────────────────────────────────────────
vi.mock("@/lib/dal/billing", () => ({
  activateSubscription: mocks.activateSubscription,
  cancelSubscriptionByCustomerId: mocks.cancelSubscriptionByCustomerId,
  pauseSubscriptionByCustomerId: mocks.pauseSubscriptionByCustomerId,
  getUserIdByStripeCustomerId: mocks.getUserIdByStripeCustomerId,
  setStripeSubscriptionId: mocks.setStripeSubscriptionId,
  resetMonthlyUsage: mocks.resetMonthlyUsage,
  addExtraUsage: mocks.addExtraUsage,
  scheduleCancellation: mocks.scheduleCancellation,
  reactivateSubscription: mocks.reactivateSubscription,
}));

import { POST } from "@/app/api/webhooks/stripe/route";
import { NextRequest } from "next/server";

function makeRequest(body = "{}") {
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "test-sig" },
    body,
  });
}

function makeEvent(type: string, data: object): Stripe.Event {
  return {
    id: "evt_test",
    type,
    object: "event",
    api_version: "2024-06-20",
    created: 1700000000,
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: { object: data },
  } as unknown as Stripe.Event;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

// ── checkout.session.completed ────────────────────────────────────────────────
describe("checkout.session.completed", () => {
  it("retrieves subscription and passes current_period_end to activateSubscription", async () => {
    const event = makeEvent("checkout.session.completed", {
      mode: "subscription",
      metadata: { userId: "user_1" },
      customer: "cus_1",
      subscription: "sub_1",
    });
    mocks.constructEvent.mockReturnValue(event);
    mocks.subscriptionsRetrieve.mockResolvedValue({ current_period_end: 1800000000 });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_1");
    expect(mocks.activateSubscription).toHaveBeenCalledWith("user_1", "cus_1", "sub_1", 1800000000);
  });

  it("handles one-time payment mode without activating subscription", async () => {
    const event = makeEvent("checkout.session.completed", {
      mode: "payment",
      metadata: { userId: "user_1", extraUsageCents: "200" },
      customer: "cus_1",
      subscription: null,
    });
    mocks.constructEvent.mockReturnValue(event);

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mocks.addExtraUsage).toHaveBeenCalledWith("user_1", 200);
    expect(mocks.activateSubscription).not.toHaveBeenCalled();
    expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled();
  });

  it("is a no-op when userId missing from metadata", async () => {
    const event = makeEvent("checkout.session.completed", {
      mode: "subscription",
      metadata: {},
      customer: "cus_1",
      subscription: "sub_1",
    });
    mocks.constructEvent.mockReturnValue(event);

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mocks.activateSubscription).not.toHaveBeenCalled();
  });
});

// ── customer.subscription.created ────────────────────────────────────────────
describe("customer.subscription.created", () => {
  it("passes current_period_end to activateSubscription for active subscription", async () => {
    const event = makeEvent("customer.subscription.created", {
      id: "sub_2",
      customer: "cus_2",
      status: "active",
      current_period_end: 1810000000,
    });
    mocks.constructEvent.mockReturnValue(event);
    mocks.getUserIdByStripeCustomerId.mockResolvedValue("user_2");

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mocks.setStripeSubscriptionId).toHaveBeenCalledWith("user_2", "sub_2");
    expect(mocks.activateSubscription).toHaveBeenCalledWith("user_2", "cus_2", "sub_2", 1810000000);
  });

  it("passes current_period_end for trialing subscription", async () => {
    const event = makeEvent("customer.subscription.created", {
      id: "sub_3",
      customer: "cus_3",
      status: "trialing",
      current_period_end: 1820000000,
    });
    mocks.constructEvent.mockReturnValue(event);
    mocks.getUserIdByStripeCustomerId.mockResolvedValue("user_3");

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mocks.activateSubscription).toHaveBeenCalledWith("user_3", "cus_3", "sub_3", 1820000000);
  });

  it("is a no-op when user not found for customer", async () => {
    const event = makeEvent("customer.subscription.created", {
      id: "sub_4",
      customer: "cus_4",
      status: "active",
      current_period_end: 1800000000,
    });
    mocks.constructEvent.mockReturnValue(event);
    mocks.getUserIdByStripeCustomerId.mockResolvedValue(null);

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mocks.activateSubscription).not.toHaveBeenCalled();
  });
});

// ── invoice.paid ──────────────────────────────────────────────────────────────
describe("invoice.paid", () => {
  it("retrieves subscription and passes current_period_end to resetMonthlyUsage", async () => {
    const event = makeEvent("invoice.paid", {
      customer: "cus_5",
      subscription: "sub_5",
    });
    mocks.constructEvent.mockReturnValue(event);
    mocks.getUserIdByStripeCustomerId.mockResolvedValue("user_5");
    mocks.subscriptionsRetrieve.mockResolvedValue({ current_period_end: 1830000000 });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_5");
    expect(mocks.resetMonthlyUsage).toHaveBeenCalledWith("user_5", 1830000000);
  });

  it("resets monthly usage without period_end when no subscription on invoice", async () => {
    const event = makeEvent("invoice.paid", {
      customer: "cus_6",
      subscription: null,
    });
    mocks.constructEvent.mockReturnValue(event);
    mocks.getUserIdByStripeCustomerId.mockResolvedValue("user_6");

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled();
    expect(mocks.resetMonthlyUsage).toHaveBeenCalledWith("user_6", undefined);
  });

  it("is a no-op when user not found for customer", async () => {
    const event = makeEvent("invoice.paid", {
      customer: "cus_7",
      subscription: "sub_7",
    });
    mocks.constructEvent.mockReturnValue(event);
    mocks.getUserIdByStripeCustomerId.mockResolvedValue(null);

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mocks.resetMonthlyUsage).not.toHaveBeenCalled();
  });
});

// ── customer.subscription.updated ────────────────────────────────────────────
describe("customer.subscription.updated", () => {
  it("calls scheduleCancellation when cancel_at_period_end is true", async () => {
    const event = makeEvent("customer.subscription.updated", {
      id: "sub_8",
      customer: "cus_8",
      status: "active",
      cancel_at_period_end: true,
      current_period_end: 1840000000,
    });
    mocks.constructEvent.mockReturnValue(event);
    mocks.getUserIdByStripeCustomerId.mockResolvedValue("user_8");

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mocks.scheduleCancellation).toHaveBeenCalledWith("cus_8", 1840000000);
    expect(mocks.reactivateSubscription).not.toHaveBeenCalled();
  });

  it("calls reactivateSubscription when status is active and not canceling", async () => {
    const event = makeEvent("customer.subscription.updated", {
      id: "sub_9",
      customer: "cus_9",
      status: "active",
      cancel_at_period_end: false,
      current_period_end: 1850000000,
    });
    mocks.constructEvent.mockReturnValue(event);
    mocks.getUserIdByStripeCustomerId.mockResolvedValue("user_9");

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mocks.reactivateSubscription).toHaveBeenCalledWith("cus_9", 1850000000);
    expect(mocks.scheduleCancellation).not.toHaveBeenCalled();
  });

  it("is a no-op when user not found in DB", async () => {
    const event = makeEvent("customer.subscription.updated", {
      id: "sub_10",
      customer: "cus_10",
      status: "active",
      cancel_at_period_end: false,
      current_period_end: 1860000000,
    });
    mocks.constructEvent.mockReturnValue(event);
    mocks.getUserIdByStripeCustomerId.mockResolvedValue(null);

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mocks.scheduleCancellation).not.toHaveBeenCalled();
    expect(mocks.reactivateSubscription).not.toHaveBeenCalled();
  });

  it("is a no-op when status is not active and not canceling (e.g. paused)", async () => {
    const event = makeEvent("customer.subscription.updated", {
      id: "sub_11",
      customer: "cus_11",
      status: "paused",
      cancel_at_period_end: false,
      current_period_end: 1870000000,
    });
    mocks.constructEvent.mockReturnValue(event);
    mocks.getUserIdByStripeCustomerId.mockResolvedValue("user_11");

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mocks.scheduleCancellation).not.toHaveBeenCalled();
    expect(mocks.reactivateSubscription).not.toHaveBeenCalled();
  });
});

// ── Existing webhook behavior unchanged ───────────────────────────────────────
describe("customer.subscription.deleted", () => {
  it("calls cancelSubscriptionByCustomerId", async () => {
    const event = makeEvent("customer.subscription.deleted", {
      id: "sub_del",
      customer: "cus_del",
    });
    mocks.constructEvent.mockReturnValue(event);

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mocks.cancelSubscriptionByCustomerId).toHaveBeenCalledWith("cus_del");
  });
});

describe("invoice.payment_failed", () => {
  it("calls pauseSubscriptionByCustomerId", async () => {
    const event = makeEvent("invoice.payment_failed", {
      customer: "cus_fail",
    });
    mocks.constructEvent.mockReturnValue(event);

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mocks.pauseSubscriptionByCustomerId).toHaveBeenCalledWith("cus_fail");
  });
});

// ── Error / guard cases ───────────────────────────────────────────────────────
describe("webhook guard cases", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when signature verification fails", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("No signatures found");
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });
});
