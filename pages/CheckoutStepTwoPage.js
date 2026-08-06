const { BasePage } = require('./BasePage');

class CheckoutStepTwoPage extends BasePage {
  constructor(page) {
    super(page);
    this.cartItems = page.locator('.cart_item');
    this.itemNames = page.locator('.cart_item .inventory_item_name');
    this.finishButton = page.locator('[data-test="finish"]');
    this.cancelButton = page.locator('[data-test="cancel"]');
    this.itemTotalLabel = page.locator('.summary_subtotal_label');
    this.taxLabel = page.locator('.summary_tax_label');
    this.totalLabel = page.locator('.summary_total_label');
  }

  async getItemNames() {
    return this.itemNames.allTextContents();
  }

  async getTotal() {
    const text = await this.totalLabel.textContent();
    return Number(text.replace('Total: $', ''));
  }

  async finish() {
    await this.finishButton.click();
    await this.captureStep('ClickFinish');
  }
}

module.exports = { CheckoutStepTwoPage };
