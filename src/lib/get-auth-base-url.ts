/**
 * Returns the correct base URL for the current environment:
 * - Vercel production: uses NEXT_PUBLIC_APP_URL
 * - Vercel preview: uses https://<VERCEL_URL> (auto-generated per deployment)
 * - Local development: falls back to http://localhost:3000
 */
export function getAuthBaseUrl(): string {
  if (process.env.VERCEL_ENV === "production") {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  }
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Builds a full URL by appending a path to the environment-aware base URL.
 */
export function getAuthUrl(path: string): string {
  const base = getAuthBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
