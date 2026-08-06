const { captureStep } = require('../utils/screenshotRecorder');

class BasePage {
  constructor(page) {
    this.page = page;
  }

  async gotoPath(path = '/', description) {
    // Read by the page.goto() wrapper installed in fixtures/base.js so the
    // resulting screenshot step gets this descriptive name instead of a
    // generic "Navigate_<url>" one, without capturing the step twice.
    if (description) this.page.__pendingStepDescription = description;
    await this.page.goto(path);
  }

  /** Screenshots the current page state and attaches it as the next numbered step. */
  async captureStep(description) {
    await captureStep(this.page, description);
  }
}

module.exports = { BasePage };
