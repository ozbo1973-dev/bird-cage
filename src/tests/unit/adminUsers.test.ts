import { describe, it, expect } from "vitest";

// ── Admin action validation logic (mirrors actions.ts) ──────────────────────

function validateUpdateUser(
  name: string,
  email: string,
  role: string,
): string | null {
  if (!name.trim()) return "Name is required.";
  if (!email.trim()) return "Email is required.";
  if (role !== "user" && role !== "admin") return "Invalid role.";
  return null;
}

describe("validateUpdateUser", () => {
  it("returns error when name is empty", () => {
    expect(validateUpdateUser("", "a@b.com", "user")).toBe("Name is required.");
  });

  it("returns error when name is only whitespace", () => {
    expect(validateUpdateUser("   ", "a@b.com", "user")).toBe("Name is required.");
  });

  it("returns error when email is empty", () => {
    expect(validateUpdateUser("Alice", "", "user")).toBe("Email is required.");
  });

  it("returns error when role is invalid", () => {
    expect(validateUpdateUser("Alice", "a@b.com", "superuser")).toBe("Invalid role.");
  });

  it("returns null for valid user data", () => {
    expect(validateUpdateUser("Alice", "alice@example.com", "user")).toBeNull();
  });

  it("returns null for valid admin data", () => {
    expect(validateUpdateUser("Bob", "bob@example.com", "admin")).toBeNull();
  });
});

// ── Admin delete guards ──────────────────────────────────────────────────────

function canDeleteUser(
  currentUserId: string,
  targetUserId: string,
  targetRole: string,
): string | null {
  if (targetUserId === currentUserId) return "You cannot delete your own account.";
  if (targetRole === "admin") return "Cannot delete another admin user.";
  return null;
}

describe("canDeleteUser", () => {
  it("blocks self-deletion", () => {
    expect(canDeleteUser("u1", "u1", "admin")).toBe(
      "You cannot delete your own account.",
    );
  });

  it("blocks deleting another admin", () => {
    expect(canDeleteUser("u1", "u2", "admin")).toBe(
      "Cannot delete another admin user.",
    );
  });

  it("allows deleting a regular user", () => {
    expect(canDeleteUser("u1", "u2", "user")).toBeNull();
  });
});

// ── Admin edit guards ────────────────────────────────────────────────────────

function canEditUser(
  currentUserId: string,
  targetUserId: string,
  targetRole: string,
): boolean {
  // Can edit self (even if admin), and can edit non-admin users
  if (targetRole === "admin" && targetUserId !== currentUserId) return false;
  return true;
}

describe("canEditUser", () => {
  it("allows editing own admin profile", () => {
    expect(canEditUser("u1", "u1", "admin")).toBe(true);
  });

  it("blocks editing another admin", () => {
    expect(canEditUser("u1", "u2", "admin")).toBe(false);
  });

  it("allows editing a regular user", () => {
    expect(canEditUser("u1", "u2", "user")).toBe(true);
  });
});

// ── Email validation ─────────────────────────────────────────────────────────

function validateSendEmail(
  recipients: string[],
  subject: string,
  message: string,
): string | null {
  if (!recipients.length) return "At least one recipient is required.";
  if (!subject.trim()) return "Subject is required.";
  if (!message.trim()) return "Message is required.";
  return null;
}

describe("validateSendEmail", () => {
  it("returns error when no recipients", () => {
    expect(validateSendEmail([], "Subject", "Hello")).toBe(
      "At least one recipient is required.",
    );
  });

  it("returns error when subject is empty", () => {
    expect(validateSendEmail(["a@b.com"], "", "Hello")).toBe("Subject is required.");
  });

  it("returns error when subject is whitespace", () => {
    expect(validateSendEmail(["a@b.com"], "   ", "Hello")).toBe("Subject is required.");
  });

  it("returns error when message is empty", () => {
    expect(validateSendEmail(["a@b.com"], "Hi", "")).toBe("Message is required.");
  });

  it("returns null for valid email data", () => {
    expect(
      validateSendEmail(["a@b.com", "c@d.com"], "Hello", "This is a message."),
    ).toBeNull();
  });
});

// ── Role badge display ───────────────────────────────────────────────────────

function getRoleBadgeClass(role: string): string {
  return role === "user" ? "badge-user" : "badge-admin";
}

describe("getRoleBadgeClass", () => {
  it("returns user class for user role", () => {
    expect(getRoleBadgeClass("user")).toBe("badge-user");
  });

  it("returns admin class for admin role", () => {
    expect(getRoleBadgeClass("admin")).toBe("badge-admin");
  });
});
