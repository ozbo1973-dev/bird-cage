/**
 * TDD tests for billing utility functions.
 * Tests the new spending-limit-aware logic added to billing.ts.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  canAccessPaidFeatures,
  selectChatModel,
  isSpendingLimitAware,
} from "@/lib/billing";

describe("isSpendingLimitAware", () => {
  it("returns false when limitReached is false (no limit or under limit)", () => {
    expect(isSpendingLimitAware(false)).toBe(false);
  });

  it("returns true when limitReached is true", () => {
    expect(isSpendingLimitAware(true)).toBe(true);
  });
});

// selectChatModel with spending limit override
describe("selectChatModel with spending limit", () => {
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

  it("returns free model for paid user when spending limit is reached", () => {
    const model = selectChatModel("user", "paid", true);
    expect(model).toBe("openrouter/auto");
  });

  it("returns paid model for paid user when spending limit is NOT reached", () => {
    const model = selectChatModel("user", "paid", false);
    expect(model).toBe("openrouter/openai/gpt-oss-120b");
  });

  it("returns paid model for admin even when spending limit is reached (admin bypass)", () => {
    const model = selectChatModel("admin", "free", true);
    expect(model).toBe("openrouter/openai/gpt-oss-120b");
  });

  it("returns free model for free user regardless of limit flag", () => {
    const model = selectChatModel("user", "free", false);
    expect(model).toBe("openrouter/auto");
  });

  it("returns free model for free user when limit reached", () => {
    const model = selectChatModel("user", "free", true);
    expect(model).toBe("openrouter/auto");
  });

  it("uses OPENROUTER_FREE_MODEL env var when limit is reached for paid user", () => {
    process.env.OPENROUTER_FREE_MODEL = "openrouter/mistral/mistral-7b";
    const model = selectChatModel("user", "paid", true);
    expect(model).toBe("openrouter/mistral/mistral-7b");
  });
});

// canAccessPaidFeatures with spending limit check
describe("canAccessPaidFeatures with spending limit", () => {
  it("returns false for paid user when spending limit is reached", () => {
    expect(canAccessPaidFeatures("user", "paid", true)).toBe(false);
  });

  it("returns true for paid user when spending limit is NOT reached", () => {
    expect(canAccessPaidFeatures("user", "paid", false)).toBe(true);
  });

  it("returns true for admin even when spending limit is reached", () => {
    expect(canAccessPaidFeatures("admin", "free", true)).toBe(true);
  });

  it("returns false for free user regardless of limit (existing behavior)", () => {
    expect(canAccessPaidFeatures("user", "free", false)).toBe(false);
  });
});
