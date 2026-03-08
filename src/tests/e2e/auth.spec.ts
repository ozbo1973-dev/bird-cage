import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("shows login page at root", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /bird cage/i })).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("wrong");
    await page.getByLabel("Password").fill("wrong");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid username or password/i)).toBeVisible();
  });

  test("logs in with valid credentials and redirects to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("demo");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/welcome, demo/i)).toBeVisible();
  });

  test("redirects unauthenticated user from dashboard to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("logs out and redirects to login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("demo");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
