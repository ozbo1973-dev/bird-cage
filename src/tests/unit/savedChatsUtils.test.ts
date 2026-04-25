import { describe, it, expect } from "vitest";
import { formatChatDate } from "@/lib/savedChatsUtils";

describe("formatChatDate", () => {
  it("returns a non-empty string for a valid timestamp", () => {
    const ts = new Date("2026-03-15T10:30:00Z").getTime();
    expect(formatChatDate(ts)).toBeTruthy();
  });

  it("includes the year in the formatted string", () => {
    const ts = new Date("2026-03-15T10:30:00Z").getTime();
    expect(formatChatDate(ts)).toMatch(/2026/);
  });

  it("returns different strings for different timestamps", () => {
    const ts1 = new Date("2026-01-01").getTime();
    const ts2 = new Date("2026-06-15").getTime();
    expect(formatChatDate(ts1)).not.toBe(formatChatDate(ts2));
  });

  it("handles zero timestamp without throwing", () => {
    expect(() => formatChatDate(0)).not.toThrow();
  });
});
