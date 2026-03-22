# BRD-60 - Review for Production and create plan for changes needed

Audit the codebase and plan all changes required to move from SQLite/Docker to PostgreSQL/Vercel deployment with proper Better Auth production configuration.

## Current State

### Codebase Audit

**Database Layer:**
- SQLite via `better-sqlite3` (v12.6.2) with Drizzle ORM (v0.45.1)
- Database created fresh on each Docker container start via `scripts/migrate.ts`
- `DATABASE_URL` defaults to `/app/bird-cage.db` (local SQLite file)
- Schema: 6 tables (user, account, session, verification, birding_events, bird_entries) with Better Auth core + app-specific tables
- Migration system via Drizzle migrations in `drizzle/` folder

**Authentication:**
- Better Auth (v1.5.4) configured with `drizzleAdapter` specifying `provider: "sqlite"`
- Email/password + Google OAuth enabled
- Environment variables: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Sessions stored in database; user input validation in place

**File Uploads:**
- Photos stored on filesystem via `UPLOAD_DIR` (default `./uploads/`)
- API routes: `POST /api/uploads`, `GET /api/uploads/[filename]` with security checks
- Files tied to bird_entries via nullable `photo_path` column
- File cleanup helpers exist for delete operations

**Deployment:**
- Multi-stage Docker build with standalone Next.js output
- Entrypoint runs migrations before server start
- All env vars wired via docker-compose.yml
- No Vercel-specific configuration

**Next.js Configuration:**
- Version 16.1.6 (latest)
- `output: "standalone"` for Docker/self-hosted
- No environment variables prefixed for client-side (correct; all secrets server-side)

**API Layer:**
- 10 API routes total covering auth, chat, events, birds, uploads, and identification
- All routes enforce server-side authentication via Better Auth sessions
- All database operations use Drizzle ORM with proper DAL layer

## Implementation Steps

### Phase 1: Database Migration Planning

1. **Set up Neon PostgreSQL account and database.**
   Provision a Neon account, create a new PostgreSQL database, and generate a connection string in format `postgresql://[user]:[password]@[neon_hostname]/[dbname]?sslmode=require`. Store the connection string securely; you will need it for environment configuration.

2. **Update Drizzle ORM adapter configuration for PostgreSQL.**
   Modify `src/lib/auth.ts` to change `drizzleAdapter(db, { provider: "sqlite" })` to `drizzleAdapter(db, { provider: "postgresql" })`. This tells Better Auth to use PostgreSQL-specific table schemas and type handling.

3. **Verify Drizzle migration compatibility with PostgreSQL.**
   Review all migration files in `drizzle/` to ensure they contain PostgreSQL-compatible SQL syntax (not SQLite-specific). Current migrations should be compatible; if needed, regenerate with `pnpm db:generate` to ensure fresh PostgreSQL schemas.

4. **Create a database connection module that supports both SQLite and PostgreSQL.**
   Add conditional logic to `src/lib/db` (or create if missing) to detect environment (`NODE_ENV`) and use `better-sqlite3` for local development and `pg` (PostgreSQL client) for production. Verify the module exports a Drizzle instance compatible with both adapters.

5. **Update migration script to handle PostgreSQL connections.**
   Modify `scripts/migrate.ts` to support PostgreSQL via the `pg` library instead of `better-sqlite3` only. The script should read `DATABASE_URL` and detect the database type (SQLite vs. PostgreSQL) automatically.

### Phase 2: Better Auth Production Setup

6. **Generate a production-grade `BETTER_AUTH_SECRET`.**
   Use `openssl rand -base64 32` to generate a 32+ character secret with high entropy. Store this in Vercel's environment variables under Settings > Environment Variables, restricted to Production only. Never commit or share this value.

7. **Configure `BETTER_AUTH_URL` for production.**
   Set `BETTER_AUTH_URL` in Vercel environment to your production domain (e.g., `https://your-app.vercel.app`). This must match your deployment URL to avoid CSRF issues and session cookie misalignment.

8. **Verify Better Auth is using secure session cookies in production.**
   Ensure that in `src/lib/auth.ts`, session cookies are configured with `secure: true`, `httpOnly: true`, and `sameSite: "strict"` (or appropriate value) when `NODE_ENV === "production"`. Review Better Auth v1.5.4 documentation for default cookie settings; adjust if needed.

