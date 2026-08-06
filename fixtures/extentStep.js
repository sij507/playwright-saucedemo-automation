const { test: base, expect } = require('./base');

/**
 * Adds a `step` fixture on top of the project's base fixtures (page objects,
 * loginAsStandardUser, ...). `step(title, action)` wraps `test.step()` and
 * attaches a full-page screenshot when the step finishes — pass or fail —
 * so specs never call page.screenshot() themselves. The extent-reporter
 * (reporters/extent-reporter.js) reads these step/attachment pairs to build
 * its report; on failure, test.step() already records the thrown error on
 * the step, so the reporter shows message + stack without extra work here.
 *
 * Convenience methods step.given/when/then/and just prefix the title with
 * the matching BDD keyword before delegating to the same wrapper.
 */
const test = base.extend({
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
});

module.exports = { test, expect };
