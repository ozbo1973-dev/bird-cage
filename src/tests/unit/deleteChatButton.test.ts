import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { deleteChatRequest } from "@/components/DeleteChatButton";

beforeEach(() => vi.clearAllMocks());

describe("deleteChatRequest", () => {
  it("calls DELETE /api/birdy-chat/[id] with correct URL", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await deleteChatRequest(42);

    expect(mockFetch).toHaveBeenCalledWith("/api/birdy-chat/42", { method: "DELETE" });
  });

  it("returns true when response is ok", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const result = await deleteChatRequest(42);

    expect(result).toBe(true);
  });

  it("returns false when response is not ok (404)", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    const result = await deleteChatRequest(42);

    expect(result).toBe(false);
  });

  it("returns false when response is not ok (500)", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const result = await deleteChatRequest(99);

    expect(result).toBe(false);
  });
});
