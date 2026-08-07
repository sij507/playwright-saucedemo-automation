const { test, expect } = require('../fixtures/base');
const { errorMessages } = require('../fixtures/testData');

test.describe('Logout', () => {
  test('logs the user out and returns to the login page', {
    tag: ['@smoke', '@critical', '@regression'],
  }, async ({ loginAsStandardUser, inventoryPage, loginPage, page, step }) => {
    await step.and('the user is on the products page', async () => {
      await inventoryPage.goto();
    });

    await step.when('the user logs out', async () => {
      await inventoryPage.logout();
    });

    await step.then('the user is returned to the login page', async () => {
      await expect(page).toHaveURL('https://www.saucedemo.com/');
      await expect(loginPage.loginButton).toBeVisible();
    });
  });
});

test.describe('Session', () => {
  test('redirects to login when accessing inventory without a session', {
    tag: ['@regression'],
  }, async ({ page, loginPage, step }) => {
    await step.given('the user has no active session', async () => {
      // no login performed
    });

    await step.when('the user navigates directly to the inventory page', async () => {
      await page.goto('/inventory.html');
    });

    await step.then('the user is redirected to the login page with an error', async () => {
      await expect(page).toHaveURL('https://www.saucedemo.com/');
      await expect(loginPage.errorMessage).toHaveText(errorMessages.loginRequiredForInventory);
    });
  });
});
