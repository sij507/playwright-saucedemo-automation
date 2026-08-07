// Minimal demonstration of the extent-report pipeline: fixtures/base.js's
// `step` fixture wraps test.step() and attaches a screenshot when each step
// ends (pass or fail); reporters/extent-reporter.js turns those steps into
// the extent-report/index.html dashboard. The real suite (tests/login.spec.js
// etc.) uses the same fixture. Not tagged @smoke/@critical/@regression on
// purpose, so it stays out of the existing CI suites — run it directly:
//   npx playwright test tests/extent-demo.spec.js
const { test } = require('../fixtures/base');
const { expect } = require('@playwright/test');

test.describe('Extent report demo', () => {
  test('logs in and adds a product to the cart', async ({ page, step }) => {
    await step.given('the user is on the login page', async () => {
      await page.goto('/');
    });

    await step.when('the user logs in with valid credentials', async () => {
      await page.locator('#user-name').fill('standard_user');
      await page.locator('#password').fill('secret_sauce');
      await page.locator('#login-button').click();
    });

    await step.then('the products page is displayed', async () => {
      await expect(page).toHaveURL(/inventory\.html/);
      await expect(page.locator('.title')).toHaveText('Products');
    });

    await step.when('the user adds a product to the cart', async () => {
      await page
        .locator('.inventory_item', { hasText: 'Sauce Labs Backpack' })
        .getByRole('button', { name: 'Add to cart' })
        .click();
    });

    await step.then('the cart badge shows one item', async () => {
      await expect(page.locator('.shopping_cart_badge')).toHaveText('1');
    });
  });
});
