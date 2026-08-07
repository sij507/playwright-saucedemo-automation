const { test, expect } = require('../fixtures/base');

const PRODUCT_A = 'Sauce Labs Backpack';
const PRODUCT_B = 'Sauce Labs Bike Light';
const PRODUCT_C = 'Sauce Labs Bolt T-Shirt';

test.describe('Shopping cart', () => {
  test.beforeEach(async ({ loginAsStandardUser, inventoryPage, step }) => {
    await step.and('the user is on the products page', async () => {
      await inventoryPage.goto();
    });
  });

  test.describe('Positive', () => {
    test('adds a product to the cart', { tag: ['@critical', '@regression'] }, async ({ inventoryPage, step }) => {
      await step.when('the user adds a product to the cart', async () => {
        await inventoryPage.addProductToCart(PRODUCT_A);
      });

      await step.then('the cart badge shows one item and the product can be removed', async () => {
        await expect(inventoryPage.cartBadge).toHaveText('1');
        await expect(inventoryPage.itemCard(PRODUCT_A).getByRole('button', { name: 'Remove' })).toBeVisible();
      });
    });

    test('removes a product from the cart on the inventory page', { tag: ['@critical', '@regression'] }, async ({ inventoryPage, step }) => {
      await step.given('a product is already in the cart', async () => {
        await inventoryPage.addProductToCart(PRODUCT_A);
      });

      await step.when('the user removes the product from the inventory page', async () => {
        await inventoryPage.removeProductFromCart(PRODUCT_A);
      });

      await step.then('the cart badge is cleared and the product can be added again', async () => {
        await expect(inventoryPage.cartBadge).toHaveCount(0);
        await expect(inventoryPage.itemCard(PRODUCT_A).getByRole('button', { name: 'Add to cart' })).toBeVisible();
      });
    });

    test('removes a product from the cart page', { tag: ['@regression'] }, async ({ inventoryPage, cartPage, step }) => {
      await step.given('a product is already in the cart', async () => {
        await inventoryPage.addProductToCart(PRODUCT_A);
        await inventoryPage.openCart();
      });

      await step.when('the user removes the product from the cart page', async () => {
        await cartPage.removeItem(PRODUCT_A);
      });

      await step.then('the cart is empty', async () => {
        await expect(cartPage.cartItems).toHaveCount(0);
      });
    });

    test('cart page lists all added products', { tag: ['@regression'] }, async ({ inventoryPage, cartPage, step }) => {
      await step.when('the user adds two different products to the cart', async () => {
        await inventoryPage.addProductToCart(PRODUCT_A);
        await inventoryPage.addProductToCart(PRODUCT_B);
        await inventoryPage.openCart();
      });

      await step.then('both products are listed on the cart page', async () => {
        const itemNames = await cartPage.getItemNames();
        expect(itemNames).toEqual(expect.arrayContaining([PRODUCT_A, PRODUCT_B]));
      });
    });
  });

  test.describe('Edge cases', () => {
    test('handles multiple add/remove actions across several products', { tag: ['@regression'] }, async ({ inventoryPage, step }) => {
      await step.when('the user adds three products to the cart', async () => {
        await inventoryPage.addProductToCart(PRODUCT_A);
        await inventoryPage.addProductToCart(PRODUCT_B);
        await inventoryPage.addProductToCart(PRODUCT_C);
      });

      await step.then('the cart badge shows three items', async () => {
        await expect(inventoryPage.cartBadge).toHaveText('3');
      });

      await step.when('the user removes one product', async () => {
        await inventoryPage.removeProductFromCart(PRODUCT_B);
      });

      await step.then('the cart badge shows two items', async () => {
        await expect(inventoryPage.cartBadge).toHaveText('2');
      });

      await step.when('the user removes the remaining two products', async () => {
        await inventoryPage.removeProductFromCart(PRODUCT_A);
        await inventoryPage.removeProductFromCart(PRODUCT_C);
      });

      await step.then('the cart is empty', async () => {
        await expect(inventoryPage.cartBadge).toHaveCount(0);
      });

      await step.when('the user adds a product back to the cart', async () => {
        await inventoryPage.addProductToCart(PRODUCT_A);
      });

      await step.then('the cart badge shows one item', async () => {
        await expect(inventoryPage.cartBadge).toHaveText('1');
      });
    });
  });
});
