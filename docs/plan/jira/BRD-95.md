# BRD-95 - Add Admin options to profile page

Add admin user management features to the profile page, including user list viewing, editing non-password fields, user deletion, and bulk/individual email sending.

## Implementation Steps

### 1. Add DAL functions for admin user management
Create `getAllUsers()` to fetch all users, `updateUserAdmin()` to update name/email/role (admin-only), and `deleteUserAndData()` to delete a user and cascade their records.

### 2. Create admin users management page
Build `/app/dashboard/admin/users/page.tsx` as a server component that requires admin auth and displays a table of all users with columns: name, email, role, created date, and actions.

### 3. Build user edit modal or page
Create `/app/dashboard/admin/users/[id]/edit/page.tsx` allowing admins to edit name, email, and role of other users (read-only for other admins, not editable). Password field excluded.

### 4. Add server actions for admin user operations
Create `/app/dashboard/admin/users/actions.ts` with actions: `updateUserAsAdminAction()`, `deleteUserAsAdminAction()`, and `sendEmailAction()` for individual and bulk emails.

### 5. Build user list client component
Create `AdminUsersList.tsx` client component displaying users in a table with Edit and Delete buttons; Delete uses a confirmation dialog.

### 6. Add admin email sending feature
Extend admin user management page with email sending UI: text area for message, recipient selection (single or bulk), and Send button. Integrate with Resend to send emails.

### 7. Add admin section to profile page
Modify `/app/dashboard/profile/page.tsx` to conditionally render an "Admin Management" button/section when user role is "admin", linking to `/app/dashboard/admin/users`.

### 8. Create admin-related CSS modules
Add styling for admin pages: `AdminUsersList.module.css`, email form styles, and table/modal styling consistent with project colors.

### 9. Add role-based access guards
Verify in all admin routes and actions that the current user has role "admin"; redirect to `/dashboard` if not.

### 10. Write unit tests
Add tests for DAL functions (user retrieval, update, delete), server actions, and admin components to ensure proper auth checks and data handling.

## Acceptance Criteria

- [ ] Admin users see "Admin Management" button/link on profile page
- [ ] Clicking button navigates to admin users list page
- [ ] Admin users list displays all users with name, email, role, created date
- [ ] Edit button opens edit page for any user (excluding password field)
- [ ] Other admins are visible in the list but editable fields are read-only
- [ ] Delete button removes user and cascades deletion of their events/birds
- [ ] Delete action shows confirmation dialog
- [ ] Email sending UI present on admin page with individual and bulk options
- [ ] Emails sent via Resend are received successfully
- [ ] Non-admin users cannot access admin routes (redirected to `/dashboard`)
- [ ] All fields (name, email, role) persist correctly after admin edits
- [ ] Unit tests pass for all DAL, action, and component logic
