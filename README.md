# Sauce Demo Test Automation Framework

A Playwright regression suite for [saucedemo.com](https://www.saucedemo.com/), built with the Page Object Model, tagged test suites (`@smoke`, `@critical`, `@regression`), and a CircleCI pipeline with independent jobs per suite.

## Project structure

```
Playwright/
├── .circleci/
│   └── config.yml            # smoke / critical / regression CircleCI jobs
├── fixtures/
│   ├── base.js                # test/expect: page-object fixtures, login helper, `step` (BDD + screenshots), auto-screenshot wiring
│   └── testData.js            # users, credentials, error messages, checkout data
├── pages/
│   ├── BasePage.js            # shared navigation + captureStep() helper
│   ├── LoginPage.js
│   ├── InventoryPage.js
│   ├── CartPage.js
│   ├── CheckoutStepOnePage.js
│   ├── CheckoutStepTwoPage.js
│   └── CheckoutCompletePage.js
├── reporters/
│   ├── extent-reporter.js     # custom Reporter -> extent-report/index.html
│   └── extentReportHtml.js    # the report's inlined CSS/JS template
├── tests/
│   ├── login.spec.js          # positive / negative / edge cases, all as Given/When/Then steps
│   ├── cart.spec.js
│   ├── checkout.spec.js
│   ├── sorting.spec.js
│   ├── logout.spec.js
│   └── extent-demo.spec.js    # minimal standalone example of the `step` fixture — see below
├── utils/
│   └── screenshotRecorder.js  # captureStep(): saves + names + attaches a step screenshot
├── screenshots/                # generated per run, gitignored — see "Step screenshots" below
├── extent-report/              # generated per run, gitignored — see "Extent-style HTML report" below
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

These are separate from the `step` fixture's own screenshots below — this older, page-object-level mechanism still runs on every test, saving files to disk and to CI artifacts, but nothing renders them inline anymore now that the built-in Playwright HTML report has been removed (see [Viewing reports](#viewing-reports)).

### Extent-style HTML report

A self-contained report — a single `extent-report/index.html` with no server required — is generated on every run, including the CircleCI smoke/critical/regression jobs. It's built specifically around `test.step()`: a left sidebar lists every test (status icon, start time, duration), and selecting one shows a teal start / red end / duration badge row plus a STATUS | TIMESTAMP | DETAILS table, one row per step, each with its screenshot inlined. It supports search, a pass/fail/skipped filter, and a dark-mode toggle (persisted in `localStorage`).

The entire suite (`login.spec.js`, `cart.spec.js`, `checkout.spec.js`, `sorting.spec.js`, `logout.spec.js`) is written with the `step` fixture, as Given/When/Then scenarios:

```js
const { test, expect } = require('../fixtures/base');

test('logs in with valid credentials', async ({ loginPage, page, step }) => {
  await step.given('the user is on the login page', async () => {
    await loginPage.goto();
  });

  await step.when('the user logs in with valid credentials', async () => {
    await loginPage.login('standard_user', 'secret_sauce');
  });

  await step.then('the user is redirected to the products page', async () => {
    await expect(page).toHaveURL(/inventory\.html/);
  });
});
```

`fixtures/base.js`'s `step` fixture wraps `test.step()` and takes a full-page screenshot when the step ends, pass or fail, attaching it via `testInfo.attach()` — specs never call `page.screenshot()`. `step.given` / `.when` / `.then` / `.and` / `.but` are sugar that just prefix the title with the matching keyword; the reporter (`reporters/extent-reporter.js`, a custom `Reporter` reading Playwright's own step tree via `onStepBegin`/`onStepEnd`/...) detects that keyword to color-code the row (`Given`/`When`/`And`/`But` → **Info**, `Then` → **Pass**/**Fail** depending on outcome, any step in a skipped test → **Skip**). On failure, the step's error message and stack (ANSI codes stripped) render directly in the DETAILS cell beneath the screenshot — no extra wiring needed, since `test.step()` already records the thrown error. The shared `loginAsStandardUser` fixture also wraps its login flow in a `step.given(...)`, so every cart/checkout/sorting/logout test that depends on it gets that step for free instead of repeating it.

A spec that doesn't use `step()` still appears in the sidebar, just with an empty step table — see the minimal standalone example in [tests/extent-demo.spec.js](tests/extent-demo.spec.js):

```bash
npx playwright test tests/extent-demo.spec.js
open extent-report/index.html   # macOS; on Linux/Windows just open the file in a browser
```

No server is needed — everything (CSS, JS, screenshots) is inlined into that one HTML file, so it opens directly from disk. That demo spec is deliberately untagged (no `@smoke`/`@critical`/`@regression`), so it never runs as part of the existing CI suites.

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

## Viewing reports

There's no built-in Playwright HTML report in this project — `extent-report/index.html` (see [Extent-style HTML report](#extent-style-html-report)) is the primary way to review a run.

**Locally**, after any test run:

```bash
open extent-report/index.html   # macOS; on Linux/Windows just open the file in a browser
```

**In CircleCI**, open a completed job and check the **Artifacts** tab:

- `extent-report/` — download `index.html` and open it (self-contained, no server needed)
- `test-results/` — JUnit XML, plus per-failure screenshots, traces (`.zip`, open with `npx playwright show-trace <file>`), and videos from Playwright's failure-capture settings in `playwright.config.js`
- `screenshots/` — every per-step screenshot from the older page-object-level mechanism, organized by test, exactly as described in [Step screenshots](#step-screenshots)

The **Tests** tab on the job also renders the JUnit results (`test-results/junit.xml`) inline.
