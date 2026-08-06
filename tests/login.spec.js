const { test, expect } = require('../fixtures/base');
const { users, invalidCredentials, longString, specialCharacters, errorMessages } = require('../fixtures/testData');

test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test.describe('Positive', () => {
    test('logs in with valid credentials', { tag: ['@smoke', '@critical', '@regression'] }, async ({ loginPage, page }) => {
      await loginPage.login(users.standard.username, users.standard.password);

      await expect(page).toHaveURL(/inventory\.html/);
      await expect(page.locator('.title')).toHaveText('Products');
    });
  });

  test.describe('Negative', () => {
    test('rejects an invalid username and password', { tag: ['@regression'] }, async ({ loginPage }) => {
      await loginPage.login(invalidCredentials.username, invalidCredentials.password);

      await expect(loginPage.errorMessage).toHaveText(errorMessages.invalidCredentials);
    });

    test('rejects a locked-out user', { tag: ['@regression'] }, async ({ loginPage }) => {
      await loginPage.login(users.lockedOut.username, users.lockedOut.password);

      await expect(loginPage.errorMessage).toHaveText(errorMessages.lockedOut);
    });

    test('rejects empty username and password', { tag: ['@regression'] }, async ({ loginPage }) => {
      await loginPage.login('', '');

      await expect(loginPage.errorMessage).toHaveText(errorMessages.usernameRequired);
    });

    test('rejects a missing username', { tag: ['@regression'] }, async ({ loginPage }) => {
      await loginPage.login('', users.standard.password);

      await expect(loginPage.errorMessage).toHaveText(errorMessages.usernameRequired);
    });

    test('rejects a missing password', { tag: ['@regression'] }, async ({ loginPage }) => {
      await loginPage.login(users.standard.username, '');

      await expect(loginPage.errorMessage).toHaveText(errorMessages.passwordRequired);
    });
  });

  test.describe('Edge cases', () => {
    test('handles extremely long input values gracefully', { tag: ['@regression'] }, async ({ loginPage, page }) => {
      await loginPage.login(longString, longString);

      await expect(loginPage.errorMessage).toHaveText(errorMessages.invalidCredentials);
      await expect(page).toHaveURL('https://www.saucedemo.com/');
    });

    test('handles special characters in login fields gracefully', { tag: ['@regression'] }, async ({ loginPage, page }) => {
      await loginPage.login(specialCharacters, specialCharacters);

      await expect(loginPage.errorMessage).toHaveText(errorMessages.invalidCredentials);
      await expect(page).toHaveURL('https://www.saucedemo.com/');
    });

    test('handles rapid repeated login attempts without breaking the form', { tag: ['@regression'] }, async ({ loginPage }) => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await loginPage.login(invalidCredentials.username, invalidCredentials.password);
        await expect(loginPage.errorMessage).toHaveText(errorMessages.invalidCredentials);
      }

      // form should still accept valid credentials after repeated failures
      await loginPage.login(users.standard.username, users.standard.password);
      await expect(loginPage.page).toHaveURL(/inventory\.html/);
    });
  });
});
