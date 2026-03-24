import fs from "fs";
import path from "path";

/** Returns the upload directory, creating it if necessary. */
export function getUploadDir(): string {
  const dir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Returns the absolute path for a given filename inside the upload directory. */
export function getUploadPath(filename: string): string {
  return path.join(getUploadDir(), filename);
}

/** Returns true if the filename is safe (no path traversal). */
export function isSafeFilename(filename: string): boolean {
  return (
    !filename.includes("/") &&
    !filename.includes("\\") &&
    !filename.includes("..")
  );
}

/**
 * Deletes an uploaded file.
 * Handles both Vercel Blob URLs (https://...) and local filenames.
 */
export async function deleteUploadedFile(fileRef: string | null | undefined): Promise<void> {
  if (!fileRef) return;

  if (fileRef.startsWith("https://")) {
    // Vercel Blob URL — delete from cloud storage
    const { del } = await import("@vercel/blob");
    try {
      await del(fileRef);
    } catch {
      // blob already gone — ignore
    }
    return;
  }

  // Local filesystem fallback
  if (!isSafeFilename(fileRef)) return;
  try {
    fs.unlinkSync(getUploadPath(fileRef));
  } catch {
    // file already gone — ignore
  }
}
