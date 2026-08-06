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
    await this.gotoPath('/', 'OpenLoginPage');
  }

  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.captureStep('EnterUsername');
    await this.passwordInput.fill(password);
    await this.captureStep('EnterPassword');
    await this.loginButton.click();
    await this.captureStep('ClickLoginButton');
  }

  async getErrorMessage() {
    return this.errorMessage.textContent();
  }
}

module.exports = { LoginPage };
