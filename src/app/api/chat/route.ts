import OpenAI from "openai";
import { NextRequest } from "next/server";
import { auth } from "../../../lib/auth";
import { getAuthBaseUrl } from "../../../lib/get-auth-base-url";
import { getUserBillingInfo, selectChatModel, extractCostCents } from "../../../lib/billing";
import { isLimitReached, logUsage } from "../../../lib/dal/billing";

const SYSTEM_PROMPT = `You are an expert ornithologist helping birding enthusiasts identify birds.

When a user describes a bird they have seen, identify it and respond with:
1. Ask clarifying questions if the description is insufficient to make a confident identification.
2. Once confident, provide:
   - Bird type (e.g. Raptor, Songbird, Waterfowl, Shorebird, etc.)
   - Species (common name, e.g. Red-tailed Hawk)
   - A brief summary of the bird (under 200 words) covering appearance, habitat, and behavior.
   - End your final identification response with a JSON block in this exact format:
     {"identified": true, "type": "...", "species": "..."}

If you are still gathering information, do NOT include the JSON block yet.`;

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

  // Check spending limit (admins bypass)
  const limitReached = role !== "admin" && (await isLimitReached(session.user.id));

  const model = selectChatModel(role, billingPlan, limitReached);
  const client = getClient();

  // Create the stream first — allows errors (auth, quota, bad model) to surface as HTTP errors
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
      const costCents = extractCostCents(lastUsage);
      if (billingPlan === "paid" && costCents > 0) {
        await logUsage(userId, model, costCents).catch((err) => {
          console.error("Failed to log chat usage:", err);
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
