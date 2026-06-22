import { requireAuth as test, expect } from "./utils/auth";

/**
 * Authenticated smoke tests. Skipped automatically unless
 * E2E_SUPABASE_STORAGE_KEY and E2E_SUPABASE_SESSION_JSON are exported.
 */

test.describe("authenticated /app navigation", () => {
  const routes = [
    { path: "/app/dashboard", heading: /(dashboard|início|painel)/i },
    { path: "/app/congregations", heading: /congrega/i },
    { path: "/app/members", heading: /membro/i },
    { path: "/app/financeiro", heading: /(financeiro|lan[çc]amento)/i },
    { path: "/app/financeiro/relatorios", heading: /(relat[óo]rio|balancete|dre)/i },
    { path: "/app/conselho-fiscal", heading: /conselho/i },
  ];

  for (const { path, heading } of routes) {
    test(`${path} loads protected content`, async ({ page, authed: _ }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));

      await page.goto(path, { waitUntil: "networkidle" });
      expect(page.url(), `should not redirect away from ${path}`).toContain(path);

      // At least one heading or named landmark on the page should match.
      const matchedHeading = page
        .getByRole("heading", { name: heading })
        .or(page.getByText(heading));
      await expect(matchedHeading.first()).toBeVisible({ timeout: 10_000 });

      expect(pageErrors, `runtime errors on ${path}`).toEqual([]);
    });
  }
});

test.describe("congregations page", () => {
  test("shows usage counter and Nova Congregação button", async ({ page, authed: _ }) => {
    await page.goto("/app/congregations", { waitUntil: "networkidle" });

    await expect(
      page.getByRole("heading", { name: /congrega/i }).first(),
    ).toBeVisible();

    const newBtn = page.getByRole("button", { name: /nova congrega/i });
    await expect(newBtn).toBeVisible();

    // Usage line: "X de Y congregações cadastradas." or empty-state copy.
    const usage = page.getByText(/(de\s+(\d+|ilimitado)\s+congrega|gerencie as filiais)/i);
    await expect(usage.first()).toBeVisible();
  });

  test("opens Nova Congregação dialog when within plan limit", async ({ page, authed: _ }) => {
    await page.goto("/app/congregations", { waitUntil: "networkidle" });
    const newBtn = page.getByRole("button", { name: /nova congrega/i });

    const disabled = await newBtn.isDisabled();
    test.skip(disabled, "Plan limit reached on this account; skipping dialog test.");

    await newBtn.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(/nome/i).first()).toBeVisible();

    // Close cleanly so the test doesn't leave UI state behind.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("financial filter by congregation", () => {
  test("renders congregation selector on /app/financeiro", async ({ page, authed: _ }) => {
    await page.goto("/app/financeiro", { waitUntil: "networkidle" });
    const selector = page.getByText(/todas \(consolidado\)/i);
    await expect(selector.first()).toBeVisible();
  });
});

test.describe("responsiveness", () => {
  test("congregations page is usable on mobile viewport", async ({ page, authed: _ }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/app/congregations", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: /congrega/i }).first(),
    ).toBeVisible();
    // No horizontal overflow on the document.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
