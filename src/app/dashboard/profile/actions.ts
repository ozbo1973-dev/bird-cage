"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export type ProfileResult = { success: true } | { error: string };

export async function updateProfileAction(
  name: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<ProfileResult> {
  if (!name.trim()) return { error: "Name is required." };

  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) return { error: "Not authenticated." };

  if (newPassword) {
    if (newPassword.length < 8)
      return { error: "New password must be at least 8 characters." };
    if (newPassword !== confirmPassword)
      return { error: "New passwords do not match." };
    if (!currentPassword)
      return { error: "Current password is required to change password." };

    try {
      await auth.api.changePassword({
        body: { currentPassword, newPassword, revokeOtherSessions: false },
        headers: hdrs,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to change password.";
      return { error: msg };
    }
  }

  try {
    await auth.api.updateUser({
      body: { name },
      headers: hdrs,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update profile.";
    return { error: msg };
  }

  return { success: true };
}
