const { test, expect } = require('../fixtures/base');
const { users, invalidCredentials, longString, specialCharacters, errorMessages } = require('../fixtures/testData');

test.describe('Login', () => {
  test.beforeEach(async ({ loginPage, step }) => {
    await step.given('the user is on the login page', async () => {
      await loginPage.goto();
    });
  });

  test.describe('Positive', () => {
    test('logs in with valid credentials', { tag: ['@smoke', '@critical', '@regression'] }, async ({ loginPage, page, step }) => {
      await step.when('the user logs in with valid credentials', async () => {
        await loginPage.login(users.standard.username, users.standard.password);
      });

      await step.then('the user is redirected to the products page', async () => {
        await expect(page).toHaveURL(/inventory\.html/);
        await expect(page.locator('.title')).toHaveText('Products');
      });
    });
  });

  test.describe('Negative', () => {
    test('rejects an invalid username and password', { tag: ['@regression'] }, async ({ loginPage, step }) => {
      await step.when('the user logs in with an invalid username and password', async () => {
        await loginPage.login(invalidCredentials.username, invalidCredentials.password);
      });

      await step.then('an invalid credentials error is shown', async () => {
        await expect(loginPage.errorMessage).toHaveText(errorMessages.invalidCredentials);
      });
    });

    test('rejects a locked-out user', { tag: ['@regression'] }, async ({ loginPage, step }) => {
      await step.when('the user logs in with a locked-out account', async () => {
        await loginPage.login(users.lockedOut.username, users.lockedOut.password);
      });

      await step.then('a locked-out user error is shown', async () => {
        await expect(loginPage.errorMessage).toHaveText(errorMessages.lockedOut);
      });
    });

    test('rejects empty username and password', { tag: ['@regression'] }, async ({ loginPage, step }) => {
      await step.when('the user submits the form with both fields empty', async () => {
        await loginPage.login('', '');
      });

      await step.then('a username-required error is shown', async () => {
        await expect(loginPage.errorMessage).toHaveText(errorMessages.usernameRequired);
      });
    });

    test('rejects a missing username', { tag: ['@regression'] }, async ({ loginPage, step }) => {
      await step.when('the user submits the form without a username', async () => {
        await loginPage.login('', users.standard.password);
      });

      await step.then('a username-required error is shown', async () => {
        await expect(loginPage.errorMessage).toHaveText(errorMessages.usernameRequired);
      });
    });

    test('rejects a missing password', { tag: ['@regression'] }, async ({ loginPage, step }) => {
      await step.when('the user submits the form without a password', async () => {
        await loginPage.login(users.standard.username, '');
      });

      await step.then('a password-required error is shown', async () => {
        await expect(loginPage.errorMessage).toHaveText(errorMessages.passwordRequired);
      });
    });
  });

  test.describe('Edge cases', () => {
    test('handles extremely long input values gracefully', { tag: ['@regression'] }, async ({ loginPage, page, step }) => {
      await step.when('the user submits extremely long username and password values', async () => {
        await loginPage.login(longString, longString);
      });

      await step.then('an invalid credentials error is shown and the user stays on the login page', async () => {
        await expect(loginPage.errorMessage).toHaveText(errorMessages.invalidCredentials);
        await expect(page).toHaveURL('https://www.saucedemo.com/');
      });
    });

    test('handles special characters in login fields gracefully', { tag: ['@regression'] }, async ({ loginPage, page, step }) => {
      await step.when('the user submits special characters as username and password', async () => {
        await loginPage.login(specialCharacters, specialCharacters);
      });

      await step.then('an invalid credentials error is shown and the user stays on the login page', async () => {
        await expect(loginPage.errorMessage).toHaveText(errorMessages.invalidCredentials);
        await expect(page).toHaveURL('https://www.saucedemo.com/');
      });
    });

    test('handles rapid repeated login attempts without breaking the form', { tag: ['@regression'] }, async ({ loginPage, page, step }) => {
      await step.when('the user submits invalid credentials five times in a row', async () => {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          await loginPage.login(invalidCredentials.username, invalidCredentials.password);
          await expect(loginPage.errorMessage).toHaveText(errorMessages.invalidCredentials);
        }
      });

      await step.then('the form still accepts valid credentials afterwards', async () => {
        await loginPage.login(users.standard.username, users.standard.password);
        await expect(page).toHaveURL(/inventory\.html/);
      });
    });
  });
});
