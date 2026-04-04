# BRD-73 - Determine which database URL to use

Configure authentication and redirect URLs to dynamically adapt to local, Vercel preview, and Vercel production environments.

## Implementation Steps

1. **Identify current auth configuration issues**
   - Review `src/lib/auth.ts` to document current `baseURL` and Google OAuth callback setup.
   - Identify where URLs are hardcoded or incorrectly configured across environments.

2. **Set up environment-based URL determination**
   - Create a utility function (e.g., `src/lib/get-auth-base-url.ts`) that determines the correct `baseURL` based on `VERCEL_ENV` and `VERCEL_URL`.
   - Logic: if `VERCEL_ENV === "production"`, use production domain; if `VERCEL_ENV === "preview"`, use `VERCEL_URL`; otherwise use `localhost:3000`.
   - Export a helper to construct the complete auth URL.

3. **Update Better Auth configuration**
   - Modify `src/lib/auth.ts` to use the new utility for `baseURL` with `allowedHosts` covering all three environments.
   - Configure `baseURL.allowedHosts` to include: production domain, `*.vercel.app` (for preview branches), and `localhost:3000`.

4. **Update Google OAuth callback setup**
   - Ensure the Google OAuth redirect URI is dynamically constructed using the same environment-aware URL logic.
   - Verify the callback URL in `auth.ts` matches what is registered in Google Cloud Console (must include `/callback` endpoint).

5. **Verify environment variables are set**
   - Confirm `VERCEL_ENV` and `VERCEL_URL` are available in all deployment contexts.
   - Document which env vars must be set in `.env.local` for local development.

6. **Test across all three environments**
   - Test locally (localhost:3000).
   - Test on a Vercel preview branch.
   - Test on production (after merge to main).

## Acceptance Criteria

- [ ] Better Auth `baseURL` and `allowedHosts` correctly configured for all environments.
- [ ] Google OAuth callback URL is dynamically set per environment.
- [ ] Local development works with `localhost:3000`.
- [ ] Vercel preview branches work with auto-generated `*.vercel.app` URLs.
- [ ] Production works with the main domain.
- [ ] No hardcoded URLs remain in `auth.ts`.
