import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { getUploadDir, getUploadPath, isSafeFilename } from "@/lib/uploads";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { filename } = await params;

  // Proxy private Vercel Blob URLs stored in the DB
  if (filename.startsWith("https://")) {
    const { get } = await import("@vercel/blob");
    const result = await get(filename, { access: "private" });
    if (!result || result.statusCode !== 200) return new Response("Not found", { status: 404 });
    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  }

  if (!isSafeFilename(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = await getUploadPath(filename);

  // Canonical path check — reject any path that escapes the upload directory
  const resolvedFile = path.resolve(filePath);
  const resolvedDir = path.resolve(await getUploadDir());
  if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = MIME_MAP[ext] ?? "application/octet-stream";

  return new Response(buffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
