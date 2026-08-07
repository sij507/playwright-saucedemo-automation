const { test, expect } = require('../fixtures/base');
const { validCheckoutInfo, checkoutConfirmationMessage, errorMessages } = require('../fixtures/testData');

const PRODUCT_A = 'Sauce Labs Backpack';
const PRODUCT_B = 'Sauce Labs Bike Light';

test.describe('Checkout', () => {
  test.beforeEach(async ({ loginAsStandardUser, inventoryPage, step }) => {
    await step.and('the user is on the products page', async () => {
      await inventoryPage.goto();
    });
  });

  test.describe('Positive', () => {
    test('completes checkout for a single product', {
      tag: ['@smoke', '@critical', '@regression'],
    }, async ({ inventoryPage, cartPage, checkoutStepOnePage, checkoutStepTwoPage, checkoutCompletePage, step }) => {
      await step.given('a product is in the cart and checkout has started', async () => {
        await inventoryPage.addProductToCart(PRODUCT_A);
        await inventoryPage.openCart();
        await cartPage.checkout();
      });

      await step.when('the user fills in valid checkout information and continues', async () => {
        await checkoutStepOnePage.fillInfo(validCheckoutInfo);
        await checkoutStepOnePage.continueToOverview();
      });

      await step.then('the order overview lists the product', async () => {
        await expect(checkoutStepTwoPage.itemNames).toHaveText([PRODUCT_A]);
      });

      await step.when('the user finishes the order', async () => {
        await checkoutStepTwoPage.finish();
      });

      await step.then('an order confirmation is shown', async () => {
        await expect(checkoutCompletePage.completeHeader).toHaveText(checkoutConfirmationMessage);
      });
    });

    test('completes checkout for multiple products with a correct total', {
      tag: ['@critical', '@regression'],
    }, async ({ inventoryPage, cartPage, checkoutStepOnePage, checkoutStepTwoPage, checkoutCompletePage, step }) => {
      await step.given('two products are in the cart and checkout has started', async () => {
        await inventoryPage.addProductToCart(PRODUCT_A);
        await inventoryPage.addProductToCart(PRODUCT_B);
        await inventoryPage.openCart();
        await cartPage.checkout();
      });

      await step.when('the user fills in valid checkout information and continues', async () => {
        await checkoutStepOnePage.fillInfo(validCheckoutInfo);
        await checkoutStepOnePage.continueToOverview();
      });

      await step.then('the order total is greater than zero', async () => {
        const total = await checkoutStepTwoPage.getTotal();
        expect(total).toBeGreaterThan(0);
      });

      await step.when('the user finishes the order', async () => {
        await checkoutStepTwoPage.finish();
      });

      await step.then('an order confirmation is shown', async () => {
        await expect(checkoutCompletePage.completeHeader).toHaveText(checkoutConfirmationMessage);
      });
    });
  });

  test.describe('Negative', () => {
    test('rejects checkout info missing a first name', { tag: ['@regression'] }, async ({ inventoryPage, cartPage, checkoutStepOnePage, step }) => {
      await step.given('a product is in the cart and checkout has started', async () => {
        await inventoryPage.addProductToCart(PRODUCT_A);
        await inventoryPage.openCart();
        await cartPage.checkout();
      });

      await step.when('the user continues without a first name', async () => {
        await checkoutStepOnePage.fillInfo({ ...validCheckoutInfo, firstName: '' });
        await checkoutStepOnePage.continueToOverview();
      });

      await step.then('a first-name-required error is shown', async () => {
        await expect(checkoutStepOnePage.errorMessage).toHaveText(errorMessages.firstNameRequired);
      });
    });

    test('rejects checkout info missing a last name', { tag: ['@regression'] }, async ({ inventoryPage, cartPage, checkoutStepOnePage, step }) => {
      await step.given('a product is in the cart and checkout has started', async () => {
        await inventoryPage.addProductToCart(PRODUCT_A);
        await inventoryPage.openCart();
        await cartPage.checkout();
      });

      await step.when('the user continues without a last name', async () => {
        await checkoutStepOnePage.fillInfo({ ...validCheckoutInfo, lastName: '' });
        await checkoutStepOnePage.continueToOverview();
      });

      await step.then('a last-name-required error is shown', async () => {
        await expect(checkoutStepOnePage.errorMessage).toHaveText(errorMessages.lastNameRequired);
      });
    });

    test('rejects checkout info missing a postal code', { tag: ['@regression'] }, async ({ inventoryPage, cartPage, checkoutStepOnePage, step }) => {
      await step.given('a product is in the cart and checkout has started', async () => {
        await inventoryPage.addProductToCart(PRODUCT_A);
        await inventoryPage.openCart();
        await cartPage.checkout();
      });

      await step.when('the user continues without a postal code', async () => {
        await checkoutStepOnePage.fillInfo({ ...validCheckoutInfo, postalCode: '' });
        await checkoutStepOnePage.continueToOverview();
      });

      await step.then('a postal-code-required error is shown', async () => {
        await expect(checkoutStepOnePage.errorMessage).toHaveText(errorMessages.postalCodeRequired);
      });
    });
  });

  test.describe('Edge cases', () => {
    test('allows checkout with an empty cart', { tag: ['@regression'] }, async ({ cartPage, checkoutStepOnePage, checkoutStepTwoPage, checkoutCompletePage, step }) => {
      await step.given('the user starts checkout with an empty cart', async () => {
        await cartPage.goto();
        await cartPage.checkout();
      });

      await step.when('the user fills in valid checkout information and continues', async () => {
        await checkoutStepOnePage.fillInfo(validCheckoutInfo);
        await checkoutStepOnePage.continueToOverview();
      });

      await step.then('the order total is zero', async () => {
        const total = await checkoutStepTwoPage.getTotal();
        expect(total).toBe(0);
      });

      await step.when('the user finishes the order', async () => {
        await checkoutStepTwoPage.finish();
      });

      await step.then('an order confirmation is shown', async () => {
        await expect(checkoutCompletePage.completeHeader).toHaveText(checkoutConfirmationMessage);
      });
    });

    test('preserves checkout state across a browser refresh', {
      tag: ['@regression'],
    }, async ({ page, inventoryPage, cartPage, checkoutStepOnePage, checkoutStepTwoPage, step }) => {
      await step.given('the user reaches the order overview with a product in the cart', async () => {
        await inventoryPage.addProductToCart(PRODUCT_A);
        await inventoryPage.openCart();
        await cartPage.checkout();
        await checkoutStepOnePage.fillInfo(validCheckoutInfo);
        await checkoutStepOnePage.continueToOverview();
        await expect(checkoutStepTwoPage.itemNames).toHaveText([PRODUCT_A]);
      });

      await step.when('the user refreshes the browser', async () => {
        await page.reload();
      });

      await step.then('the checkout overview and cart contents are preserved', async () => {
        await expect(page).toHaveURL(/checkout-step-two\.html/);
        await expect(checkoutStepTwoPage.itemNames).toHaveText([PRODUCT_A]);
      });
    });
  });
});
