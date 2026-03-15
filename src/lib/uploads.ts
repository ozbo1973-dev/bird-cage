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
