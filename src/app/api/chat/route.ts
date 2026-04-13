import OpenAI from "openai";
import { NextRequest } from "next/server";
import { auth } from "../../../lib/auth";
import { getAuthBaseUrl } from "../../../lib/get-auth-base-url";
import { getUserBillingInfo, selectChatModel } from "../../../lib/billing";

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

  const billing = await getUserBillingInfo(session.user.id);
  const model = billing
    ? selectChatModel(billing.role, billing.billingPlan)
    : (process.env.OPENROUTER_FREE_MODEL ?? "openrouter/auto");
  const client = getClient();

  // Create the stream first — allows errors (auth, quota, bad model) to surface as HTTP errors
  let stream: Awaited<ReturnType<typeof client.chat.completions.create>>;
  try {
    stream = await client.chat.completions.create({
      model,
      max_tokens: 1024,
      stream: true,
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

  (async () => {
    try {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) {
          await writer.write(encoder.encode(text));
        }
      }
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
