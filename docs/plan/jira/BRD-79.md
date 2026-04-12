# BRD-79 - Create a billing feature page to allow user to choose

Implement a freemium billing model: users start with free tier (limited features), can upgrade to paid tier (full features); admins bypass plan checks.

## Implementation Steps

### 1. Add billing_plan column to users table (BRD-127 prerequisite)
Create a Drizzle migration file (`src/lib/db/migrations/0003_add_billing_plan.sql`) that adds `billing_plan TEXT NOT NULL DEFAULT 'free'` to the `users` table. Update the schema in `src/lib/db/schema.ts` to include the new column.

### 2. Set default billing_plan to free on signup (BRD-127)
Update the Better Auth signup flow in `app/signup/actions.ts` to ensure all new users are created with `billing_plan = 'free'`. Verify the value is persisted in the database after signup. Write unit tests (TDD) for signup that verify `billing_plan` is set to 'free'.

### 3. Create billing options page (BRD-130 prerequisite)
Create `/app/billing/page.tsx` as a server component with authentication. Display two plan cards (Free and Paid) with feature comparisons using the project color scheme. Use the /frontend-design skill to ensure styling aligns with the existing design system. Include a "Select Plan" button for each card that calls a server action to update the user's billing plan in the database. Write integration tests (TDD) that verify page renders correctly for verified users.

### 4. Create server action to update billing plan
Add `updateBillingPlan(plan: 'free' | 'paid')` server action in `app/billing/actions.ts` that updates the current user's `billing_plan` column and redirects to `/dashboard` on success. Write unit tests (TDD) that verify the action updates the database correctly and enforces user ownership.

### 5. Redirect to billing page after email verification (BRD-130)
Update the email verification flow in `app/verify-email/actions.ts` to redirect to `/billing` instead of `/dashboard` after successful verification. Add a route guard to prevent unverified users from accessing `/billing`. Write integration tests (TDD) that verify redirect behavior.

### 6. Restrict photo identification feature to paid users (BRD-128)
Update `POST /api/identify-photo` to check the user's `billing_plan`. Return 403 with error message if user has `billing_plan = 'free'` (unless user is admin). Hide photo upload UI in `AddBirdForm` and `BirdEditForm` for free users by checking billing plan server-side. Write unit tests (TDD) that verify free users receive 403 and paid users proceed normally.

### 7. Restrict AI model selection based on billing (BRD-131)
Update the AI chat logic to check user's `billing_plan` before selecting the model. Free users always use `OPENROUTER_FREE_MODEL` (from env). Paid users and admins use the configured paid model. Pass the billing plan to `BirdChatWidget` or create a utility function that returns the correct model based on user plan and role. Write unit tests (TDD) that verify correct model is selected per plan and role.

### 8. Add admin bypass logic
Ensure admins (where `role = 'admin'`) can access all paid features without checking their billing plan. Verify the bypass applies to photo identification and model selection. Write unit tests (TDD) that verify admins bypass plan checks.

### 9. Write comprehensive tests (BRD-129)
Add unit and integration tests (TDD) covering:
- Free user cannot access photo identification (403 error)
- Paid user can access photo identification
- Admin can access photo identification regardless of plan
- Free user always uses free model in AI chat
- Paid user can use paid model
- Billing page loads for verified users
- User is redirected to billing page after email verification
- Plan selection updates database and redirects to dashboard
- All subtask tests (BRD-127, BRD-128, BRD-129, BRD-130, BRD-131) pass

## Acceptance Criteria

- [ ] New users default to `billing_plan = 'free'` at signup
- [ ] Billing options page displays at `/billing` with Free and Paid plan cards styled with project colors
- [ ] User is redirected to `/billing` after email verification
- [ ] Selecting a plan updates the database and redirects to `/dashboard`
- [ ] Free users cannot call `POST /api/identify-photo` (receives 403)
- [ ] Photo upload UI is hidden for free users
- [ ] Free users always use the free OpenRouter model for AI chat
- [ ] Paid users can use the configured paid model
- [ ] Admins can access all paid features without subscribing
- [ ] All subtask tests (BRD-127, BRD-128, BRD-129, BRD-130, BRD-131) pass
- [ ] Styling reviewed and approved using /frontend-design skill
