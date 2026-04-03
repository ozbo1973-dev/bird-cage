/**
 * Determines the correct base URL for Better Auth based on the current environment.
 *
 * - Production (VERCEL_ENV === "production"): uses NEXT_PUBLIC_APP_URL
 * - Preview (VERCEL_ENV === "preview"): uses https://VERCEL_URL
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
 * Builds a full auth URL by appending a path to the base URL.
 */
export function getAuthUrl(path: string): string {
  const base = getAuthBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
