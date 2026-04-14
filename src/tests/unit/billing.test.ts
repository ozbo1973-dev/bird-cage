import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  canAccessPaidFeatures,
  selectChatModel,
  type BillingPlan,
} from "@/lib/billing";

// ──────────────────────────────────────────────────────────────────────────────
// canAccessPaidFeatures
// ──────────────────────────────────────────────────────────────────────────────

describe("canAccessPaidFeatures", () => {
  it("returns false for free user", () => {
    expect(canAccessPaidFeatures("user", "free")).toBe(false);
  });

  it("returns true for paid user", () => {
    expect(canAccessPaidFeatures("user", "paid")).toBe(true);
  });

  it("returns true for admin regardless of billing plan (free)", () => {
    expect(canAccessPaidFeatures("admin", "free")).toBe(true);
  });

  it("returns true for admin with paid plan", () => {
    expect(canAccessPaidFeatures("admin", "paid")).toBe(true);
  });

  it("returns false for unknown role with free plan", () => {
    expect(canAccessPaidFeatures("guest", "free")).toBe(false);
  });

  it("returns true for unknown role with paid plan", () => {
    expect(canAccessPaidFeatures("guest", "paid")).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// selectChatModel
// ──────────────────────────────────────────────────────────────────────────────

describe("selectChatModel", () => {
  const originalModel = process.env.OPENROUTER_MODEL;
  const originalFreeModel = process.env.OPENROUTER_FREE_MODEL;

  beforeEach(() => {
    delete process.env.OPENROUTER_MODEL;
    delete process.env.OPENROUTER_FREE_MODEL;
  });

  afterEach(() => {
    if (originalModel !== undefined) {
      process.env.OPENROUTER_MODEL = originalModel;
    } else {
      delete process.env.OPENROUTER_MODEL;
    }
    if (originalFreeModel !== undefined) {
      process.env.OPENROUTER_FREE_MODEL = originalFreeModel;
    } else {
      delete process.env.OPENROUTER_FREE_MODEL;
    }
  });

  it("returns free model default for free user when no env vars set", () => {
    const model = selectChatModel("user", "free");
    expect(model).toBe("openrouter/auto");
  });

  it("returns paid model default for paid user when no env vars set", () => {
    const model = selectChatModel("user", "paid");
    expect(model).toBe("openrouter/openai/gpt-oss-120b");
  });

  it("returns paid model default for admin with free plan when no env vars set", () => {
    const model = selectChatModel("admin", "free");
    expect(model).toBe("openrouter/openai/gpt-oss-120b");
  });

  it("returns OPENROUTER_FREE_MODEL env var for free user", () => {
    process.env.OPENROUTER_FREE_MODEL = "openrouter/mistral/mistral-7b";
    const model = selectChatModel("user", "free");
    expect(model).toBe("openrouter/mistral/mistral-7b");
  });

  it("returns OPENROUTER_MODEL env var for paid user", () => {
    process.env.OPENROUTER_MODEL = "openrouter/anthropic/claude-3-5-sonnet";
    const model = selectChatModel("user", "paid");
    expect(model).toBe("openrouter/anthropic/claude-3-5-sonnet");
  });

  it("returns OPENROUTER_MODEL env var for admin with free plan (admin bypass)", () => {
    process.env.OPENROUTER_MODEL = "openrouter/anthropic/claude-3-5-sonnet";
    const model = selectChatModel("admin", "free");
    expect(model).toBe("openrouter/anthropic/claude-3-5-sonnet");
  });

  it("uses OPENROUTER_FREE_MODEL for free user even if OPENROUTER_MODEL is set", () => {
    process.env.OPENROUTER_MODEL = "openrouter/anthropic/claude-3-5-sonnet";
    process.env.OPENROUTER_FREE_MODEL = "openrouter/mistral/mistral-7b";
    const model = selectChatModel("user", "free");
    expect(model).toBe("openrouter/mistral/mistral-7b");
  });

  it("uses OPENROUTER_MODEL for paid user even if OPENROUTER_FREE_MODEL is set", () => {
    process.env.OPENROUTER_MODEL = "openrouter/anthropic/claude-3-5-sonnet";
    process.env.OPENROUTER_FREE_MODEL = "openrouter/mistral/mistral-7b";
    const model = selectChatModel("user", "paid");
    expect(model).toBe("openrouter/anthropic/claude-3-5-sonnet");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Billing plan validation helpers (mirrors billing page / action logic)
// ──────────────────────────────────────────────────────────────────────────────

function isValidPlan(plan: unknown): plan is BillingPlan {
  return plan === "free" || plan === "paid";
}

describe("isValidPlan", () => {
  it("accepts 'free'", () => {
    expect(isValidPlan("free")).toBe(true);
  });

  it("accepts 'paid'", () => {
    expect(isValidPlan("paid")).toBe(true);
  });

  it("rejects unknown strings", () => {
    expect(isValidPlan("enterprise")).toBe(false);
  });

  it("rejects null", () => {
    expect(isValidPlan(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isValidPlan(undefined)).toBe(false);
  });

  it("rejects numbers", () => {
    expect(isValidPlan(1)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Billing access scenarios (business rule table)
// ──────────────────────────────────────────────────────────────────────────────

describe("billing access scenarios", () => {
  const scenarios: Array<{
    label: string;
    role: string;
    plan: BillingPlan;
    expectAccess: boolean;
    expectModel: "free" | "paid";
  }> = [
    {
      label: "regular free user",
      role: "user",
      plan: "free",
      expectAccess: false,
      expectModel: "free",
    },
    {
      label: "regular paid user",
      role: "user",
      plan: "paid",
      expectAccess: true,
      expectModel: "paid",
    },
    {
      label: "admin with free plan",
      role: "admin",
      plan: "free",
      expectAccess: true,
      expectModel: "paid",
    },
    {
      label: "admin with paid plan",
      role: "admin",
      plan: "paid",
      expectAccess: true,
      expectModel: "paid",
    },
  ];

  for (const { label, role, plan, expectAccess, expectModel } of scenarios) {
    it(`${label} — canAccessPaidFeatures: ${expectAccess}`, () => {
      expect(canAccessPaidFeatures(role, plan)).toBe(expectAccess);
    });

    it(`${label} — uses ${expectModel} AI model`, () => {
      // Without env vars set, default model tier should match expectModel
      const paidDefault = "openrouter/openai/gpt-oss-120b";
      const freeDefault = "openrouter/auto";
      const model = selectChatModel(role, plan);
      const expected = expectModel === "paid" ? paidDefault : freeDefault;
      expect(model).toBe(expected);
    });
  }
});
