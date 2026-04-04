# BRD-78 - Create public landing page

Create a public landing page visible only to unauthenticated users, showcasing the Bird Cage app's purpose, features (event creation, multiple bird sightings, AI identification via description or photo), with an outdoor and birding aesthetic.

## Implementation Steps

1. **Implement conditional rendering for unauthenticated users (BRD-97)**
   - Create a new root-level page component at `/app/page.tsx` that checks authentication status.
   - If authenticated, redirect to `/dashboard`.
   - If unauthenticated, render the landing page.
   - Use server-side authentication check via `auth.api.getSession()`.

2. **Write engaging copy for site description and features (BRD-100)**
   - Draft headline describing Bird Cage as a platform for serious birding enthusiasts to track bird encounters.
   - Write feature descriptions: event creation, multiple bird sightings per event, AI-powered identification via text or photo.
   - Keep copy concise and compelling to drive signup.

3. **Develop feature highlights section (BRD-99)**
   - Create a section displaying 3-4 key features with icons and descriptions.
   - Features to highlight: Add Events, Create Multiple Bird Sightings, AI Identification (Description), AI Identification (Photo).
   - Use lucide-react icons (e.g., `Calendar`, `Bird`, `Sparkles`).
   - Apply project color scheme: Blue Primary `#209dd7`, Accent Yellow `#ecad0a`, Purple Secondary `#753991`.

4. **Source or create outdoor and bird imagery (BRD-101)**
   - Obtain or create high-quality outdoor and bird imagery.
   - Optimize images for web (compress, appropriate formats).
   - Store images in `/public/landing/` directory.
   - Consider hero image, bird species photos, or nature backgrounds.

5. **Integrate sample AI bird identification demo or illustration (BRD-98)**
   - Create a visual demo or illustration showing how the AI identification feature works.
   - Option A: Static before/after mockup showing user input → AI identification result.
   - Option B: Interactive demo (read-only) simulating the chat flow.
   - Display sample bird identification output with species name, description, and confidence.

6. **Test landing page responsiveness and cross-browser compatibility (BRD-102)**
   - Test layout on mobile (375px), tablet (768px), and desktop (1920px) breakpoints.
   - Verify all images load correctly and display responsively.
   - Test on Chrome, Firefox, Safari, and Edge.
   - Ensure buttons and links are accessible and clickable on touch devices.
   - Verify color scheme displays correctly across browsers.

## Technical Constraints

- Use Next.js 16 Server Components as the default.
- Implement server-side authentication checks; do not rely on client-side redirects.
- Use strict TypeScript throughout.
- Color scheme must adhere to: Accent Yellow `#ecad0a`, Blue Primary `#209dd7`, Purple Secondary `#753991`, Dark Navy `#032147`, Gray Text `#888888`.
- Existing logos (`logo.svg`, `logo-text.svg`) are available; reuse or adapt as needed.
- Mobile-first responsive design.
- Do not over-engineer; keep the page simple and focused on marketing the core features.

## Acceptance Criteria

- [ ] Unauthenticated users see the landing page when visiting root URL.
- [ ] Authenticated users are redirected to `/dashboard` when accessing root URL.
- [ ] Landing page displays site name, description, and purpose clearly.
- [ ] Feature highlights section includes 3+ key features with icons and descriptions.
- [ ] Hero image or outdoor imagery enhances visual appeal.
- [ ] AI identification feature is visually demonstrated (demo, mockup, or illustration).
- [ ] Copy is engaging and explains app value proposition.
- [ ] Page is fully responsive (mobile, tablet, desktop).
- [ ] Cross-browser compatibility verified (Chrome, Firefox, Safari, Edge).
- [ ] Call-to-action buttons (Sign Up, Log In) are prominent and functional.
- [ ] Color scheme and styling align with project design system.
