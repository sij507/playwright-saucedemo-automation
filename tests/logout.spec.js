const { test, expect } = require('../fixtures/base');
const { errorMessages } = require('../fixtures/testData');

test.describe('Logout', () => {
  test('logs the user out and returns to the login page', {
    tag: ['@smoke', '@critical', '@regression'],
  }, async ({ loginAsStandardUser, inventoryPage, loginPage, page }) => {
    await inventoryPage.goto();

    await inventoryPage.logout();

    await expect(page).toHaveURL('https://www.saucedemo.com/');
    await expect(loginPage.loginButton).toBeVisible();
  });
});

test.describe('Session', () => {
  test('redirects to login when accessing inventory without a session', {
    tag: ['@regression'],
  }, async ({ page, loginPage }) => {
    await page.goto('/inventory.html');

    await expect(page).toHaveURL('https://www.saucedemo.com/');
    await expect(loginPage.errorMessage).toHaveText(errorMessages.loginRequiredForInventory);
  });
});
