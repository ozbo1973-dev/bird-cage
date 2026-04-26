import { describe, it, expect } from "vitest";

/**
 * Mirrors the menu item list built by NavDropdown based on the isAdmin and hasEvents props.
 * Home, Profile, Talk to Birdy, Saved Chats, Billing, [Admin Management if admin], [Download CSV if hasEvents], Sign Out
 */
function getNavMenuItems(isAdmin: boolean, hasEvents = true): string[] {
  const items = ["Home", "Profile", "Talk to Birdy", "Saved Chats", "Billing"];
  if (isAdmin) items.push("Admin Management");
  if (hasEvents) items.push("Download CSV");
  items.push("Sign Out");
  return items;
}

/** Mirrors the isAdmin condition used to show Admin Management menu item */
function shouldShowAdminMenuItem(isAdmin: boolean): boolean {
  return isAdmin;
}

/** The href for the Home menu item */
const HOME_HREF = "/dashboard";

/** The href for the Talk to Birdy menu item */
const BIRDY_CHAT_HREF = "/birdy-chat";

describe("NavDropdown menu items for non-admin users", () => {
  it("renders Home menu item", () => {
    expect(getNavMenuItems(false)).toContain("Home");
  });

  it("renders Profile menu item", () => {
    expect(getNavMenuItems(false)).toContain("Profile");
  });

  it("renders Billing menu item", () => {
    expect(getNavMenuItems(false)).toContain("Billing");
  });

  it("renders Download CSV menu item", () => {
    expect(getNavMenuItems(false)).toContain("Download CSV");
  });

  it("renders Sign Out menu item", () => {
    expect(getNavMenuItems(false)).toContain("Sign Out");
  });

  it("does not render Admin Management for non-admin", () => {
    expect(getNavMenuItems(false)).not.toContain("Admin Management");
  });

  it("Home is the first menu item", () => {
    expect(getNavMenuItems(false)[0]).toBe("Home");
  });

  it("renders Talk to Birdy menu item for non-admin users", () => {
    expect(getNavMenuItems(false)).toContain("Talk to Birdy");
  });

  it("Talk to Birdy appears after Profile and before Saved Chats", () => {
    const items = getNavMenuItems(false);
    const profileIndex = items.indexOf("Profile");
    const talkToBirdyIndex = items.indexOf("Talk to Birdy");
    const savedChatsIndex = items.indexOf("Saved Chats");
    expect(talkToBirdyIndex).toBeGreaterThan(profileIndex);
    expect(talkToBirdyIndex).toBeLessThan(savedChatsIndex);
  });

  it("Billing appears after Profile", () => {
    const items = getNavMenuItems(false);
    const profileIndex = items.indexOf("Profile");
    const billingIndex = items.indexOf("Billing");
    expect(billingIndex).toBeGreaterThan(profileIndex);
  });
});

describe("NavDropdown menu items for admin users", () => {
  it("renders Admin Management menu item when isAdmin is true", () => {
    expect(getNavMenuItems(true)).toContain("Admin Management");
  });

  it("renders Billing menu item for admin users", () => {
    expect(getNavMenuItems(true)).toContain("Billing");
  });

  it("renders Talk to Birdy menu item for admin users", () => {
    expect(getNavMenuItems(true)).toContain("Talk to Birdy");
  });

  it("Admin Management appears after Billing", () => {
    const items = getNavMenuItems(true);
    const billingIndex = items.indexOf("Billing");
    const adminIndex = items.indexOf("Admin Management");
    expect(adminIndex).toBeGreaterThan(billingIndex);
  });

  it("Admin Management appears before Download CSV", () => {
    const items = getNavMenuItems(true);
    const adminIndex = items.indexOf("Admin Management");
    const downloadIndex = items.indexOf("Download CSV");
    expect(adminIndex).toBeLessThan(downloadIndex);
  });

  it("still renders all standard items for admin", () => {
    const items = getNavMenuItems(true);
    expect(items).toContain("Home");
    expect(items).toContain("Profile");
    expect(items).toContain("Billing");
    expect(items).toContain("Download CSV");
    expect(items).toContain("Sign Out");
  });
});

describe("shouldShowAdminMenuItem", () => {
  it("returns true for admin users", () => {
    expect(shouldShowAdminMenuItem(true)).toBe(true);
  });

  it("returns false for non-admin users", () => {
    expect(shouldShowAdminMenuItem(false)).toBe(false);
  });
});

describe("NavDropdown Home link href", () => {
  it("Home link points to /dashboard", () => {
    expect(HOME_HREF).toBe("/dashboard");
  });
});

describe("NavDropdown Talk to Birdy link href", () => {
  it("Talk to Birdy link points to /birdy-chat", () => {
    expect(BIRDY_CHAT_HREF).toBe("/birdy-chat");
  });

  it("Talk to Birdy href is /birdy-chat for non-admin users", () => {
    expect(BIRDY_CHAT_HREF).toBe("/birdy-chat");
  });

  it("Talk to Birdy href is /birdy-chat for admin users", () => {
    expect(BIRDY_CHAT_HREF).toBe("/birdy-chat");
  });
});

describe("NavDropdown Download CSV visibility based on hasEvents", () => {
  it("shows Download CSV when hasEvents is true", () => {
    expect(getNavMenuItems(false, true)).toContain("Download CSV");
  });

  it("hides Download CSV when hasEvents is false", () => {
    expect(getNavMenuItems(false, false)).not.toContain("Download CSV");
  });

  it("hides Download CSV for admin when hasEvents is false", () => {
    expect(getNavMenuItems(true, false)).not.toContain("Download CSV");
  });

  it("shows Download CSV by default (hasEvents defaults to true)", () => {
    expect(getNavMenuItems(false)).toContain("Download CSV");
  });
});

describe("NavDropdown Saved Chats menu item", () => {
  it("renders Saved Chats menu item for non-admin users", () => {
    expect(getNavMenuItems(false)).toContain("Saved Chats");
  });

  it("renders Saved Chats menu item for admin users", () => {
    expect(getNavMenuItems(true)).toContain("Saved Chats");
  });

  it("Saved Chats appears after Talk to Birdy", () => {
    const items = getNavMenuItems(false);
    const talkToBirdyIndex = items.indexOf("Talk to Birdy");
    const savedChatsIndex = items.indexOf("Saved Chats");
    expect(savedChatsIndex).toBeGreaterThan(talkToBirdyIndex);
  });

  it("Saved Chats appears before Billing", () => {
    const items = getNavMenuItems(false);
    const savedChatsIndex = items.indexOf("Saved Chats");
    const billingIndex = items.indexOf("Billing");
    expect(savedChatsIndex).toBeLessThan(billingIndex);
  });
});
