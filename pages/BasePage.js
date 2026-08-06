class BasePage {
  constructor(page) {
    this.page = page;
  }

  async gotoPath(path = '/') {
    await this.page.goto(path);
  }
}

module.exports = { BasePage };
