const { captureStep, captureStepFailure } = require('../utils/screenshotRecorder');

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
   */
  async perform(description, actionFn) {
    try {
      const result = await actionFn();
      await this.captureStep(description);
      return result;
    } catch (error) {
      await captureStepFailure(this.page, description, error);
      throw error;
    }
  }
}

module.exports = { BasePage };
