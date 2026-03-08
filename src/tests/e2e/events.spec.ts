import { test, expect } from "@playwright/test";

test.describe("Birding Events", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("demo");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("shows empty state when no events", async ({ page }) => {
    await expect(page.getByText(/no birding events yet/i)).toBeVisible();
  });

  test("navigates to new event form", async ({ page }) => {
    await page.getByRole("link", { name: /new event/i }).click();
    await expect(page).toHaveURL(/\/events\/new/);
    await expect(page.getByRole("heading", { name: /new birding event/i })).toBeVisible();
  });

  test("creates an event with bird entries", async ({ page }) => {
    await page.goto("/events/new");

    await page.getByLabel("Title").fill("Morning Walk");
    await page.locator("#date").fill("2024-03-01");

    // Fill first bird
    await page.locator("#bird-type-0").fill("Raptor");
    await page.locator("#bird-species-0").fill("Red-tailed Hawk");
    await page.locator("#bird-location-0").fill("Central Park");
    await page.locator("#bird-lat-0").fill("40.7851");
    await page.locator("#bird-lng-0").fill("-73.9683");

    // Add second bird
    await page.getByRole("button", { name: /add another bird/i }).click();
    await page.locator("#bird-type-1").fill("Songbird");
    await page.locator("#bird-species-1").fill("American Robin");
    await page.locator("#bird-location-1").fill("Central Park");

    await page.getByRole("button", { name: /save event/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Morning Walk")).toBeVisible();
  });

  test("cancels event creation and returns to dashboard", async ({ page }) => {
    await page.goto("/events/new");
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
