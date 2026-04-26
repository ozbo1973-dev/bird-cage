import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/dal/birdyChats", () => ({
  deleteBirdyChat: vi.fn(),
}));

import { DELETE } from "@/app/api/birdy-chat/[id]/route";
import { auth } from "@/lib/auth";
import { deleteBirdyChat } from "@/lib/dal/birdyChats";

const mockGetSession = vi.mocked(auth.api.getSession);
const mockDeleteBirdyChat = vi.mocked(deleteBirdyChat);

const VERIFIED_SESSION = {
  user: { id: "user-1", emailVerified: true },
  session: {},
};

function makeReq(id = "42") {
  return new NextRequest(`http://localhost/api/birdy-chat/${id}`, {
    method: "DELETE",
  });
}

function makeParams(id = "42") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Auth guards ───────────────────────────────────────────────────────────────

describe("DELETE /api/birdy-chat/[id] — auth", () => {
  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await DELETE(makeReq(), makeParams());

    expect(res.status).toBe(401);
  });

  it("returns 403 when email not verified", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-1", emailVerified: false },
      session: {},
    } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>);

    const res = await DELETE(makeReq(), makeParams());

    expect(res.status).toBe(403);
  });
});

// ── Success ───────────────────────────────────────────────────────────────────

describe("DELETE /api/birdy-chat/[id] — success", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      VERIFIED_SESSION as unknown as Awaited<ReturnType<typeof auth.api.getSession>>,
    );
  });

  it("returns 204 on successful delete", async () => {
    mockDeleteBirdyChat.mockResolvedValue({ ok: true });

    const res = await DELETE(makeReq("42"), makeParams("42"));

    expect(res.status).toBe(204);
  });

  it("calls deleteBirdyChat with parsed chatId and userId", async () => {
    mockDeleteBirdyChat.mockResolvedValue({ ok: true });

    await DELETE(makeReq("7"), makeParams("7"));

    expect(mockDeleteBirdyChat).toHaveBeenCalledWith(7, "user-1");
  });
});

// ── Not found / ownership ─────────────────────────────────────────────────────

describe("DELETE /api/birdy-chat/[id] — not found", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      VERIFIED_SESSION as unknown as Awaited<ReturnType<typeof auth.api.getSession>>,
    );
  });

  it("returns 404 when chat does not exist or belongs to another user", async () => {
    mockDeleteBirdyChat.mockResolvedValue(null);

    const res = await DELETE(makeReq("99"), makeParams("99"));

    expect(res.status).toBe(404);
  });
});
