const { test, expect } = require('../fixtures/base');
const { sortOptions } = require('../fixtures/testData');

test.describe('Product sorting', () => {
  test.beforeEach(async ({ loginAsStandardUser, inventoryPage, step }) => {
    await step.and('the user is on the products page', async () => {
      await inventoryPage.goto();
    });
  });

  test('sorts products by name A to Z', { tag: ['@regression'] }, async ({ inventoryPage, step }) => {
    await step.when('the user sorts by name A to Z', async () => {
      await inventoryPage.sortBy(sortOptions.nameAsc.value);
    });

    await step.then('the products are listed in ascending name order', async () => {
      const names = await inventoryPage.getProductNames();
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    });
  });

  test('sorts products by name Z to A', { tag: ['@regression'] }, async ({ inventoryPage, step }) => {
    await step.when('the user sorts by name Z to A', async () => {
      await inventoryPage.sortBy(sortOptions.nameDesc.value);
    });

    await step.then('the products are listed in descending name order', async () => {
      const names = await inventoryPage.getProductNames();
      const sorted = [...names].sort((a, b) => b.localeCompare(a));
      expect(names).toEqual(sorted);
    });
  });

  test('sorts products by price low to high', { tag: ['@regression'] }, async ({ inventoryPage, step }) => {
    await step.when('the user sorts by price low to high', async () => {
      await inventoryPage.sortBy(sortOptions.priceAsc.value);
    });

    await step.then('the products are listed in ascending price order', async () => {
      const prices = await inventoryPage.getProductPrices();
      const sorted = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sorted);
    });
  });

  test('sorts products by price high to low', { tag: ['@regression'] }, async ({ inventoryPage, step }) => {
    await step.when('the user sorts by price high to low', async () => {
      await inventoryPage.sortBy(sortOptions.priceDesc.value);
    });

    await step.then('the products are listed in descending price order', async () => {
      const prices = await inventoryPage.getProductPrices();
      const sorted = [...prices].sort((a, b) => b - a);
      expect(prices).toEqual(sorted);
    });
  });
});
