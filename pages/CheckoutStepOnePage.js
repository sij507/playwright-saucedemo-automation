const { BasePage } = require('./BasePage');

class CheckoutStepOnePage extends BasePage {
  constructor(page) {
    super(page);
    this.firstNameInput = page.locator('#first-name');
    this.lastNameInput = page.locator('#last-name');
    this.postalCodeInput = page.locator('#postal-code');
    this.continueButton = page.locator('[data-test="continue"]');
    this.cancelButton = page.locator('[data-test="cancel"]');
    this.errorMessage = page.locator('[data-test="error"]');
  }

  async fillInfo({ firstName, lastName, postalCode }) {
    await this.perform(`Enter first name: ${firstName}`, () => this.firstNameInput.fill(firstName));
    await this.perform(`Enter last name: ${lastName}`, () => this.lastNameInput.fill(lastName));
    await this.perform(`Enter postal code: ${postalCode}`, () => this.postalCodeInput.fill(postalCode));
  }

  async continueToOverview() {
    await this.perform('Click Continue button', () => this.continueButton.click());
  }

  async getErrorMessage() {
    return this.errorMessage.textContent();
  }
}

module.exports = { CheckoutStepOnePage };
