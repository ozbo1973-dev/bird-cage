import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { getUploadPath, isSafeFilename } from "@/lib/uploads";
import { parseIdentification } from "@/lib/chat";

const VISION_MODEL = "openai/gpt-4o";

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
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Bird Cage",
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoPath } = (await req.json()) as { photoPath: string };

  if (!photoPath || !isSafeFilename(photoPath)) {
    return NextResponse.json({ error: "Invalid photo path" }, { status: 400 });
  }

  const filePath = getUploadPath(photoPath);
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const ext = path.extname(photoPath).toLowerCase().replace(".", "");
  const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

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
            { type: "image_url", image_url: { url: dataUrl } },
            { type: "text", text: IDENTIFY_PROMPT },
          ],
        },
      ],
    });
    responseText = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    const message = (err as { message?: string }).message ?? "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const result = parseIdentification(responseText);
  if (!result) {
    return NextResponse.json({ error: "Could not identify bird from photo" }, { status: 422 });
  }

  return NextResponse.json(result);
}
