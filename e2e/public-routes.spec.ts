import { test, expect } from "@playwright/test";

/**
 * Smoke tests for public, unauthenticated routes. No Supabase session needed.
 */

test.describe("public routes", () => {
  const routes = ["/", "/auth", "/pricing", "/register", "/onboarding"];

  for (const path of routes) {
    test(`GET ${path} renders without runtime errors`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));

      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `status for ${path}`).toBeLessThan(500);

      // Wait for React to hydrate something onto #root or body.
      await expect(page.locator("body")).not.toBeEmpty();
      expect(pageErrors, `runtime errors on ${path}`).toEqual([]);
    });
  }

  test("home shows a primary nav/CTA", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Be tolerant: just assert some interactive element is present.
    const interactive = page.locator("a, button");
    await expect(interactive.first()).toBeVisible();
  });

  test("/auth renders a sign-in form", async ({ page }) => {
    await page.goto("/auth", { waitUntil: "domcontentloaded" });
    const emailField = page
      .getByLabel(/e-?mail/i)
      .or(page.getByPlaceholder(/e-?mail/i))
      .or(page.locator('input[type="email"]'));
    await expect(emailField.first()).toBeVisible();
  });
});
