# E2E Tests (Playwright)

Smoke + flow tests for Zelar. Run against the local dev server (port 8080).

## Run

```bash
# 1. Start the app (already running in Lovable preview, otherwise):
bun run dev

# 2. In another terminal — public + auth-gate specs (no login needed):
bunx playwright test

# 3. Authenticated specs — export a Supabase session first:
#    Open the app in a browser, sign in, then in DevTools:
#      copy(localStorage.getItem('sb-<project>-auth-token'))
export E2E_SUPABASE_STORAGE_KEY="sb-<project>-auth-token"
export E2E_SUPABASE_SESSION_JSON='<paste session JSON here>'
bunx playwright test
```

Without those env vars, authenticated specs are skipped automatically.

## Files

- `public-routes.spec.ts` — landing, /auth, /pricing, /register, /onboarding render cleanly.
- `auth-gate.spec.ts` — every `/app/*` route redirects when no session is present.
- `app-authenticated.spec.ts` — dashboards, congregations CRUD UI, financial filter, mobile responsiveness.
- `utils/auth.ts` — `requireAuth` fixture that injects the Supabase session into localStorage.

## Config

`playwright.config.ts` at the project root. Override the base URL with `E2E_BASE_URL` to run against the published site:

```bash
E2E_BASE_URL=https://zelarchurch.lovable.app bunx playwright test e2e/public-routes.spec.ts
```
