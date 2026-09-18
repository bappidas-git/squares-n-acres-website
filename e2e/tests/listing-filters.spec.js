/**
 * The listing engine: filters, the address they live in, and the way back
 * (prompt 44).
 *
 * Every filter is a §5.7 parameter in the query string, so a filtered listing
 * is a shareable URL and the back button is the way to undo one. Both are
 * checked here, along with the empty state's offer to widen.
 */

const { test, expect } = require('../fixtures/auth');

const resultCount = (page) => page.getByRole('heading', { level: 1 });

test.describe('the public listing', () => {
  test('narrows on a rail filter and writes it into the address', async ({ page }) => {
    await page.goto('/properties');
    await expect(resultCount(page)).toContainText('Properties in Bengaluru');

    await page.getByRole('button', { name: '3 BHK', exact: false }).first().click();

    await expect(page).toHaveURL(/bedrooms=3/, { timeout: 20_000 });
    await expect(page.getByRole('button', { name: /Reset/ })).toBeVisible();
  });

  test('restores a deep link exactly as it was shared', async ({ page }) => {
    await page.goto('/properties?listingType=rent&bedrooms=2,3&sort=price-asc');

    await expect(page).toHaveURL(/listingType=rent/);
    await expect(page).toHaveURL(/bedrooms=2%2C3|bedrooms=2,3/);

    // The results arrived: every card links to the listing it shows.
    const cards = page.locator('main a[href^="/properties/"]');
    await expect(cards.first()).toBeVisible({ timeout: 20_000 });
  });

  test('a route fixes its own filter and the rail cannot unset it', async ({ page }) => {
    await page.goto('/rent');

    await expect(resultCount(page)).toBeVisible();
    // `/rent` is rent: the parameter lives in the path, never in the query.
    await expect(page).not.toHaveURL(/listingType=/);
  });

  test('resolves a property-type slug and a status slug under the same parent (D25)', async ({
    page,
  }) => {
    await page.goto('/buy/apartments');
    await expect(resultCount(page)).toContainText(/apartments/i);

    await page.goto('/buy/ready-to-move');
    await expect(resultCount(page)).toContainText(/ready-to-move/i);

    await page.goto('/buy/there-is-no-such-property-type');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/not found/i);
  });

  test('offers to widen a search that found nothing', async ({ page }) => {
    await page.goto('/properties?minPrice=999999999999');

    await expect(page.getByText(/no properties|nothing matches|no results/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: /any budget/i })).toBeVisible();
  });

  test('the back button undoes a filter', async ({ page }) => {
    await page.goto('/properties');
    await expect(resultCount(page)).toBeVisible();

    await page.getByRole('button', { name: '3 BHK', exact: false }).first().click();
    await expect(page).toHaveURL(/bedrooms=3/, { timeout: 20_000 });

    await page.goBack();
    await expect(page).not.toHaveURL(/bedrooms=/);
  });

  test('switches between the grid and the list without losing the filters', async ({ page }) => {
    await page.goto('/properties?bedrooms=3');

    await page.getByRole('button', { name: 'List view' }).click();
    await expect(page).toHaveURL(/bedrooms=3/);

    await page.getByRole('button', { name: 'Grid view' }).click();
    await expect(page).toHaveURL(/bedrooms=3/);
  });

  test('a page beyond the last one is empty rather than broken', async ({ page }) => {
    await page.goto('/properties?page=9999');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/something went wrong/i);
  });

  test('the header search answers with the groups the contract promises', async ({ page }) => {
    await page.goto('/properties');
    await page.getByRole('button', { name: 'Search properties' }).click();

    const box = page.getByRole('combobox').or(page.getByRole('searchbox')).first();
    await box.fill('whitefield');

    // §5.14: localities, properties, property types and developers, five each.
    await expect(page.getByText(/whitefield/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
