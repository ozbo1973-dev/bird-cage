import { describe, it, expect } from "vitest";

// Profile form validation logic mirroring the server action
function validateProfileUpdate(
  name: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): string | null {
  if (!name.trim()) return "Name is required.";

  if (newPassword) {
    if (newPassword.length < 8)
      return "New password must be at least 8 characters.";
    if (newPassword !== confirmPassword)
      return "New passwords do not match.";
    if (!currentPassword)
      return "Current password is required to change password.";
  }

  return null;
}

describe("validateProfileUpdate", () => {
  it("returns error when name is empty", () => {
    expect(validateProfileUpdate("", "", "", "")).toBe("Name is required.");
  });

  it("returns error when name is only whitespace", () => {
    expect(validateProfileUpdate("   ", "", "", "")).toBe("Name is required.");
  });

  it("returns null when name is valid with no password change", () => {
    expect(validateProfileUpdate("Alice", "", "", "")).toBeNull();
  });

  it("returns error when new password is too short", () => {
    expect(validateProfileUpdate("Alice", "oldpass", "short", "short")).toBe(
      "New password must be at least 8 characters.",
    );
  });

  it("returns error when passwords do not match", () => {
    expect(
      validateProfileUpdate("Alice", "oldpass123", "newpass123", "different123"),
    ).toBe("New passwords do not match.");
  });

  it("returns error when new password provided without current password", () => {
    expect(
      validateProfileUpdate("Alice", "", "newpass123", "newpass123"),
    ).toBe("Current password is required to change password.");
  });

  it("returns null when all password fields are valid", () => {
    expect(
      validateProfileUpdate("Alice", "oldpass123", "newpass123", "newpass123"),
    ).toBeNull();
  });

  it("ignores password validation when newPassword is empty", () => {
    expect(validateProfileUpdate("Alice", "oldpass", "", "")).toBeNull();
  });
});

// Role display helper
function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

describe("formatRole", () => {
  it("capitalizes user role", () => {
    expect(formatRole("user")).toBe("User");
  });

  it("capitalizes admin role", () => {
    expect(formatRole("admin")).toBe("Admin");
  });
});
