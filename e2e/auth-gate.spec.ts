import { test, expect } from "@playwright/test";

/**
 * Without a Supabase session, every /app/* route must redirect to the auth
 * gate (/onboarding or /auth) — never render the protected UI.
 */

const protectedRoutes = [
  "/app/dashboard",
  "/app/congregations",
  "/app/members",
  "/app/financeiro",
  "/app/financeiro/relatorios",
  "/app/conselho-fiscal",
];

for (const path of protectedRoutes) {
  test(`unauthenticated ${path} redirects to auth gate`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    expect(page.url()).toMatch(/\/(auth|onboarding|register|select-tenant)(\?|$|\/)/);
  });
}
