import OpenAI from "openai";
import { NextRequest } from "next/server";
import { auth } from "../../../lib/auth";
import { getAuthBaseUrl } from "../../../lib/get-auth-base-url";
import { getUserBillingInfo, selectChatModel, extractCost } from "../../../lib/billing";
import { isLimitReached, logUsage } from "../../../lib/dal/billing";

const SYSTEM_PROMPT = `You are Birdy, a knowledgeable and enthusiastic birding companion. You help birding enthusiasts with all aspects of the hobby, including:

- Bird identification from descriptions (plumage, size, behavior, habitat, song)
- Bird behavior, migration patterns, and seasonal movements
- Habitat preferences and where to find specific species
- Birding equipment recommendations (binoculars, spotting scopes, field guides, apps)
- Birding hotspots and locations worldwide
- Conservation topics and how to support bird populations
- Tips for improving birding skills and field techniques
- Answering questions about any bird species

When a user describes a bird for identification, ask clarifying questions if needed, then provide the common name, scientific name, and a brief description of key identification features.

Be friendly, encouraging, and share your passion for birds. Welcome all skill levels from beginners to experienced birders.`;

function getClient() {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": getAuthBaseUrl(),
      "X-Title": "Bird Cage",
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (!session.user.emailVerified)
    return new Response("Email not verified", { status: 403 });

  const { messages } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const billingInfo = await getUserBillingInfo(session.user.id);
  const role = billingInfo?.role ?? "user";
  const billingPlan = billingInfo?.billingPlan ?? "free";

  // Admins bypass spending limit check
  const limitReached = role !== "admin" && (await isLimitReached(session.user.id));

  const model = selectChatModel(role, billingPlan, limitReached);
  const client = getClient();

  let stream: Awaited<ReturnType<typeof client.chat.completions.create>>;
  try {
    stream = await client.chat.completions.create({
      model,
      max_tokens: 1024,
      stream: true,
      stream_options: { include_usage: true },
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message =
      (err as { message?: string }).message ?? "AI request failed";
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const userId = session.user.id;
  (async () => {
    try {
      let lastUsage: unknown = undefined;
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) {
          await writer.write(encoder.encode(text));
        }
        if (chunk.usage) lastUsage = chunk.usage;
      }
      const { wholeCents, remainderMillicents } = extractCost(lastUsage);
      if (wholeCents > 0 || remainderMillicents > 0) {
        await logUsage(userId, model, wholeCents, remainderMillicents).catch((err) => {
          console.error("Failed to log birdy-chat usage:", err);
        });
      }
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Limit-Reached": limitReached ? "true" : "false",
    },
  });
}
