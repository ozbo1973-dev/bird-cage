import { test, expect } from "@playwright/test";

test.describe("Dashboard Views", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("demo");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("shows timeline tab by default", async ({ page }) => {
    const activeTab = page.getByRole("tab", { name: /timeline/i });
    await expect(activeTab).toHaveAttribute("aria-selected", "true");
  });

  test("switches to species view", async ({ page }) => {
    await page.getByRole("tab", { name: /species/i }).click();
    await expect(page).toHaveURL(/view=species/);
  });

  test("switches to location view", async ({ page }) => {
    await page.getByRole("tab", { name: /location/i }).click();
    await expect(page).toHaveURL(/view=location/);
  });

  test("CSV download link is present", async ({ page }) => {
    const downloadLink = page.getByRole("link", { name: /download csv/i });
    await expect(downloadLink).toBeVisible();
    await expect(downloadLink).toHaveAttribute("href", "/api/export");
  });
});
