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
│   ├── BasePage.js            # shared navigation + perform()/captureStep() helpers
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
│   ├── screenshotRecorder.js  # captureStep()/captureStepFailure(): screenshot + console log for a step
│   └── stepLogger.js          # logStep(): the "[Test: ...] STEP N - ... - PASS/FAIL" console lines
├── screenshots/                # generated per run, gitignored — see "Step screenshots" below
├── extent-report/              # generated per run, gitignored — see "Extent-style HTML report" below
├── playwright.config.js
└── package.json
```

Each page in `pages/` exposes only locators and user actions for that page — tests never touch raw selectors. `fixtures/base.js` extends Playwright's `test` with one fixture per page object plus `loginAsStandardUser`, so any test that needs a logged-in session declares it as a fixture dependency instead of repeating the login flow. `fixtures/testData.js` centralizes users, expected error strings, and checkout data so tests read as assertions, not data entry.

### Step logging & screenshots

Every navigation, user action, and assertion is logged to the console **and** screenshotted automatically — no test ever calls `console.log()` or `page.screenshot()` itself:

- Each `pages/*.js` method wraps its action in `this.perform('Description', () => ...)` (from `BasePage`) instead of calling `.click()`/`.fill()`/`.selectOption()` directly (e.g. `LoginPage.login()` performs `Enter username: <value>`, `Enter password`, `Click Login button`).
- `fixtures/base.js` wraps the shared `expect` export so every matcher (`toHaveText`, `toBeVisible`, `toHaveURL`, ...) is logged right after it settles — pass or fail.
- `fixtures/base.js` also wraps `page.goto()`/`page.reload()` on the `page` fixture itself, so the rare test that calls them directly (e.g. the direct-URL-without-login and refresh-mid-checkout tests) is still covered.

`perform()` (and the `expect`/navigation wrappers) always do the same three things: increment that test's step counter, save a screenshot, and print a console line — on success **or** failure, via `utils/screenshotRecorder.js`'s `captureStep`/`captureStepFailure`. Adding a new test or page-object method needs no extra wiring — as long as the action goes through a page object (or `page.goto`/`reload`/`expect`), it's logged and screenshotted for free.

**Console output** (via `utils/stepLogger.js`, also visible in CircleCI's job output — no extra CI wiring needed since it's just stdout from the `npx playwright test` command):

```
[Test: logs in with valid credentials]
[10:32:01] STEP 1 - Open SauceDemo login page - PASS
[10:32:03] STEP 2 - Enter username: standard_user - PASS
[10:32:04] STEP 3 - Enter password - PASS
[10:32:05] STEP 4 - Click Login button - PASS
[10:32:05] STEP 5 - Verify to Have URL - PASS
```

A failed step prints `- FAIL` plus the error message on the next line, e.g. `STEP 6 - Verify to Have Text - FAIL` followed by `↳ expect(locator).toHaveText(...) failed ...`. Playwright's own `trace: retain-on-failure` / `video: retain-on-failure` settings in `playwright.config.js` still capture a trace and video for the failing test on top of that.

With multiple parallel workers (the local default), several tests' lines interleave in the terminal since each worker prints independently — use `npx playwright test --workers=1` for a clean, sequential trace. **CircleCI already runs with `workers: 1`** (see `playwright.config.js`), so job output there is naturally sequential, one test's full step log after another.

**Screenshots** are written to `screenshots/<TestFileName>/<Describe>/.../<TestTitle>/<TestFileName>_<NN>_<Step>.png`, e.g.:

```
screenshots/Login/Positive/LogsInWithValidCredentials/Login_01_OpenSauceDemoLoginPage.png
screenshots/Login/Positive/LogsInWithValidCredentials/Login_02_EnterUsernameStandardUser.png
screenshots/Login/Positive/LogsInWithValidCredentials/Login_05_VerifyToHaveURL.png
```

These are separate from the `step` fixture's own screenshots below — this page-object-level mechanism still runs on every test, saving files to disk and to CI artifacts, but nothing renders them inline anymore now that the built-in Playwright HTML report has been removed (see [Viewing reports](#viewing-reports)).

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

Every granular action also shows up as its own indented sub-row nested under the Given/When/Then step it ran inside — not just the BDD-level steps. `BasePage.perform()` (used by every `pages/*.js` method), the `page.goto()`/`page.reload()` wrappers, and the wrapped `expect` (see [Step logging & screenshots](#step-logging--screenshots)) all wrap their work in `test.step()` too, so the reporter's step tree — and therefore the report — includes both levels: a bold "When the user logs in with valid credentials" row, followed by its own smaller, indented "Enter username: standard_user" / "Enter password" / "Click Login button" rows, each with its own screenshot. A verification action nested this way (`Verify_toHaveURL`, etc.) is colored **Pass**/**Fail** like a `Then` step, since it's a verification regardless of which BDD keyword it's nested under.

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

| Workflow               | Jobs                                                              | Trigger                                  |
|-------------------------|--------------------------------------------------------------------|-------------------------------------------|
| `smoke-on-main`         | `smoke` — Chromium only                                            | Every push to `main`                      |
| `critical-weekly`       | `critical` — Chromium only                                         | Scheduled — every Monday 06:00 UTC        |
| `regression-on-release` | `regression-chromium`, `regression-firefox`, `regression-webkit`   | Every push to `release` or `release/*`    |

Each workflow only fires on its own trigger — pushing to `main` runs smoke but not regression or critical; pushing to a `release` branch runs regression but not the others; critical runs on its weekly schedule regardless of pushes. Any workflow can still be re-run manually from the CircleCI dashboard.

`regression-on-release` runs its three browsers as three separate jobs in parallel (each its own container) rather than one job running all three browsers sequentially — same total test count, but wall-clock time is roughly the slowest single browser instead of the sum of all three. The trade-off: each browser now produces its own `extent-report/index.html` (see its Artifacts tab) instead of one report covering all three.

Dependencies are installed with `npm ci` inside Microsoft's official `mcr.microsoft.com/playwright` Docker image (browsers pre-installed, matching the `@playwright/test` version pinned in `package.json`), and the npm cache is restored/saved between builds keyed on `package-lock.json`.

To change the schedule or branch patterns, edit the `filters` and `cron` values in `.circleci/config.yml`.

## Viewing reports

There's no built-in Playwright HTML report in this project — `extent-report/index.html` (see [Extent-style HTML report](#extent-style-html-report)) is the primary way to review a run, alongside the raw step log described in [Step logging & screenshots](#step-logging--screenshots).

**Locally**, after any test run:

```bash
open extent-report/index.html   # macOS; on Linux/Windows just open the file in a browser
```

The `[Test: ...] STEP N - ... - PASS/FAIL` lines described above print straight to the terminal during the run — no separate file to open for those.

**In CircleCI**, the same step log lines appear directly in the **Steps** tab under the "Run `<tag>` tests" step (click to expand it). For files, open a completed job and check the **Artifacts** tab:

- `extent-report/` — download `index.html` and open it (self-contained, no server needed)
- `test-results/` — JUnit XML, plus per-failure screenshots, traces (`.zip`, open with `npx playwright show-trace <file>`), and videos from Playwright's failure-capture settings in `playwright.config.js`
- `screenshots/` — every per-step screenshot from the page-object-level mechanism, organized by test, exactly as described in [Step logging & screenshots](#step-logging--screenshots)

The **Tests** tab on the job also renders the JUnit results (`test-results/junit.xml`) inline.
