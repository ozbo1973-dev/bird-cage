import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  canAccessPaidFeatures,
  selectChatModel,
  isValidPlan,
  type BillingPlan,
} from "@/lib/billing";

// --- canAccessPaidFeatures ---

describe("canAccessPaidFeatures", () => {
  it("returns true for admin with free plan", () => {
    expect(canAccessPaidFeatures("admin", "free")).toBe(true);
  });

  it("returns true for admin with paid plan", () => {
    expect(canAccessPaidFeatures("admin", "paid")).toBe(true);
  });

  it("returns false for user with free plan", () => {
    expect(canAccessPaidFeatures("user", "free")).toBe(false);
  });

  it("returns true for user with paid plan", () => {
    expect(canAccessPaidFeatures("user", "paid")).toBe(true);
  });

  it("returns false for unknown role with free plan", () => {
    expect(canAccessPaidFeatures("moderator", "free")).toBe(false);
  });

  it("returns true for unknown role with paid plan", () => {
    expect(canAccessPaidFeatures("moderator", "paid")).toBe(true);
  });
});

// --- selectChatModel ---

describe("selectChatModel", () => {
  beforeEach(() => {
    delete process.env.OPENROUTER_MODEL;
    delete process.env.OPENROUTER_FREE_MODEL;
  });

  it("free user gets free model (default)", () => {
    const model = selectChatModel("user", "free");
    expect(model).toBe("openrouter/auto");
  });

  it("paid user gets paid model (default)", () => {
    const model = selectChatModel("user", "paid");
    expect(model).toBe("openrouter/openai/gpt-oss-120b");
  });

  it("admin with free plan gets paid model", () => {
    const model = selectChatModel("admin", "free");
    expect(model).toBe("openrouter/openai/gpt-oss-120b");
  });

  it("admin with paid plan gets paid model", () => {
    const model = selectChatModel("admin", "paid");
    expect(model).toBe("openrouter/openai/gpt-oss-120b");
  });

  it("free user uses OPENROUTER_FREE_MODEL env override", () => {
    process.env.OPENROUTER_FREE_MODEL = "openrouter/google/gemma-free";
    expect(selectChatModel("user", "free")).toBe("openrouter/google/gemma-free");
  });

  it("paid user uses OPENROUTER_MODEL env override", () => {
    process.env.OPENROUTER_MODEL = "openrouter/anthropic/claude-3-haiku";
    expect(selectChatModel("user", "paid")).toBe("openrouter/anthropic/claude-3-haiku");
  });

  it("admin uses OPENROUTER_MODEL env override", () => {
    process.env.OPENROUTER_MODEL = "openrouter/anthropic/claude-opus-4";
    expect(selectChatModel("admin", "free")).toBe("openrouter/anthropic/claude-opus-4");
  });

  it("returns correct defaults when env vars are not set", () => {
    expect(selectChatModel("user", "free")).toBe("openrouter/auto");
    expect(selectChatModel("user", "paid")).toBe("openrouter/openai/gpt-oss-120b");
  });
});

// --- isValidPlan ---

describe("isValidPlan", () => {
  it("returns true for 'free'", () => {
    expect(isValidPlan("free")).toBe(true);
  });

  it("returns true for 'paid'", () => {
    expect(isValidPlan("paid")).toBe(true);
  });

  it("returns false for 'premium'", () => {
    expect(isValidPlan("premium")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidPlan("")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isValidPlan(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isValidPlan(undefined)).toBe(false);
  });
});

// --- Full scenario table ---

describe("billing scenarios", () => {
  type Scenario = {
    label: string;
    role: string;
    plan: BillingPlan;
    canAccessPhoto: boolean;
    modelType: "free" | "paid";
  };

  const scenarios: Scenario[] = [
    { label: "free user", role: "user", plan: "free", canAccessPhoto: false, modelType: "free" },
    { label: "paid user", role: "user", plan: "paid", canAccessPhoto: true, modelType: "paid" },
    { label: "admin with free plan", role: "admin", plan: "free", canAccessPhoto: true, modelType: "paid" },
    { label: "admin with paid plan", role: "admin", plan: "paid", canAccessPhoto: true, modelType: "paid" },
  ];

  beforeEach(() => {
    delete process.env.OPENROUTER_MODEL;
    delete process.env.OPENROUTER_FREE_MODEL;
  });

  for (const { label, role, plan, canAccessPhoto, modelType } of scenarios) {
    it(`${label}: canAccessPhoto=${canAccessPhoto}, modelType=${modelType}`, () => {
      expect(canAccessPaidFeatures(role, plan)).toBe(canAccessPhoto);

      const model = selectChatModel(role, plan);
      if (modelType === "free") {
        expect(model).toBe("openrouter/auto");
      } else {
        expect(model).toBe("openrouter/openai/gpt-oss-120b");
      }
    });
  }
});
