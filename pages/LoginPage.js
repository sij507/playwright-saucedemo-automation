const { BasePage } = require('./BasePage');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.usernameInput = page.locator('#user-name');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('#login-button');
    this.errorMessage = page.locator('[data-test="error"]');
    this.errorCloseButton = page.locator('.error-button');
  }

  async goto() {
    await this.gotoPath('/', 'Open SauceDemo login page');
  }

  async login(username, password) {
    await this.perform(`Enter username: ${username}`, () => this.usernameInput.fill(username));
    await this.perform('Enter password', () => this.passwordInput.fill(password));
    await this.perform('Click Login button', () => this.loginButton.click());
  }

  async getErrorMessage() {
    return this.errorMessage.textContent();
  }
}

module.exports = { LoginPage };
