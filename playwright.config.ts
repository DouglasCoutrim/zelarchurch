import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for Zelar.
 * - Reuses the running dev server on :8080 (Lovable sandbox).
 * - Authenticated specs read a Supabase session from env vars and inject it
 *   into localStorage before navigating to /app/* routes.
 *
 * Env vars (optional, for authenticated specs):
 *   E2E_SUPABASE_STORAGE_KEY   sb-<project>-auth-token
 *   E2E_SUPABASE_SESSION_JSON  full Supabase session JSON
 * If absent, authenticated specs are skipped automatically.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
