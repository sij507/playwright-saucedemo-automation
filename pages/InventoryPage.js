const { BasePage } = require('./BasePage');

class InventoryPage extends BasePage {
  constructor(page) {
    super(page);
    this.inventoryItems = page.locator('.inventory_item');
    this.itemNames = page.locator('.inventory_item_name');
    this.itemPrices = page.locator('.inventory_item_price');
    this.sortDropdown = page.locator('[data-test="product-sort-container"]');
    this.cartLink = page.locator('.shopping_cart_link');
    this.cartBadge = page.locator('.shopping_cart_badge');
    this.burgerMenuButton = page.locator('#react-burger-menu-btn');
    this.logoutLink = page.locator('#logout_sidebar_link');
    this.pageTitle = page.locator('.title');
  }

  async goto() {
    await this.gotoPath('/inventory.html');
  }

  itemCard(productName) {
    return this.inventoryItems.filter({ has: this.page.locator('.inventory_item_name', { hasText: productName }) });
  }

  async addProductToCart(productName) {
    await this.itemCard(productName).getByRole('button', { name: 'Add to cart' }).click();
  }

  async removeProductFromCart(productName) {
    await this.itemCard(productName).getByRole('button', { name: 'Remove' }).click();
  }

  async getCartItemCount() {
    if (await this.cartBadge.count() === 0) return 0;
    return Number(await this.cartBadge.textContent());
  }

  async sortBy(sortValue) {
    await this.sortDropdown.selectOption(sortValue);
  }

  async getProductNames() {
    return this.itemNames.allTextContents();
  }

  async getProductPrices() {
    const priceTexts = await this.itemPrices.allTextContents();
    return priceTexts.map((price) => Number(price.replace('$', '')));
  }

  async openCart() {
    await this.cartLink.click();
  }

  async logout() {
    await this.burgerMenuButton.click();
    await this.logoutLink.click();
  }
}

module.exports = { InventoryPage };
