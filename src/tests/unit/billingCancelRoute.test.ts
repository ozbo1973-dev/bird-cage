import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(),
}));

vi.mock("@/lib/dal/billing", () => ({
  getBillingInfo: vi.fn(),
  scheduleCancellation: vi.fn(),
  reactivateSubscription: vi.fn(),
}));

import { POST } from "@/app/api/billing/cancel/route";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import {
  getBillingInfo,
  scheduleCancellation,
  reactivateSubscription,
} from "@/lib/dal/billing";

const mockGetSession = vi.mocked(auth.api.getSession);
const mockGetStripe = vi.mocked(getStripe);
const mockGetBillingInfo = vi.mocked(getBillingInfo);
const mockScheduleCancellation = vi.mocked(scheduleCancellation);
const mockReactivateSubscription = vi.mocked(reactivateSubscription);

function makeReq(body: object) {
  return new NextRequest("http://localhost/api/billing/cancel", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const VERIFIED_SESSION = {
  user: { id: "u1", emailVerified: true, email: "test@example.com" },
  session: {},
};

const BILLING_INFO = {
  stripeSubscriptionId: "sub_123",
  stripeCustomerId: "cus_123",
  billingPlan: "paid",
  subscriptionStatus: "active" as const,
  currentMonthUsageCents: 0,
  extraUsageCents: 0,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
};

function mockStripeUpdate(currentPeriodEnd: number) {
  const mockUpdate = vi.fn().mockResolvedValue({
    items: { data: [{ current_period_end: currentPeriodEnd }] },
  });
  mockGetStripe.mockReturnValue({
    subscriptions: { update: mockUpdate },
  } as unknown as ReturnType<typeof getStripe>);
  return mockUpdate;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── 401 Unauthorized ──────────────────────────────────────────────────────────

describe("POST /api/billing/cancel — auth", () => {
  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await POST(makeReq({ action: "cancel" }));

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 403 when email not verified", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u1", emailVerified: false, email: "test@example.com" },
      session: {},
    } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>);

    const res = await POST(makeReq({ action: "cancel" }));

    expect(res.status).toBe(403);
  });
});

// ── 404 No subscription ───────────────────────────────────────────────────────

describe("POST /api/billing/cancel — subscription lookup", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      VERIFIED_SESSION as unknown as Awaited<
        ReturnType<typeof auth.api.getSession>
      >,
    );
  });

  it("returns 404 when billingInfo is null", async () => {
    mockGetBillingInfo.mockResolvedValue(null);

    const res = await POST(makeReq({ action: "cancel" }));

    expect(res.status).toBe(404);
  });

  it("returns 404 when stripeSubscriptionId is null", async () => {
    mockGetBillingInfo.mockResolvedValue({
      ...BILLING_INFO,
      stripeSubscriptionId: null,
    });

    const res = await POST(makeReq({ action: "cancel" }));

    expect(res.status).toBe(404);
  });
});

// ── action="cancel" ───────────────────────────────────────────────────────────

describe('POST /api/billing/cancel — action="cancel"', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      VERIFIED_SESSION as unknown as Awaited<
        ReturnType<typeof auth.api.getSession>
      >,
    );
    mockGetBillingInfo.mockResolvedValue(BILLING_INFO);
    mockScheduleCancellation.mockResolvedValue(undefined);
  });

  it("calls Stripe subscriptions.update with cancel_at_period_end=true", async () => {
    const mockUpdate = mockStripeUpdate(1800000000);

    await POST(makeReq({ action: "cancel" }));

    expect(mockUpdate).toHaveBeenCalledWith("sub_123", {
      cancel_at_period_end: true,
    });
  });

  it("calls scheduleCancellation with customerId and periodEnd from Stripe", async () => {
    mockStripeUpdate(1800000000);

    await POST(makeReq({ action: "cancel" }));

    expect(mockScheduleCancellation).toHaveBeenCalledWith("cus_123", 1800000000);
  });

  it("returns { ok: true } on success", async () => {
    mockStripeUpdate(1800000000);

    const res = await POST(makeReq({ action: "cancel" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it("returns 502 when Stripe throws", async () => {
    mockGetStripe.mockReturnValue({
      subscriptions: {
        update: vi.fn().mockRejectedValue(new Error("Stripe error")),
      },
    } as unknown as ReturnType<typeof getStripe>);

    const res = await POST(makeReq({ action: "cancel" }));

    expect(res.status).toBe(502);
  });
});

// ── action="reactivate" ───────────────────────────────────────────────────────

describe('POST /api/billing/cancel — action="reactivate"', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      VERIFIED_SESSION as unknown as Awaited<
        ReturnType<typeof auth.api.getSession>
      >,
    );
    mockGetBillingInfo.mockResolvedValue(BILLING_INFO);
    mockReactivateSubscription.mockResolvedValue(undefined);
  });

  it("calls Stripe subscriptions.update with cancel_at_period_end=false", async () => {
    const mockUpdate = mockStripeUpdate(1800000000);

    await POST(makeReq({ action: "reactivate" }));

    expect(mockUpdate).toHaveBeenCalledWith("sub_123", {
      cancel_at_period_end: false,
    });
  });

  it("calls reactivateSubscription with customerId and periodEnd from Stripe", async () => {
    mockStripeUpdate(1800000000);

    await POST(makeReq({ action: "reactivate" }));

    expect(mockReactivateSubscription).toHaveBeenCalledWith(
      "cus_123",
      1800000000,
    );
  });

  it("returns { ok: true } on success", async () => {
    mockStripeUpdate(1800000000);

    const res = await POST(makeReq({ action: "reactivate" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it("returns 502 when Stripe throws", async () => {
    mockGetStripe.mockReturnValue({
      subscriptions: {
        update: vi.fn().mockRejectedValue(new Error("Stripe error")),
      },
    } as unknown as ReturnType<typeof getStripe>);

    const res = await POST(makeReq({ action: "reactivate" }));

    expect(res.status).toBe(502);
  });
});
