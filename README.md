# Sauce Demo Test Automation Framework

A Playwright regression suite for [saucedemo.com](https://www.saucedemo.com/), built with the Page Object Model, tagged test suites (`@smoke`, `@critical`, `@regression`), and a CircleCI pipeline with independent jobs per suite.

## Project structure

```
Playwright/
├── .circleci/
│   └── config.yml            # smoke / critical / regression CircleCI jobs
├── fixtures/
│   ├── base.js                # custom test/expect with page-object fixtures, login helper, auto-screenshot wiring
│   └── testData.js            # users, credentials, error messages, checkout data
├── pages/
│   ├── BasePage.js            # shared navigation + captureStep() helper
│   ├── LoginPage.js
│   ├── InventoryPage.js
│   ├── CartPage.js
│   ├── CheckoutStepOnePage.js
│   ├── CheckoutStepTwoPage.js
│   └── CheckoutCompletePage.js
├── tests/
│   ├── login.spec.js          # positive / negative / edge cases
│   ├── cart.spec.js
│   ├── checkout.spec.js
│   ├── sorting.spec.js
│   └── logout.spec.js
├── utils/
│   └── screenshotRecorder.js  # captureStep(): saves + names + attaches a step screenshot
├── screenshots/                # generated per run, gitignored — see "Step screenshots" below
├── playwright.config.js
└── package.json
```

Each page in `pages/` exposes only locators and user actions for that page — tests never touch raw selectors. `fixtures/base.js` extends Playwright's `test` with one fixture per page object plus `loginAsStandardUser`, so any test that needs a logged-in session declares it as a fixture dependency instead of repeating the login flow. `fixtures/testData.js` centralizes users, expected error strings, and checkout data so tests read as assertions, not data entry.

### Step screenshots

Every navigation, user action, and assertion is screenshotted automatically — no test ever calls `page.screenshot()`:

- Each `pages/*.js` method calls `this.captureStep('Description')` once after performing its action (e.g. `LoginPage.login()` captures `EnterUsername`, `EnterPassword`, `ClickLoginButton`).
- `fixtures/base.js` wraps the shared `expect` export so every matcher (`toHaveText`, `toBeVisible`, `toHaveURL`, ...) captures a `Verify_<matcher>` step right after it resolves — pass or fail.
- `fixtures/base.js` also wraps `page.goto()`/`page.reload()` on the `page` fixture itself, so the rare test that calls them directly (e.g. the direct-URL-without-login and refresh-mid-checkout tests) is still covered.

All of this lives in `utils/screenshotRecorder.js`. Adding a new test or page-object method needs no extra wiring — as long as the action goes through a page object (or `page.goto`/`reload`/`expect`), it's captured for free.

Screenshots are written to `screenshots/<TestFileName>/<Describe>/.../<TestTitle>/<TestFileName>_<NN>_<Step>.png`, e.g.:

```
screenshots/Login/Positive/LogsInWithValidCredentials/Login_01_OpenLoginPage.png
screenshots/Login/Positive/LogsInWithValidCredentials/Login_02_EnterUsername.png
screenshots/Login/Positive/LogsInWithValidCredentials/Login_05_VerifyToHaveURL.png
```

Each one is also attached to the Playwright HTML report (see [Viewing Playwright reports](#viewing-playwright-reports)) — open any test in the report and its steps show inline, in order, whether the test passed or failed.

## Installation

```bash
npm install
npx playwright install
```

## Running tests locally

```bash
npx playwright test                       # everything, all browsers
npx playwright test tests/login.spec.js    # a single file
npx playwright test --project=chromium     # a single browser
```

### Running smoke tests

Critical-path sanity check, runs in under a minute.

```bash
npx playwright test --grep @smoke
```

### Running critical tests

Core login, cart, and checkout workflows that must pass before every release.

```bash
npx playwright test --grep @critical
```

### Running regression tests

Full suite: smoke + critical + all additional positive, negative, and edge-case scenarios, across Chromium, Firefox, and WebKit.

```bash
npx playwright test --grep @regression
```

### Headed vs. headless mode

Tests run headless by default.

```bash
npx playwright test --headed               # watch the browser
npx playwright test --headed --debug       # step through with the Playwright inspector
```

## Running tests in CircleCI

`.circleci/config.yml` defines three independent workflows, each wrapping the same parameterized `test` job, each on its own trigger:

| Workflow               | Tag filter    | Browsers                     | Trigger                                  |
|-------------------------|---------------|-------------------------------|-------------------------------------------|
| `smoke-on-main`         | `@smoke`      | Chromium only                 | Every push to `main`                      |
| `critical-weekly`       | `@critical`   | Chromium only                 | Scheduled — every Monday 06:00 UTC        |
| `regression-on-release` | `@regression` | Chromium, Firefox, and WebKit | Every push to `release` or `release/*`    |

Each workflow only fires on its own trigger — pushing to `main` runs smoke but not regression or critical; pushing to a `release` branch runs regression but not the others; critical runs on its weekly schedule regardless of pushes. Any workflow can still be re-run manually from the CircleCI dashboard. Dependencies are installed with `npm ci` inside Microsoft's official `mcr.microsoft.com/playwright` Docker image (browsers pre-installed, matching the `@playwright/test` version pinned in `package.json`), and the npm cache is restored/saved between builds keyed on `package-lock.json`.

To change the schedule or branch patterns, edit the `filters` and `cron` values in `.circleci/config.yml`.

## Viewing Playwright reports

**Locally**, after any test run:

```bash
npx playwright show-report
```

This opens the HTML report (`playwright-report/`) — every test's **Test Steps** tab shows the per-step screenshots described above (for both passed and failed tests), and failed tests additionally get Playwright's own failure screenshot, trace, and video.

**In CircleCI**, open a completed job and check the **Artifacts** tab:

- `playwright-report/` — the HTML report (download and open `index.html`, or `npx playwright show-report <path>`)
- `test-results/` — JUnit XML, plus per-failure screenshots, traces (`.zip`, open with `npx playwright show-trace <file>`), and videos
- `screenshots/` — every per-step screenshot, organized by test, exactly as described in [Step screenshots](#step-screenshots)

The **Tests** tab on the job also renders the JUnit results (`test-results/junit.xml`) inline.
