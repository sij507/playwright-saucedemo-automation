const { test } = require('@playwright/test');
const { captureStep, captureStepFailure, truncate } = require('../utils/screenshotRecorder');
const { sanitize } = require('../utils/sanitize');

class BasePage {
  constructor(page) {
    this.page = page;
  }

  async gotoPath(path = '/', description) {
    // Read by the page.goto() wrapper installed in fixtures/base.js, which
    // logs both the PASS and FAIL case itself (and clears this), so the
    // resulting step gets this descriptive name instead of a generic
    // "Navigate_<url>" one, without capturing/logging the step twice.
    if (description) this.page.__pendingStepDescription = description;
    await this.page.goto(path);
  }

  /** Screenshots the current page state and attaches it as the next numbered step. */
  async captureStep(description) {
    await captureStep(this.page, description);
  }

  /**
   * Reusable wrapper for a single user action (click, fill, selectOption, ...):
   * runs `actionFn`, then logs+screenshots a PASS step on success or a FAIL
   * step (with the error message) on failure — always re-throwing so the
   * test still fails normally. Page object methods use this instead of
   * calling captureStep manually after every action.
   *
   * Wrapped in test.step() so the extent-reporter picks this up as its own
   * row, nested under whichever Given/When/Then step (from the `step`
   * fixture) is currently running.
   */
  async perform(description, actionFn) {
    // Truncated once here (rather than inside captureStep) so the test.step()
    // title, the saved screenshot's filename, and the console log line all
    // agree on the same text — a page object can embed arbitrary test data
    // into `description` (e.g. "Enter username: <value>"), and an untruncated
    // step title would otherwise mismatch the truncated filename/attachment
    // name captureStep produces.
    const safeDescription = truncate(sanitize(description));
    return test.step(safeDescription, async () => {
      try {
        const result = await actionFn();
        await this.captureStep(safeDescription);
        return result;
      } catch (error) {
        await captureStepFailure(this.page, safeDescription, error);
        throw error;
      }
    });
  }
}

module.exports = { BasePage };
