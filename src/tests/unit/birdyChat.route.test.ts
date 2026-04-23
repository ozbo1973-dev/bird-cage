import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/billing", () => ({
  getUserBillingInfo: vi.fn(),
  selectChatModel: vi.fn(),
  extractCost: vi.fn(),
}));

vi.mock("@/lib/dal/billing", () => ({
  isLimitReached: vi.fn(),
  logUsage: vi.fn(),
}));

vi.mock("openai", () => ({
  default: vi.fn(function () {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  }),
}));

vi.mock("@/lib/get-auth-base-url", () => ({
  getAuthBaseUrl: () => "http://localhost:3000",
}));

const mockCreate = vi.fn();

import { POST } from "@/app/api/birdy-chat/route";
import { auth } from "@/lib/auth";
import {
  getUserBillingInfo,
  selectChatModel,
  extractCost,
} from "@/lib/billing";
import { isLimitReached, logUsage } from "@/lib/dal/billing";

const mockGetSession = vi.mocked(auth.api.getSession);
const mockGetBillingInfo = vi.mocked(getUserBillingInfo);
const mockSelectChatModel = vi.mocked(selectChatModel);
const mockExtractCost = vi.mocked(extractCost);
const mockIsLimitReached = vi.mocked(isLimitReached);
const mockLogUsage = vi.mocked(logUsage);

function makeReq(body = { messages: [{ role: "user", content: "Tell me about hummingbirds" }] }) {
  return new NextRequest("http://localhost/api/birdy-chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

async function* makeStreamChunks(text = "Hummingbirds are amazing birds.", cost?: number) {
  yield { choices: [{ delta: { content: text } }] };
  yield { choices: [{ delta: { content: "" } }], usage: cost !== undefined ? { cost } : undefined };
}

async function consumeStream(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let result = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

const VERIFIED_SESSION = {
  user: { id: "user-1", emailVerified: true },
  session: {},
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetBillingInfo.mockResolvedValue({ role: "user", billingPlan: "free" });
  mockSelectChatModel.mockReturnValue("openrouter/auto");
  mockExtractCost.mockReturnValue({ wholeCents: 0, remainderMillicents: 0 });
  mockIsLimitReached.mockResolvedValue(false);
  mockLogUsage.mockResolvedValue(undefined);
  mockCreate.mockReturnValue(makeStreamChunks());
});

// ── Auth guards ───────────────────────────────────────────────────────────────

describe("POST /api/birdy-chat — auth", () => {
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

// ── Streaming response ────────────────────────────────────────────────────────

describe("POST /api/birdy-chat — streaming", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      VERIFIED_SESSION as unknown as Awaited<ReturnType<typeof auth.api.getSession>>,
    );
  });

  it("returns 200 with streaming text for verified user", async () => {
    mockCreate.mockReturnValue(makeStreamChunks("Great blue herons are wading birds."));

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");

    const body = await consumeStream(res);
    expect(body).toContain("Great blue herons are wading birds.");
  });

  it("includes X-Limit-Reached header in response", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Limit-Reached")).toBeDefined();
  });

  it("X-Limit-Reached is false when limit not reached", async () => {
    mockIsLimitReached.mockResolvedValue(false);

    const res = await POST(makeReq());
    expect(res.headers.get("X-Limit-Reached")).toBe("false");
  });

  it("X-Limit-Reached is true when limit reached", async () => {
    mockIsLimitReached.mockResolvedValue(true);

    const res = await POST(makeReq());
    expect(res.headers.get("X-Limit-Reached")).toBe("true");
  });
});

// ── Model selection ───────────────────────────────────────────────────────────

describe("POST /api/birdy-chat — model selection", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      VERIFIED_SESSION as unknown as Awaited<ReturnType<typeof auth.api.getSession>>,
    );
  });

  it("calls selectChatModel with role, billingPlan, and limitReached", async () => {
    mockGetBillingInfo.mockResolvedValue({ role: "user", billingPlan: "free" });
    mockIsLimitReached.mockResolvedValue(false);

    await POST(makeReq());

    expect(mockSelectChatModel).toHaveBeenCalledWith("user", "free", false);
  });

  it("admin bypasses spending limit check (limitReached=false regardless)", async () => {
    mockGetBillingInfo.mockResolvedValue({ role: "admin", billingPlan: "free" });

    await POST(makeReq());

    expect(mockSelectChatModel).toHaveBeenCalledWith("admin", "free", false);
    expect(mockIsLimitReached).not.toHaveBeenCalled();
  });

  it("paid user gets selectChatModel called with their billingPlan", async () => {
    mockGetBillingInfo.mockResolvedValue({ role: "user", billingPlan: "paid" });
    mockIsLimitReached.mockResolvedValue(false);

    await POST(makeReq());

    expect(mockSelectChatModel).toHaveBeenCalledWith("user", "paid", false);
  });
});

// ── Usage logging ─────────────────────────────────────────────────────────────

describe("POST /api/birdy-chat — usage logging", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      VERIFIED_SESSION as unknown as Awaited<ReturnType<typeof auth.api.getSession>>,
    );
    mockSelectChatModel.mockReturnValue("openrouter/auto");
  });

  it("logs usage when cost is non-zero", async () => {
    mockCreate.mockReturnValue(makeStreamChunks("Some text.", 0.05));
    mockExtractCost.mockReturnValue({ wholeCents: 5, remainderMillicents: 0 });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    await consumeStream(res);

    expect(mockLogUsage).toHaveBeenCalledWith("user-1", "openrouter/auto", 5, 0);
  });

  it("does not log usage when cost is zero", async () => {
    mockCreate.mockReturnValue(makeStreamChunks("Some text.", 0));
    mockExtractCost.mockReturnValue({ wholeCents: 0, remainderMillicents: 0 });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    await consumeStream(res);

    expect(mockLogUsage).not.toHaveBeenCalled();
  });
});

// ── OpenAI error handling ─────────────────────────────────────────────────────

describe("POST /api/birdy-chat — error handling", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      VERIFIED_SESSION as unknown as Awaited<ReturnType<typeof auth.api.getSession>>,
    );
  });

  it("returns 500 when OpenAI throws", async () => {
    mockCreate.mockRejectedValue({ status: 500, message: "Internal error" });

    const res = await POST(makeReq());

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("propagates upstream error status code", async () => {
    mockCreate.mockRejectedValue({ status: 429, message: "Rate limited" });

    const res = await POST(makeReq());

    expect(res.status).toBe(429);
  });
});
