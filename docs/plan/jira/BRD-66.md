# BRD-66 - Create Skill to set up and use Resend for emails

A comprehensive skill guide that enables Claude agents to install, configure, and integrate Resend email service into Next.js projects.

## Implementation Steps

1. **Document skill frontmatter and overview**
   Create `SKILL.md` with standard frontmatter (name, description, type) and a high-level summary of when agents should use this skill (any request involving email sending, transactional emails, or Resend integration).

2. **Outline prerequisites and environment setup**
   Document required Resend account setup: creating an API key at resend.com/api-keys, domain verification requirements, and environment variable configuration (`RESEND_API_KEY`).

3. **Add installation step**
   Provide pnpm install command and note this skill is for Next.js projects using the App Router with TypeScript.

4. **Document Resend client initialization**
   Create a reusable server-side client file (e.g., `lib/resend.ts`) that instantiates the Resend SDK with the API key from environment variables, following the project's server-first pattern.

5. **Provide email template component pattern**
   Document how to create React email components that accept dynamic props, matching the project's TypeScript and component conventions. Include a basic example template.

6. **Document API route for sending emails**
   Create a reusable API route pattern (`app/api/emails/send/route.ts`) that accepts recipient, subject, and template parameters; uses the Resend client to send; and returns both success and error cases with proper typing.

7. **Add environment variable configuration**
   Document required env vars for `.env` and `.env.example` (`RESEND_API_KEY`), and note any production-specific configuration (verified domains, sender email addresses).

8. **Include usage examples**
   Provide code samples showing how to:
   - Call the email API route from a Server Action
   - Send welcome/confirmation emails
   - Handle errors and responses
   - Structure email templates with dynamic content

9. **Document common pitfalls and best practices**
   Cover mistakes agents frequently make: using unverified domains in production, exposing the API key to the client, forgetting error handling, and improper template structure.

10. **Add references to official Resend Next.js documentation**
    Link to https://resend.com/docs/send-with-nextjs and related Resend docs for agents to reference when needing deeper details.

## Acceptance Criteria

- Skill file saved to `.claude/skills/resend/SKILL.md` with proper frontmatter
- All 10 sections above are present and clearly structured
- Code examples are tested for correctness and follow Next.js 16 / TypeScript best practices
- Environment variable requirements documented in both skill and `.env.example`
- Production deployment notes included (domain verification, sender email setup)
- Skill can be independently read and followed by an agent with no other context