9. **Update Google OAuth credentials if changing domain.**
   Regenerate OAuth consent screen and credentials in Google Cloud Console for your new Vercel domain. Update `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables in Vercel. Both should be restricted to Production environment.

### Phase 3: File Upload Strategy for Vercel

10. **Plan file storage migration from filesystem to cloud storage.**
    Vercel Functions have ephemeral filesystems; files in `./uploads/` will not persist across deployments or serverless function instances. Choose one:
    - Option A: Use Vercel Blob (proprietary service, integrated)
    - Option B: Use AWS S3 or equivalent cloud storage
    - Option C: Use a separate file server or CDN
    Recommendation: Vercel Blob for simplicity; requires `@vercel/blob` package and API token.

11. **Update upload API routes for cloud storage.**
    Refactor `POST /api/uploads` and `GET /api/uploads/[filename]` to use cloud storage SDK instead of `fs.writeFile()`. Update `deleteUploadedFile()` helper to call cloud storage deletion API. Store only the cloud object URL or key in the database, not local filesystem paths.

12. **Migrate existing local photo files to cloud storage (if needed).**
    If production will have user data, write a one-time migration script to upload all existing photos from `./uploads/` to cloud storage and update `photo_path` column references. This is deferred if launching with fresh data.

### Phase 4: Vercel Deployment Configuration

13. **Create a `vercel.json` deployment config (optional but recommended).**
    Add a `vercel.json` file with build settings, environment variable documentation, and serverless function configuration. Example: set `buildCommand: "pnpm run build"`, `outputDirectory: ".next"`, and document required env vars for future reference.

14. **Configure environment variables in Vercel dashboard.**
    In Vercel project Settings > Environment Variables, add:
    - `DATABASE_URL` (PostgreSQL connection string, Production only)
    - `BETTER_AUTH_SECRET` (32+ char secret, Production only)
    - `BETTER_AUTH_URL` (production domain, Production + Preview)
    - `NEXT_PUBLIC_APP_URL` (production domain, Production + Preview; client-side safe)
    - `GOOGLE_CLIENT_ID` (Production only)
    - `GOOGLE_CLIENT_SECRET` (Production only)
    - `OPENROUTER_API_KEY` (Production only, if using AI features)
    - `OPENROUTER_MODEL` (Production only, default or override)
    - `UPLOAD_DIR` (not needed for Vercel; remove or set to Vercel Blob endpoint)
    Separate values for Development, Preview, and Production environments.

15. **Remove Docker-specific build artifacts from Vercel deployment.**
    Vercel will ignore `Dockerfile` and `docker-compose.yml`; they are not needed for Vercel deployment. Keep them in the repo for local development in Docker if desired. Ensure `.next/` and `node_modules/` are in `.gitignore`.

### Phase 5: Build and Runtime Adjustments

16. **Update `next.config.ts` for Vercel deployment.**
    Change `output: "standalone"` to `output: "auto"` or remove it; Vercel handles output configuration automatically. If keeping standalone, verify Vercel's guidance on serverless vs. standalone modes. Document the choice.

17. **Test build locally with `pnpm run build`.**
    Run a production build locally to verify all TypeScript compiles, migrations are included in build artifacts, and no secrets leak into the bundle. Check `.next/standalone/` or build output for unexpected file inclusions.

18. **Update `scripts/migrate.ts` to handle Vercel serverless environment.**
    Vercel Functions have ephemeral `/tmp/` storage and read-only filesystem. Ensure migration script works with PostgreSQL (no local file creation needed). If using Neon's serverless driver, the connection is stateless and does not require manual pooling.

### Phase 6: Security and Compliance

19. **Enable HTTPS and secure headers in production.**
    Vercel automatically provides HTTPS. Verify that all API routes return `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, and other security headers. Add middleware in `src/middleware.ts` if needed.

20. **Implement rate limiting and DDoS protection.**
    Vercel provides built-in DDoS protection. For API rate limiting, use Better Auth's built-in rate limiting (available since v1.0) by configuring `rateLimit` in auth config. Limit password attempts, signup, and token refresh endpoints.

