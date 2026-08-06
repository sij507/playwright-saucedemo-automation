const { BasePage } = require('./BasePage');

class CartPage extends BasePage {
  constructor(page) {
    super(page);
    this.cartItems = page.locator('.cart_item');
    this.itemNames = page.locator('.cart_item .inventory_item_name');
    this.checkoutButton = page.locator('[data-test="checkout"]');
    this.continueShoppingButton = page.locator('[data-test="continue-shopping"]');
  }

  async goto() {
    await this.gotoPath('/cart.html', 'OpenCartPage');
  }

  cartItem(productName) {
    return this.cartItems.filter({ has: this.page.locator('.inventory_item_name', { hasText: productName }) });
  }

  async removeItem(productName) {
    await this.cartItem(productName).getByRole('button', { name: 'Remove' }).click();
    await this.captureStep(`RemoveFromCart_${productName}`);
  }

  async getItemNames() {
    return this.itemNames.allTextContents();
  }

  async getItemCount() {
    return this.cartItems.count();
  }

  async checkout() {
    await this.checkoutButton.click();
    await this.captureStep('ClickCheckout');
  }
}

module.exports = { CartPage };
