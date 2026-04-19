/**
 * Tests for billing utility functions.
 * canAccessPaidFeatures and selectChatModel remain unchanged — limitReached
 * now reflects the combined $4 Pro + extra usage budget rather than a user-set cap.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  canAccessPaidFeatures,
  selectChatModel,
  extractCostCents,
} from "@/lib/billing";

// selectChatModel with limit flag
describe("selectChatModel with limit flag", () => {
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

  it("returns free model for paid user when all usage is exhausted (limitReached=true)", () => {
    const model = selectChatModel("user", "paid", true);
    expect(model).toBe("openrouter/auto");
  });

  it("returns paid model for paid user when usage is within budget (limitReached=false)", () => {
    const model = selectChatModel("user", "paid", false);
    expect(model).toBe("openrouter/openai/gpt-oss-120b");
  });

  it("returns paid model for admin even when limitReached=true (admin bypass)", () => {
    const model = selectChatModel("admin", "free", true);
    expect(model).toBe("openrouter/openai/gpt-oss-120b");
  });

  it("returns free model for free user regardless of limit flag", () => {
    const model = selectChatModel("user", "free", false);
    expect(model).toBe("openrouter/auto");
  });

  it("returns free model for free user when limitReached=true", () => {
    const model = selectChatModel("user", "free", true);
    expect(model).toBe("openrouter/auto");
  });

  it("uses OPENROUTER_FREE_MODEL env var when limit is reached for paid user", () => {
    process.env.OPENROUTER_FREE_MODEL = "openrouter/mistral/mistral-7b";
    const model = selectChatModel("user", "paid", true);
    expect(model).toBe("openrouter/mistral/mistral-7b");
  });
});

// extractCostCents
describe("extractCostCents", () => {
  it("converts a fractional dollar amount to whole cents", () => {
    expect(extractCostCents({ cost: 0.01 })).toBe(1);
  });

  it("rounds to nearest cent", () => {
    expect(extractCostCents({ cost: 0.0356 })).toBe(4);
  });

  it("rounds 0.5 up", () => {
    expect(extractCostCents({ cost: 0.035 })).toBe(4);
  });

  it("returns 0 when cost is undefined", () => {
    expect(extractCostCents({ cost: undefined })).toBe(0);
  });

  it("returns 0 when usage is null", () => {
    expect(extractCostCents(null)).toBe(0);
  });

  it("returns 0 when usage is undefined", () => {
    expect(extractCostCents(undefined)).toBe(0);
  });

  it("returns 0 when cost is 0", () => {
    expect(extractCostCents({ cost: 0 })).toBe(0);
  });

  it("returns 0 when cost is sub-cent (rounds down)", () => {
    expect(extractCostCents({ cost: 0.001 })).toBe(0);
  });

  it("handles a realistic multi-cent cost", () => {
    expect(extractCostCents({ cost: 0.03 })).toBe(3);
  });
});

// canAccessPaidFeatures with limit check
describe("canAccessPaidFeatures with limit check", () => {
  it("returns false for paid user when all usage is exhausted (limitReached=true)", () => {
    expect(canAccessPaidFeatures("user", "paid", true)).toBe(false);
  });

  it("returns true for paid user when usage is within budget (limitReached=false)", () => {
    expect(canAccessPaidFeatures("user", "paid", false)).toBe(true);
  });

  it("returns true for admin even when limitReached=true", () => {
    expect(canAccessPaidFeatures("admin", "free", true)).toBe(true);
  });

  it("returns false for free user regardless of limit (existing behavior)", () => {
    expect(canAccessPaidFeatures("user", "free", false)).toBe(false);
  });
});
