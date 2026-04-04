# BRD-87 - Fix issue with Photo identification of bird in vercel environments

Fix photo identification that fails with 500 errors on Vercel (both preview and production) while working on localhost.

## Problem Analysis

Photo identification works on localhost but fails on Vercel because Vercel's filesystem is read-only. The current flow:
1. `POST /api/uploads` writes file to disk (`UPLOAD_DIR`)
2. `POST /api/identify-photo` attempts to read that file and base64-encode it
3. On Vercel, the file written in step 1 is not accessible in step 2, causing a 500 error

Chat-based identification works because it bypasses the file read step entirely.

## Implementation Steps

1. **Diagnose the root cause in production.**
   - Check Vercel logs to confirm the error occurs when reading the file in `/api/identify-photo`.
   - Verify that the `uploads` directory is being written to but not persisted across requests.

2. **Implement client-side base64 encoding.**
   - Modify `AddBirdForm` and `BirdEditForm` to read the uploaded file as base64 on the client before sending.
   - Update `POST /api/uploads` to accept and store the base64 string instead of a file buffer.
   - Store base64 string in the database (`bird_entries` table, new column or repurpose existing logic).

3. **Update `/api/identify-photo` to use base64 data.**
   - Modify the endpoint to accept base64 data directly from the request body instead of reading from disk.
   - Remove file-read operations that fail on Vercel's read-only filesystem.
   - Pass base64 data directly to OpenRouter without intermediate file operations.

4. **Update `/api/uploads/[filename]` to serve base64 data.**
   - Modify the GET endpoint to reconstruct and return image data from the base64 string stored in the database.
   - Maintain compatibility with existing image display on dashboard (bird card thumbnails).

5. **Remove filesystem dependency for photo storage.**
   - Delete the `UPLOAD_DIR` env var from production config (keep for local development if needed).
   - Clean up any temporary file cleanup logic in DELETE endpoints if no longer needed.

6. **Test the fix.**
   - Verify photo identification works on localhost.
   - Deploy to Vercel preview and confirm photo identification works (no 500 error).
   - Test that thumbnails display correctly on dashboard.
   - Verify chat-based identification still works as fallback.

## Acceptance Criteria

- [ ] Photo identification succeeds on Vercel preview environment.
- [ ] Photo identification succeeds on Vercel production environment.
- [ ] No 500 error when uploading and identifying a photo on Vercel.
- [ ] Bird thumbnails display correctly on dashboard.
- [ ] Chat-based identification remains a working fallback.
- [ ] Localhost photo identification continues to work as before.

## Open Questions

- Should we keep the filesystem upload path for local development, or fully switch to base64 everywhere?
- Is there a preference for storing base64 in the database vs. using a cloud storage service like Vercel Blob?
- Should the base64 data be compressed or size-limited to avoid bloating the database?
