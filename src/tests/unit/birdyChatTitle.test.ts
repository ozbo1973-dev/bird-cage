import { describe, it, expect } from "vitest";
import { getTitlePreFill } from "@/lib/birdyChatUtils";

describe("getTitlePreFill", () => {
  const fixedDate = new Date("2026-04-24T00:00:00Z");

  it("returns the message unchanged when it is under 60 chars", () => {
    const result = getTitlePreFill("I saw a small brown bird with a red breast", fixedDate);
    expect(result).toBe("I saw a small brown bird with a red breast");
  });

  it("returns the message unchanged when it is exactly 60 chars", () => {
    const msg = "a".repeat(60);
    const result = getTitlePreFill(msg, fixedDate);
    expect(result).toBe(msg);
  });

  it("truncates to 60 chars and appends '...' when message exceeds 60 chars", () => {
    const msg = "a".repeat(80);
    const result = getTitlePreFill(msg, fixedDate);
    expect(result).toBe("a".repeat(60) + "...");
  });

  it("falls back to a date string when no message is provided", () => {
    const result = getTitlePreFill(undefined, fixedDate);
    expect(result).toMatch(/Chat - .+/);
  });

  it("falls back to a date string when an empty string is provided", () => {
    const result = getTitlePreFill("", fixedDate);
    expect(result).toMatch(/Chat - .+/);
  });

  it("falls back to a date string when only whitespace is provided", () => {
    const result = getTitlePreFill("   ", fixedDate);
    expect(result).toMatch(/Chat - .+/);
  });

  it("trims the message before checking length and truncating", () => {
    const padded = "  I saw a hawk  ";
    const result = getTitlePreFill(padded, fixedDate);
    expect(result).toBe("I saw a hawk");
  });

  it("includes the date in the fallback title", () => {
    const result = getTitlePreFill(undefined, new Date("2026-04-24T00:00:00Z"));
    expect(result).toContain("Apr 24, 2026");
  });
});
