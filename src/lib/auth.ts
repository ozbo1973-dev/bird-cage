import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { db } from "../db";
import { getAuthBaseUrl } from "./get-auth-base-url";

const baseURL = getAuthBaseUrl();

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    "http://localhost:3000",
    ...(process.env.NEXT_PUBLIC_APP_URL
      ? [process.env.NEXT_PUBLIC_APP_URL]
      : []),
    ...(process.env.VERCEL_URL
      ? [`https://${process.env.VERCEL_URL}`]
      : []),
    ...(process.env.VERCEL_BRANCH_URL
      ? [`https://${process.env.VERCEL_BRANCH_URL}`]
      : []),
  ],
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    requireEmailVerification: false,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
          to: user.email,
          subject: "Verify your Bird Cage email address",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #032147;">Verify your email</h2>
              <p>Thanks for signing up for Bird Cage! Click the button below to verify your email address.</p>
              <a href="${url}" style="display: inline-block; background: #753991; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">Verify Email</a>
              <p style="color: #888888; font-size: 0.85rem;">If you didn't create an account, you can ignore this email.</p>
            </div>
          `,
        });
      } catch (err) {
        console.error("Failed to send verification email:", err);
      }
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    afterVerificationUrl: "/billing",
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
