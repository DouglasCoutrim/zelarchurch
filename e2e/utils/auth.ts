import { test, expect, type Page } from "@playwright/test";

/**
 * Restore a Supabase session into localStorage so /app/* loaders pass the
 * `_authenticated` gate. Returns true when a session was injected.
 */
export async function restoreSupabaseSession(page: Page): Promise<boolean> {
  const storageKey = process.env.E2E_SUPABASE_STORAGE_KEY;
  const sessionJson = process.env.E2E_SUPABASE_SESSION_JSON;
  if (!storageKey || !sessionJson) return false;

  // Need a same-origin context before writing to localStorage.
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([k, v]) => window.localStorage.setItem(k, v),
    [storageKey, sessionJson] as const,
  );
  return true;
}

export const requireAuth = test.extend<{ authed: true }>({
  authed: async ({ page }, use) => {
    const ok = await restoreSupabaseSession(page);
    test.skip(
      !ok,
      "Set E2E_SUPABASE_STORAGE_KEY and E2E_SUPABASE_SESSION_JSON to run authenticated specs.",
    );
    await use(true);
  },
});

export { expect };
