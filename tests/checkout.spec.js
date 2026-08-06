const { test, expect } = require('../fixtures/base');
const { validCheckoutInfo, checkoutConfirmationMessage, errorMessages } = require('../fixtures/testData');

const PRODUCT_A = 'Sauce Labs Backpack';
const PRODUCT_B = 'Sauce Labs Bike Light';

test.describe('Checkout', () => {
  test.beforeEach(async ({ loginAsStandardUser, inventoryPage }) => {
    await inventoryPage.goto();
  });

  test.describe('Positive', () => {
    test('completes checkout for a single product', {
      tag: ['@smoke', '@critical', '@regression'],
    }, async ({ inventoryPage, cartPage, checkoutStepOnePage, checkoutStepTwoPage, checkoutCompletePage }) => {
      await inventoryPage.addProductToCart(PRODUCT_A);
      await inventoryPage.openCart();
      await cartPage.checkout();

      await checkoutStepOnePage.fillInfo(validCheckoutInfo);
      await checkoutStepOnePage.continueToOverview();

      await expect(checkoutStepTwoPage.itemNames).toHaveText([PRODUCT_A]);
      await checkoutStepTwoPage.finish();

      await expect(checkoutCompletePage.completeHeader).toHaveText(checkoutConfirmationMessage);
    });

    test('completes checkout for multiple products with a correct total', {
      tag: ['@critical', '@regression'],
    }, async ({ inventoryPage, cartPage, checkoutStepOnePage, checkoutStepTwoPage, checkoutCompletePage }) => {
      await inventoryPage.addProductToCart(PRODUCT_A);
      await inventoryPage.addProductToCart(PRODUCT_B);
      await inventoryPage.openCart();
      await cartPage.checkout();

      await checkoutStepOnePage.fillInfo(validCheckoutInfo);
      await checkoutStepOnePage.continueToOverview();

      const total = await checkoutStepTwoPage.getTotal();
      expect(total).toBeGreaterThan(0);

      await checkoutStepTwoPage.finish();
      await expect(checkoutCompletePage.completeHeader).toHaveText(checkoutConfirmationMessage);
    });
  });

  test.describe('Negative', () => {
    test('rejects checkout info missing a first name', { tag: ['@regression'] }, async ({ inventoryPage, cartPage, checkoutStepOnePage }) => {
      await inventoryPage.addProductToCart(PRODUCT_A);
      await inventoryPage.openCart();
      await cartPage.checkout();

      await checkoutStepOnePage.fillInfo({ ...validCheckoutInfo, firstName: '' });
      await checkoutStepOnePage.continueToOverview();

      await expect(checkoutStepOnePage.errorMessage).toHaveText(errorMessages.firstNameRequired);
    });

    test('rejects checkout info missing a last name', { tag: ['@regression'] }, async ({ inventoryPage, cartPage, checkoutStepOnePage }) => {
      await inventoryPage.addProductToCart(PRODUCT_A);
      await inventoryPage.openCart();
      await cartPage.checkout();

      await checkoutStepOnePage.fillInfo({ ...validCheckoutInfo, lastName: '' });
      await checkoutStepOnePage.continueToOverview();

      await expect(checkoutStepOnePage.errorMessage).toHaveText(errorMessages.lastNameRequired);
    });

    test('rejects checkout info missing a postal code', { tag: ['@regression'] }, async ({ inventoryPage, cartPage, checkoutStepOnePage }) => {
      await inventoryPage.addProductToCart(PRODUCT_A);
      await inventoryPage.openCart();
      await cartPage.checkout();

      await checkoutStepOnePage.fillInfo({ ...validCheckoutInfo, postalCode: '' });
      await checkoutStepOnePage.continueToOverview();

      await expect(checkoutStepOnePage.errorMessage).toHaveText(errorMessages.postalCodeRequired);
    });
  });

  test.describe('Edge cases', () => {
    test('allows checkout with an empty cart', { tag: ['@regression'] }, async ({ cartPage, checkoutStepOnePage, checkoutStepTwoPage, checkoutCompletePage }) => {
      await cartPage.goto();
      await cartPage.checkout();

      await checkoutStepOnePage.fillInfo(validCheckoutInfo);
      await checkoutStepOnePage.continueToOverview();

      const total = await checkoutStepTwoPage.getTotal();
      expect(total).toBe(0);

      await checkoutStepTwoPage.finish();
      await expect(checkoutCompletePage.completeHeader).toHaveText(checkoutConfirmationMessage);
    });

    test('preserves checkout state across a browser refresh', {
      tag: ['@regression'],
    }, async ({ page, inventoryPage, cartPage, checkoutStepOnePage, checkoutStepTwoPage }) => {
      await inventoryPage.addProductToCart(PRODUCT_A);
      await inventoryPage.openCart();
      await cartPage.checkout();
      await checkoutStepOnePage.fillInfo(validCheckoutInfo);
      await checkoutStepOnePage.continueToOverview();

      await expect(checkoutStepTwoPage.itemNames).toHaveText([PRODUCT_A]);

      await page.reload();

      await expect(page).toHaveURL(/checkout-step-two\.html/);
      await expect(checkoutStepTwoPage.itemNames).toHaveText([PRODUCT_A]);
    });
  });
});
