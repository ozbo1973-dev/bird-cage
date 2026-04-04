# BRD-81 - Fix Email/Password Signup to Sign In and Redirect to Verify Email

Ensure newly signed-up users are logged in immediately but restricted from creating content until email verification is complete.

## Implementation Steps

1. Update the signup server action (`app/signup/actions.ts`) to call `auth.api.signUpEmail()` and ensure the session cookie is set in the response so the user is logged in upon redirect.

2. Modify the signup server action to redirect to `/verify-email` immediately after successful signup, regardless of email verification status.

3. Add a middleware check (or route guard in `/dashboard` and event/bird creation routes) to verify that the logged-in user has completed email verification; if not, redirect to `/verify-email`.

4. Update `/verify-email` page to allow authenticated but unverified users to resend verification emails and sign out (add a Sign Out button).

5. Test the complete flow:
   - User signs up with email/password → logs in → redirected to `/verify-email`
   - Unverified user cannot access `/dashboard` or create events/birds (redirects to `/verify-email`)
   - Unverified user can sign out from `/verify-email`
   - Verified user can access all features normally

## Acceptance Criteria

- [ ] New user signs up and is immediately logged in
- [ ] Signup redirects to `/verify-email` instead of dashboard
- [ ] Unverified user cannot create events or bird sightings (redirected to `/verify-email`)
- [ ] Unverified user can sign out from `/verify-email`
- [ ] Verified user can access full app
- [ ] Sign-in flow still works normally
