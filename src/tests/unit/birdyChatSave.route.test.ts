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
  saveBirdyChat: vi.fn(),
}));

import { POST } from "@/app/api/birdy-chat/save/route";
import { auth } from "@/lib/auth";
import { saveBirdyChat } from "@/lib/dal/birdyChats";

const mockGetSession = vi.mocked(auth.api.getSession);
const mockSaveBirdyChat = vi.mocked(saveBirdyChat);

const VERIFIED_SESSION = {
  user: { id: "user-1", emailVerified: true },
  session: {},
};

function makeReq(body: unknown = { title: "My Chat", messages: [{ role: "user", content: "Hello" }] }) {
  return new NextRequest("http://localhost/api/birdy-chat/save", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSaveBirdyChat.mockResolvedValue({ chatId: 42 });
});

// ── Auth guards ───────────────────────────────────────────────────────────────

describe("POST /api/birdy-chat/save — auth", () => {
  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await POST(makeReq());

    expect(res.status).toBe(401);
  });

  it("returns 403 when email not verified", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-1", emailVerified: false },
      session: {},
    } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>);

    const res = await POST(makeReq());

    expect(res.status).toBe(403);
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe("POST /api/birdy-chat/save — validation", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      VERIFIED_SESSION as unknown as Awaited<ReturnType<typeof auth.api.getSession>>,
    );
  });

  it("returns 400 when title is empty string", async () => {
    const res = await POST(makeReq({ title: "", messages: [{ role: "user", content: "Hi" }] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makeReq({ messages: [{ role: "user", content: "Hi" }] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when messages array is empty", async () => {
    const res = await POST(makeReq({ title: "My Chat", messages: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when messages is missing", async () => {
    const res = await POST(makeReq({ title: "My Chat" }));
    expect(res.status).toBe(400);
  });
});

// ── Success ───────────────────────────────────────────────────────────────────

describe("POST /api/birdy-chat/save — success", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      VERIFIED_SESSION as unknown as Awaited<ReturnType<typeof auth.api.getSession>>,
    );
  });

  it("returns { chatId } on successful save", async () => {
    mockSaveBirdyChat.mockResolvedValue({ chatId: 42 });

    const res = await POST(makeReq({ title: "My Chat", messages: [{ role: "user", content: "Hello" }] }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ chatId: 42 });
  });

  it("calls saveBirdyChat with userId, title, and messages", async () => {
    const messages = [{ role: "user", content: "What bird is this?" }];

    await POST(makeReq({ title: "Morning Birds", messages }));

    expect(mockSaveBirdyChat).toHaveBeenCalledWith("user-1", "Morning Birds", messages);
  });
});
