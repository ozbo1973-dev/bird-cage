# BRD-94 - Create profile page for users

Enable users to manage their account settings including name, email, password reset, and role assignment on a dedicated profile page.

## Implementation Steps

1. **Extend Better Auth schema with role field**
   - Add `role` column to the users table (Drizzle enum field: "user" | "admin", default "user")
   - Create and run database migration to add the new column
   - Verify role field persists on user signup via Better Auth

2. **Create profile page server component at `/app/dashboard/profile/page.tsx`**
   - Add server-side authentication check; redirect unauthenticated users to `/login`
   - Fetch current user session and role from Better Auth
   - Implement return-to-previous-page navigation (capture referrer or accept `?from=` query param, default to `/dashboard`)

3. **Build ProfileForm client component for user updates**
   - Create form fields for: name, email address
   - Add password reset field (password input, confirmation required)
   - Display current role as read-only (no edit capability)
   - Use server action for form submission
   - Validate required fields server-side; return validation errors to client
   - Show success/error feedback via toast or inline messaging

4. **Create profile server action (`app/dashboard/profile/actions.ts`)**
   - Accept name, email, and password (optional) from form submission
   - Authenticate request with Better Auth session validation
   - Use Better Auth API to update user profile (name, email)
   - Use Better Auth password reset or change method for password updates
   - Implement conflict handling for duplicate email addresses (check Better Auth docs)
   - Return success/error response to client

5. **Create API route for password reset if needed**
   - If Better Auth does not provide direct password update via server action, create `POST /api/auth/change-password`
   - Accept current password, new password, and confirmation
   - Validate current password against user's hash
   - Update password via Better Auth
   - Return success/error JSON response

6. **Add navigation link to profile page**
   - Add profile link to dashboard navigation or header (e.g., user avatar menu or settings icon)
   - Link to `/dashboard/profile?from=<currentPage>` to preserve return context

7. **Style profile page with project color theme**
   - Use CSS custom properties from `globals.css` (--color-*)
   - Follow existing UI patterns from other dashboard pages
   - Apply Purple Secondary (`--color-secondary-base`) to submit button
   - Apply Dark Navy (`--color-text-heading`) to headings
   - Apply Gray Text (`--color-text-secondary`) to labels and helper text

8. **Implement back/close navigation**
   - Back button on profile page reads `?from=` query param
   - Default to `/dashboard` if no return URL provided
   - Preserve form state on cancel (no unsaved changes prompt needed unless explicitly desired)

9. **Write unit tests**
   - Test profile form validation (required fields, email format)
   - Test server action success and error scenarios
   - Test Better Auth integration for user update and password reset
   - Test unauthenticated access redirects to login
   - Test role field is read-only and persists correctly

10. **Integration test and manual QA**
    - Test full flow: login → navigate to profile → update name/email → reset password → navigate back
    - Test return-to-previous-page navigation works from multiple entry points
    - Verify color theme consistency with rest of app
    - Test edge cases: duplicate email, weak password, network errors

## Acceptance Criteria

- [ ] Role field added to users table with "user" default and "admin" option
- [ ] Profile page accessible at `/app/dashboard/profile/page.tsx` with server-side auth check
- [ ] Users can update name and email address; validation shows clear error messages
- [ ] Password reset works via Better Auth; field accepts optional new password with confirmation
- [ ] Current role displayed read-only on profile page
- [ ] Profile page uses project color theme via CSS custom properties
- [ ] Back button returns to the page user came from (or `/dashboard` by default)
- [ ] Unit tests cover form validation and server action logic
- [ ] Integration tests confirm full update flow and navigation behavior
- [ ] No unhandled Better Auth API errors; graceful fallback messaging

## Open Questions

- Does Better Auth provide a built-in password change/reset method, or should we call the HTTP API directly?
- Should password reset trigger a confirmation email (via Resend), or should it be immediate after form submission?
- Is the admin role only for future use, or should current profile page allow admins to view/edit other users?
- Should email updates require verification (e.g., confirmation email to new address)?
