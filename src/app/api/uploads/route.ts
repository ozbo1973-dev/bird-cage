import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { getUploadDir } from "@/lib/uploads";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 413 });
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(path.join(getUploadDir(), filename), buffer);

  return NextResponse.json({ path: filename });
}
