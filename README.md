# Sauce Demo Test Automation Framework

A Playwright regression suite for [saucedemo.com](https://www.saucedemo.com/), built with the Page Object Model, tagged test suites (`@smoke`, `@critical`, `@regression`), and a CircleCI pipeline with independent jobs per suite.

## Project structure

```
Playwright/
├── .circleci/
│   └── config.yml            # smoke / critical / regression CircleCI jobs
├── fixtures/
│   ├── base.js                # custom test/expect with page-object fixtures + login helper
│   └── testData.js            # users, credentials, error messages, checkout data
├── pages/
│   ├── BasePage.js
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
├── playwright.config.js
└── package.json
```

Each page in `pages/` exposes only locators and user actions for that page — tests never touch raw selectors. `fixtures/base.js` extends Playwright's `test` with one fixture per page object plus `loginAsStandardUser`, so any test that needs a logged-in session declares it as a fixture dependency instead of repeating the login flow. `fixtures/testData.js` centralizes users, expected error strings, and checkout data so tests read as assertions, not data entry.

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

`.circleci/config.yml` defines three independent workflows, each wrapping the same parameterized `test` job:

| Workflow     | Tag filter    | Browsers                     |
|--------------|---------------|-------------------------------|
| `smoke`      | `@smoke`      | Chromium only                |
| `critical`   | `@critical`   | Chromium only                |
| `regression` | `@regression` | Chromium, Firefox, and WebKit |

All three run automatically on every push. Because they're separate workflows, each can also be re-run independently from the CircleCI dashboard (or triggered via the CircleCI API) without re-running the others. Dependencies are installed with `npm ci` inside Microsoft's official `mcr.microsoft.com/playwright` Docker image (browsers pre-installed, matching the `@playwright/test` version pinned in `package.json`), and the npm cache is restored/saved between builds keyed on `package-lock.json`.

## Viewing Playwright reports

**Locally**, after any test run:

```bash
npx playwright show-report
```

This opens the HTML report (`playwright-report/`) with pass/fail status, and for failed tests, the screenshot, trace, and video captured on failure.

**In CircleCI**, open a completed job and check the **Artifacts** tab:

- `playwright-report/` — the HTML report (download and open `index.html`, or `npx playwright show-report <path>`)
- `test-results/` — JUnit XML, plus per-failure screenshots, traces (`.zip`, open with `npx playwright show-trace <file>`), and videos

The **Tests** tab on the job also renders the JUnit results (`test-results/junit.xml`) inline.
