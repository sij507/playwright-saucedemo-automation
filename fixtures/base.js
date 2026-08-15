const base = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { InventoryPage } = require('../pages/InventoryPage');
const { CartPage } = require('../pages/CartPage');
const { CheckoutStepOnePage } = require('../pages/CheckoutStepOnePage');
const { CheckoutStepTwoPage } = require('../pages/CheckoutStepTwoPage');
const { CheckoutCompletePage } = require('../pages/CheckoutCompletePage');
const { users } = require('./testData');
const { captureStep, captureStepFailure } = require('../utils/screenshotRecorder');
const { describeAssertion, buildFailureSummary } = require('../utils/assertionText');
const { sanitize } = require('../utils/sanitize');

// Tracks the live `page` for whichever test is currently running, keyed by
// testId, so the `expect` wrapper below can screenshot a verification step
// even when the assertion subject isn't a Page/Locator (e.g. a plain array).
const activePages = new Map();

// Wraps page.goto/page.reload once per test (instance-scoped, no global
// prototype patching) so navigation is always captured — whether it came
// from a page object's gotoPath() or a test calling page.goto()/reload()
// directly (e.g. the "direct URL access" and "refresh mid-checkout" tests).
// BasePage.gotoPath sets `__pendingStepDescription` beforehand to get a
// human-readable name (e.g. "OpenLoginPage"); without it, a generic
// "Navigate_<url>" name is used so raw calls are still captured exactly once.
function withNavigationCapture(page) {
  const originalGoto = page.goto.bind(page);
  page.goto = async (...args) => {
    const description = sanitize(page.__pendingStepDescription || `Navigate_${page.url()}`);
    return test.step(description, async () => {
      try {
        const result = await originalGoto(...args);
        page.__pendingStepDescription = null;
        await captureStep(page, description);
        return result;
      } catch (error) {
        page.__pendingStepDescription = null;
        await captureStepFailure(page, description, error);
        throw error;
      }
    });
  };

  const originalReload = page.reload.bind(page);
  page.reload = async (...args) => {
    const description = sanitize(`Reload_${page.url()}`);
    return test.step(description, async () => {
      try {
        const result = await originalReload(...args);
        await captureStep(page, description);
        return result;
      } catch (error) {
        await captureStepFailure(page, description, error);
        throw error;
      }
    });
  };

  return page;
}

const test = base.test.extend({
  page: async ({ page }, use, testInfo) => {
    withNavigationCapture(page);
    activePages.set(testInfo.testId, page);
    await use(page);
    // Deliberately not cleaned up here: when a whole test times out mid-action,
    // Playwright starts fixture teardown before that action's promise actually
    // rejects — deleting these entries at that point raced with the pending
    // captureStepFailure()/expect-wrapper call still using them, resetting the
    // step counter back to 1 and re-printing the "[Test: ...]" header mid-test.
    // testId is unique per test, so a fresh counter starts naturally anyway;
    // leaving entries in place for a whole run is a trivial amount of memory.
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutStepOnePage: async ({ page }, use) => {
    await use(new CheckoutStepOnePage(page));
  },
  checkoutStepTwoPage: async ({ page }, use) => {
    await use(new CheckoutStepTwoPage(page));
  },
  checkoutCompletePage: async ({ page }, use) => {
    await use(new CheckoutCompletePage(page));
  },

  // BDD-style step wrapper for the extent-report (reporters/extent-reporter.js):
  // step(title, action) / step.given|when|then|and|but(title, action) wraps
  // test.step() and attaches a full-page screenshot when the step ends, pass
  // or fail, so specs never call page.screenshot() themselves.
  step: async ({ page }, use, testInfo) => {
    const runStep = (title, action) =>
      test.step(title, async () => {
        try {
          await action();
        } finally {
          try {
            const screenshot = await page.screenshot({ fullPage: true });
            await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
          } catch {
            // Page may already be closed/navigating away; the step's own
            // pass/fail state still gets reported without a screenshot.
          }
        }
      });

    const step = (title, action) => runStep(title, action);
    step.given = (title, action) => runStep(`Given ${title}`, action);
    step.when = (title, action) => runStep(`When ${title}`, action);
    step.then = (title, action) => runStep(`Then ${title}`, action);
    step.and = (title, action) => runStep(`And ${title}`, action);
    step.but = (title, action) => runStep(`But ${title}`, action);

    await use(step);
  },

  // Logs in as standard_user before the test body runs, wrapped as a single
  // "Given" step so it shows up in the extent-report for every test that
  // depends on this fixture instead of repeating the login flow everywhere.
  loginAsStandardUser: async ({ page, step }, use) => {
    const loginPage = new LoginPage(page);
    await step.given('the user is logged in as standard_user', async () => {
      await loginPage.goto();
      await loginPage.login(users.standard.username, users.standard.password);
      await base.expect(page).toHaveURL(/inventory\.html/);
    });
    await use();
  },
});

function resolvePageForScreenshot(subject) {
  if (!subject) return activePages.get(test.info().testId) || null;
  if (typeof subject.screenshot === 'function' && typeof subject.context === 'function') {
    return subject; // subject is a Page
  }
  if (typeof subject.page === 'function') {
    try {
      return subject.page(); // subject is a Locator
    } catch {
      // fall through
    }
  }
  return activePages.get(test.info().testId) || null;
}

// Wraps every matcher call (toHaveText, toBeVisible, toHaveURL, ...) so a
// verification screenshot is captured automatically after each assertion —
// tests only ever import `expect` from here and never call page.screenshot().
//
// The step's title (and therefore what the report displays) is built once,
// up front, from the matcher name + args (describeAssertion) — a concise
// "Assert <label>: <value>" line, since a pass needs nothing more than the
// value that was checked. test.step()'s title can't be changed after the
// fact, so on failure the richer "FAILED — Expected: X, Actual: Y" text is
// shipped separately via a 'failure-summary' attachment for the reporter to
// read (see reporters/extent-reporter.js) rather than trying to rewrite the
// title.
function wrapAssertion(assertion, subject, negated = false) {
  return new Proxy(assertion, {
    get(target, prop) {
      const value = target[prop];
      if (prop === 'not') return wrapAssertion(value, subject, !negated);
      if (typeof prop !== 'string' || typeof value !== 'function') return value;

      return async (...args) => {
        const page = resolvePageForScreenshot(subject);
        const description = sanitize(describeAssertion(prop, args, subject, negated));
        return test.step(description, async () => {
          try {
            const result = await value.apply(target, args);
            if (page) await captureStep(page, description);
            return result;
          } catch (error) {
            const failureSummary = sanitize(buildFailureSummary(prop, args, subject, error, negated));
            if (page) {
              await captureStepFailure(page, failureSummary || description, error);
              try {
                await test.info().attach('failure-summary', {
                  body: Buffer.from(failureSummary || description),
                  contentType: 'text/plain',
                });
              } catch {
                // Best-effort: if the test is already tearing down, the
                // report simply falls back to the plain description.
              }
            }
            throw error;
          }
        });
      };
    },
  });
}

const expect = new Proxy(base.expect, {
  apply(target, thisArg, args) {
    const assertion = Reflect.apply(target, thisArg, args);
    return wrapAssertion(assertion, args[0]);
  },
});

module.exports = { test, expect };
