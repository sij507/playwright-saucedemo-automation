const { test, expect } = require('../fixtures/base');
const { sortOptions } = require('../fixtures/testData');

test.describe('Product sorting', () => {
  test.beforeEach(async ({ loginAsStandardUser, inventoryPage }) => {
    await inventoryPage.goto();
  });

  test('sorts products by name A to Z', { tag: ['@regression'] }, async ({ inventoryPage }) => {
    await inventoryPage.sortBy(sortOptions.nameAsc.value);

    const names = await inventoryPage.getProductNames();
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  test('sorts products by name Z to A', { tag: ['@regression'] }, async ({ inventoryPage }) => {
    await inventoryPage.sortBy(sortOptions.nameDesc.value);

    const names = await inventoryPage.getProductNames();
    const sorted = [...names].sort((a, b) => b.localeCompare(a));
    expect(names).toEqual(sorted);
  });

  test('sorts products by price low to high', { tag: ['@regression'] }, async ({ inventoryPage }) => {
    await inventoryPage.sortBy(sortOptions.priceAsc.value);

    const prices = await inventoryPage.getProductPrices();
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
  });

  test('sorts products by price high to low', { tag: ['@regression'] }, async ({ inventoryPage }) => {
    await inventoryPage.sortBy(sortOptions.priceDesc.value);

    const prices = await inventoryPage.getProductPrices();
    const sorted = [...prices].sort((a, b) => b - a);
    expect(prices).toEqual(sorted);
  });
});
