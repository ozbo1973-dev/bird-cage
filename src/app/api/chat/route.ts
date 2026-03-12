import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { auth } from "../../../lib/auth";

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

const DEFAULT_MODEL = "openrouter/openai/gpt-oss-120b";

const client = new Anthropic({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "Bird Cage",
  },
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return new Response("Unauthorized", { status: 401 });

  const { messages } = await req.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    try {
      const stream = client.messages.stream({
        model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      });

      stream.on("text", async (text) => {
        await writer.write(encoder.encode(text));
      });

      await stream.finalMessage();
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