21. **Audit authentication flow for production readiness.**
    Review Better Auth email verification flow: ensure `emailAndPassword.autoSignIn: true` is appropriate for your security posture. Consider requiring email verification before full access. Check session TTL and refresh token expiry; adjust if needed.

22. **Set up database connection pooling for PostgreSQL.**
    Vercel Functions make many short-lived connections. Use Neon's connection pool or a separate connection pooling service like PgBouncer. Configure `DATABASE_URL` to point to pool endpoint if available. Test concurrent connection limits under load.

### Phase 7: Testing and Validation

23. **Test database migration with PostgreSQL locally.**
    Run `pnpm db:migrate` against a local PostgreSQL instance or Neon development branch to ensure all migrations execute without error. Verify schema matches expected tables and indexes.

24. **Test Better Auth session flow in production mode.**
    Deploy to Vercel Preview first. Test signup, login, Google OAuth, session persistence, and logout. Verify cookies are secure (check cookie attributes in DevTools). Test with different browser profiles to ensure CSRF tokens work correctly.

25. **Test file upload flow with cloud storage.**
    Upload a photo via the web UI. Verify the file is stored in cloud storage, not local filesystem. Test photo identification, edit, and delete flows. Verify old upload cleanup works correctly.

26. **Load test critical API endpoints.**
    Use tools like Apache Bench or k6 to test `/api/events`, `/api/birds`, and `/api/chat` under 100+ concurrent requests. Monitor Vercel Function logs and Neon database connection pool for bottlenecks. Adjust function memory or database pool size if needed.

### Phase 8: Deployment and Rollout

27. **Create a feature branch and PR for production changes.**
    Commit all code changes (auth config, database module, migration script, upload refactor, env var docs) to a feature branch. Open a PR with detailed notes on each change. Link this PR to BRD-60.

28. **Deploy to Vercel Preview for team review.**
    Push the PR branch to trigger a Vercel Preview deployment. Share preview URL with stakeholders. Run acceptance tests and gather feedback before merging to main.

29. **Perform final production checklist.**
    Before deploying to production:
    - Verify all environment variables are set in Vercel Production dashboard
    - Confirm database backups are enabled in Neon
    - Test database restore from backup
    - Review application logs and error tracking setup (Vercel + Neon logs)
    - Ensure monitoring and alerts are configured (optional: add Sentry or similar)
    - Document rollback procedure in case of critical issues

30. **Merge to main and deploy to production.**
    Merge PR to main branch. Vercel automatically deploys main to production. Monitor deployment logs and application behavior for first 24 hours. Verify all user flows work end-to-end.

## Technical Notes and Constraints

- **Neon Connection String:** Format is `postgresql://[user]:[password]@[neon_hostname]/[dbname]?sslmode=require`. Must use SSL mode for security.
- **Better Auth Provider Switch:** Changing from `provider: "sqlite"` to `provider: "postgresql"` affects table schema constraints (e.g., `TEXT` vs. `VARCHAR`). Existing data must be migrated or schema generated fresh. Test thoroughly.
- **Vercel Filesystem:** Ephemeral; do not rely on disk persistence for user uploads. Cloud storage is mandatory.
- **Next.js Standalone Mode:** Designed for self-hosted environments. Vercel manages build output automatically; removing `output: "standalone"` is recommended for Vercel.
- **Database Pooling:** Neon provides connection pooling. Monitor active connections in Neon dashboard. If connection pool is exhausted, increase pool size or reduce app concurrency.
- **Environment Variables:** Vercel Preview builds can use different env vars than Production. Set values for both environments to avoid surprises during testing.
- **Google OAuth:** Client ID and secret must be registered for each domain. Localhost development requires a separate set of credentials.
- **Cookie Domain:** Better Auth session cookies are scoped to domain. Ensure `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` use the same domain (no localhost in production, no trailing slashes).

## Open Questions

- Will production use Vercel Blob for file storage, or an external service like AWS S3?
- Should email verification be required before account activation, or optional?
- What is the target concurrent user load for performance testing?
- Should database backups be automated (Neon backup schedule), or manual?
- Is there a preferred observability/logging tool (Sentry, LogRocket, custom)?
