# Smoke testing

The Playwright smoke suite checks the most important routes before partner testing. It does not complete a Stripe checkout, connect to Daily video, create classes, book classes, change learner progress, or write test records.

## One-time setup

```bash
pnpm install
pnpm exec playwright install chromium
```

The default test target is `http://127.0.0.1:3000`. Playwright starts the local development server automatically when `E2E_BASE_URL` is not set. To target a deployed test environment, set `E2E_BASE_URL` to its origin.

## Optional test credentials

Use dedicated test accounts and safe test data. Set these in the shell or in a local, ignored environment file; never commit their real values.

```text
E2E_BASE_URL=https://test.example.com
E2E_PARENT_EMAIL=parent-test@example.com
E2E_PARENT_PASSWORD=replace-with-test-password
E2E_SCHOLAR_EMAIL=scholar-test@example.com
E2E_SCHOLAR_PASSWORD=replace-with-test-password
E2E_ADMIN_EMAIL=admin-test@example.com
E2E_ADMIN_PASSWORD=replace-with-test-password
E2E_STUDENT_ACCESS_CODE=TESTCODE
```

Authenticated tests are skipped with a clear reason when their required credentials are missing. Public-page, route-protection, and PWA/static checks still run. The scholar account should be approved, and the student access code should belong to safe test data.

## Run the checks

```bash
pnpm lint
pnpm build
pnpm test:e2e
```

For interactive local debugging:

```bash
pnpm test:e2e:ui
```

To pass variables for one PowerShell session:

```powershell
$env:E2E_BASE_URL = 'https://test.example.com'
$env:E2E_PARENT_EMAIL = 'parent-test@example.com'
$env:E2E_PARENT_PASSWORD = 'replace-with-test-password'
pnpm test:e2e
```

## Coverage checklist

- Public home, Browse Classes, Student Access, login, and donation routes load without obvious crashes or known raw technical error text.
- A test parent can sign in, open the dashboard, Children, Browse Classes, My Live Classes, and Billing, see the subscription entry point without opening Stripe, and sign out.
- A student access code opens the learner view, live-class links use in-platform routes, and parent/billing navigation stays hidden.
- A test scholar can open Scholar Home and Teaching Classes; roster, progress, recording, and in-platform classroom links are checked when classes exist.
- A test admin can open the Admin Control Center and see its navigation and summary cards.
- Logged-out visitors cannot open the admin dashboard or render a classroom from a sample live-class route.
- The web app manifest, service worker, offline page, and manifest icons are reachable.

Before partner testing, also confirm manually that the configured test accounts contain representative but non-sensitive data. Payment completion and real Daily connections remain manual checks in the appropriate test environments.
