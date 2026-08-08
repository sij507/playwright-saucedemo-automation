// Intentional placeholder failures — NOT real bugs in the app or the
// framework. These exist purely to verify the full reporting pipeline
// (console step log, extent-report FAIL rendering, screenshots, CircleCI
// artifacts) actually surfaces a failure correctly on a real, committed
// @regression run. Safe to delete once you've confirmed the pipeline works
// end to end, or keep them around as a standing canary.
const { test, expect } = require('../fixtures/base');

test.describe('Pipeline failure demo (intentional, not real bugs)', () => {
  test.beforeEach(async ({ loginAsStandardUser, inventoryPage, step }) => {
    await step.and('the user is on the products page', async () => {
      await inventoryPage.goto();
    });
  });

  test('placeholder: page title does not match on purpose', { tag: ['@regression'] }, async ({ inventoryPage, step }) => {
    await step.then('the page title is asserted to be text it will never have', async () => {
      await expect(inventoryPage.pageTitle).toHaveText('Definitely Not The Real Title', { timeout: 2000 });
    });
  });

  test('placeholder: element that does not exist is asserted visible', { tag: ['@regression'] }, async ({ page, step }) => {
    await step.then('a nonexistent element is asserted to be visible', async () => {
      await expect(page.locator('#this-element-does-not-exist')).toBeVisible({ timeout: 2000 });
    });
  });

  test('placeholder: cart badge asserted to a count it will never reach', { tag: ['@regression'] }, async ({ inventoryPage, step }) => {
    await step.when('the user adds one product to the cart', async () => {
      await inventoryPage.addProductToCart('Sauce Labs Backpack');
    });

    await step.then('the cart badge is asserted to show a different count', async () => {
      await expect(inventoryPage.cartBadge).toHaveText('99', { timeout: 2000 });
    });
  });
});
