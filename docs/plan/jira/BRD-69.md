# BRD-69 - Finish BetterAuth email verification

Complete Better Auth email verification flow with Resend email service, including verification route and post-login redirect for unverified users.

## Implementation Steps

1. **Configure Resend in Better Auth settings**
   - Add Resend provider configuration to Better Auth email settings with RESEND_API_KEY from .env
   - Configure sender email address and verification email template

2. **Create email verification route (`/api/auth/verify-email`)**
   - Build endpoint to accept verification token from email link
   - Call Better Auth verify email method with token
   - Redirect user to dashboard or login page on success, with error handling for expired/invalid tokens

3. **Add post-login redirect middleware**
   - Check if authenticated user has `emailVerified` flag set to false
   - Redirect unverified users to `/verify-email` pending page
   - Allow user to navigate freely once redirected; offer resend verification email option

4. **Create email verification pending page (`/verify-email`)**
   - Build server-authenticated page UI showing "Verify your email" message
   - Display user's email address
   - Add "Resend verification email" button that calls `/api/auth/resend-verification`
   - Show success/error messages for resend action

5. **Create resend verification email route (`/api/auth/resend-verification`)**
   - Build POST endpoint that sends a new verification email via Resend
   - Validate authenticated user exists and is not already verified
   - Return success/error response

6. **Test full verification flow end-to-end**
   - Sign up new user, verify email is sent via Resend
   - Verify unverified user is redirected to `/verify-email` after login
   - Test clicking verification link from email
   - Test resend verification email flow
   - Verify redirect to dashboard after email verification

## Acceptance Criteria

- [ ] Resend is integrated with Better Auth for sending verification emails
- [ ] `/api/auth/verify-email` endpoint accepts and processes verification tokens
- [ ] Unverified users are redirected to `/verify-email` immediately after login
- [ ] `/verify-email` page displays pending verification UI with resend option
- [ ] `/api/auth/resend-verification` sends new verification emails
- [ ] Full sign-up → email verification → dashboard flow works end-to-end
- [ ] Invalid/expired tokens show appropriate error message
- [ ] Verified users can log in normally without redirect
