/** Returns true if the filename is safe (no path traversal). */
export function isSafeFilename(filename: string): boolean {
  return (
    !filename.includes("/") &&
    !filename.includes("\\") &&
    !filename.includes("..")
  );
}

/** Returns the upload directory, creating it if necessary. Lazy-loaded to avoid NFT tracing fs at build time. */
export async function getUploadDir(): Promise<string> {
  const [fs, path] = await Promise.all([import("fs"), import("path")]);
  const dir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Returns the absolute path for a given filename inside the upload directory. */
export async function getUploadPath(filename: string): Promise<string> {
  const [uploadDir, path] = await Promise.all([getUploadDir(), import("path")]);
  return path.join(uploadDir, filename);
}

/**
 * Deletes an uploaded file.
 * Handles both Vercel Blob URLs (https://...) and local filenames.
 */
export async function deleteUploadedFile(fileRef: string | null | undefined): Promise<void> {
  if (!fileRef) return;

  if (fileRef.startsWith("https://")) {
    const { del } = await import("@vercel/blob");
    try {
      await del(fileRef);
    } catch {
      // blob already gone — ignore
    }
    return;
  }

  if (!isSafeFilename(fileRef)) return;
  try {
    const fs = await import("fs");
    fs.unlinkSync(await getUploadPath(fileRef));
  } catch {
    // file already gone — ignore
  }
}
