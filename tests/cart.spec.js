const { test, expect } = require('../fixtures/base');

const PRODUCT_A = 'Sauce Labs Backpack';
const PRODUCT_B = 'Sauce Labs Bike Light';
const PRODUCT_C = 'Sauce Labs Bolt T-Shirt';

test.describe('Shopping cart', () => {
  test.beforeEach(async ({ loginAsStandardUser, inventoryPage }) => {
    await inventoryPage.goto();
  });

  test.describe('Positive', () => {
    test('adds a product to the cart', { tag: ['@critical', '@regression'] }, async ({ inventoryPage }) => {
      await inventoryPage.addProductToCart(PRODUCT_A);

      await expect(inventoryPage.cartBadge).toHaveText('1');
      await expect(inventoryPage.itemCard(PRODUCT_A).getByRole('button', { name: 'Remove' })).toBeVisible();
    });

    test('removes a product from the cart on the inventory page', { tag: ['@critical', '@regression'] }, async ({ inventoryPage }) => {
      await inventoryPage.addProductToCart(PRODUCT_A);
      await inventoryPage.removeProductFromCart(PRODUCT_A);

      await expect(inventoryPage.cartBadge).toHaveCount(0);
      await expect(inventoryPage.itemCard(PRODUCT_A).getByRole('button', { name: 'Add to cart' })).toBeVisible();
    });

    test('removes a product from the cart page', { tag: ['@regression'] }, async ({ inventoryPage, cartPage }) => {
      await inventoryPage.addProductToCart(PRODUCT_A);
      await inventoryPage.openCart();

      await cartPage.removeItem(PRODUCT_A);

      await expect(cartPage.cartItems).toHaveCount(0);
    });

    test('cart page lists all added products', { tag: ['@regression'] }, async ({ inventoryPage, cartPage }) => {
      await inventoryPage.addProductToCart(PRODUCT_A);
      await inventoryPage.addProductToCart(PRODUCT_B);
      await inventoryPage.openCart();

      const itemNames = await cartPage.getItemNames();
      expect(itemNames).toEqual(expect.arrayContaining([PRODUCT_A, PRODUCT_B]));
    });
  });

  test.describe('Edge cases', () => {
    test('handles multiple add/remove actions across several products', { tag: ['@regression'] }, async ({ inventoryPage }) => {
      await inventoryPage.addProductToCart(PRODUCT_A);
      await inventoryPage.addProductToCart(PRODUCT_B);
      await inventoryPage.addProductToCart(PRODUCT_C);
      await expect(inventoryPage.cartBadge).toHaveText('3');

      await inventoryPage.removeProductFromCart(PRODUCT_B);
      await expect(inventoryPage.cartBadge).toHaveText('2');

      await inventoryPage.removeProductFromCart(PRODUCT_A);
      await inventoryPage.removeProductFromCart(PRODUCT_C);
      await expect(inventoryPage.cartBadge).toHaveCount(0);

      await inventoryPage.addProductToCart(PRODUCT_A);
      await expect(inventoryPage.cartBadge).toHaveText('1');
    });
  });
});
