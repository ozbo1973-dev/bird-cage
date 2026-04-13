import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { parseIdentification } from "@/lib/chat";
import { getAuthBaseUrl } from "@/lib/get-auth-base-url";
import { getUserBillingInfo, canAccessPaidFeatures } from "@/lib/billing";

const VISION_MODEL = process.env.OPENROUTER_VISION_MODEL ?? "openai/gpt-4o";

const IDENTIFY_PROMPT =
  "You are an expert ornithologist. Identify the bird in this photo. " +
  "Provide: bird type (e.g. Raptor, Songbird), species (common name), " +
  "and a brief summary under 200 words covering appearance, habitat, and behaviour. " +
  'End with exactly: {"identified": true, "type": "...", "species": "..."}';

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
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified)
    return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const billing = await getUserBillingInfo(session.user.id);
  if (!billing || !canAccessPaidFeatures(billing.role, billing.billingPlan)) {
    return NextResponse.json(
      { error: "Photo identification requires a paid plan. Upgrade to Birder Pro to use this feature." },
      { status: 403 },
    );
  }

  const body = (await req.json()) as { photoBase64?: string };
  const { photoBase64 } = body;

  if (!photoBase64 || !photoBase64.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "Invalid or missing photo data" },
      { status: 400 },
    );
  }

  const client = getClient();

  let responseText: string;
  try {
    const completion = await client.chat.completions.create({
      model: VISION_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: photoBase64 } },
            { type: "text", text: IDENTIFY_PROMPT },
          ],
        },
      ],
    });
    responseText = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    const message =
      (err as { message?: string }).message ?? "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const result = parseIdentification(responseText);
  if (result.ok) {
    return NextResponse.json(result.value);
  }

  // strict:false disables strictNullChecks, which prevents TS from narrowing
  // the discriminated union via control-flow alone — cast explicitly.
  const { reason } = result as {
    ok: false;
    reason: "not_identified" | "parse_error";
  };
  const status = reason === "parse_error" ? 422 : 200;
  const error =
    reason === "parse_error"
      ? "Could not parse bird identification from AI response"
      : "AI could not identify a bird in this photo";
  return NextResponse.json({ error }, { status });
}
