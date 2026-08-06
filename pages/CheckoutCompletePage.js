const { BasePage } = require('./BasePage');

class CheckoutCompletePage extends BasePage {
  constructor(page) {
    super(page);
    this.completeHeader = page.locator('.complete-header');
    this.backHomeButton = page.locator('[data-test="back-to-products"]');
  }

  async getConfirmationMessage() {
    return this.completeHeader.textContent();
  }

  async backToProducts() {
    await this.backHomeButton.click();
    await this.captureStep('ClickBackToProducts');
  }
}

module.exports = { CheckoutCompletePage };
