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
    await this.firstNameInput.fill(firstName);
    await this.captureStep('EnterFirstName');
    await this.lastNameInput.fill(lastName);
    await this.captureStep('EnterLastName');
    await this.postalCodeInput.fill(postalCode);
    await this.captureStep('EnterPostalCode');
  }

  async continueToOverview() {
    await this.continueButton.click();
    await this.captureStep('ClickContinue');
  }

  async getErrorMessage() {
    return this.errorMessage.textContent();
  }
}

module.exports = { CheckoutStepOnePage };
