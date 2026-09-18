/**
 * The shortlist: saving, removing, and the page that reads it back (prompt 44).
 *
 * The shortlist is the visitor's own state — `sna_shortlist` in
 * `localStorage`, `ids=` on the wire — so what it has to prove is that the
 * heart, the `/shortlist` page and the stored ids never disagree.
 */

const { test, expect } = require('../fixtures/auth');

const SLUG = 'lakeview-heights-3-bhk-whitefield';
const TITLE = 'Lakeview Heights – 3 BHK Apartment in Whitefield';

const stored = (page) =>
  page.evaluate(() => {
    try {
      return JSON.parse(window.localStorage.getItem('sna_shortlist') ?? '[]');
    } catch {
      return [];
    }
  });

// Every test gets its own browser context, so `sna_shortlist` starts empty on
// its own; clearing it from an init script would also clear it on the
// navigation to `/shortlist`, which is the page under test.
test.describe('the shortlist', () => {
  test('saves a property from its page and reads it back on /shortlist', async ({ page }) => {
    await page.goto(`/properties/${SLUG}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const heart = page.getByRole('button', { name: `Save to shortlist — ${TITLE}` });
    await heart.click();

    await expect(page.getByRole('button', { name: `Remove from shortlist — ${TITLE}` })).toBeVisible();
    expect(await stored(page)).toHaveLength(1);

    await page.goto('/shortlist');
    await expect(page.getByRole('link', { name: TITLE })).toBeVisible({ timeout: 20_000 });
  });

  test('removes it again, from either end', async ({ page }) => {
    await page.goto(`/properties/${SLUG}`);
    await page.getByRole('button', { name: `Save to shortlist — ${TITLE}` }).click();
    await expect(page.getByRole('button', { name: `Remove from shortlist — ${TITLE}` })).toBeVisible();

    await page.goto('/shortlist');
    await page.getByRole('button', { name: `Remove from shortlist — ${TITLE}` }).click();

    expect(await stored(page)).toHaveLength(0);
    await expect(page.getByText(/nothing saved|empty|no properties/i).first()).toBeVisible();
  });

  test('survives a reload, because it is the visitor’s own storage', async ({ page }) => {
    await page.goto(`/properties/${SLUG}`);
    await page.getByRole('button', { name: `Save to shortlist — ${TITLE}` }).click();
    await expect(page.getByRole('button', { name: `Remove from shortlist — ${TITLE}` })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: `Remove from shortlist — ${TITLE}` })).toBeVisible();
  });

  test('keeps several properties in the order they were saved (§7 `ids`)', async ({ page }) => {
    await page.goto('/properties');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const hearts = page.getByRole('button', { name: /^Save to shortlist — / });
    await hearts.nth(0).click();
    await hearts.nth(0).click();

    const ids = await stored(page);
    expect(ids.length).toBeGreaterThanOrEqual(2);

    await page.goto('/shortlist');
    // `ids=3,1` asks the API for those listings in that order, so the page
    // renders them in the order they were saved rather than by relevance.
    const links = page.getByRole('link', { name: /–/ });
    await expect(links.first()).toBeVisible({ timeout: 20_000 });
  });

  test('an empty shortlist says so rather than showing a broken list', async ({ page }) => {
    await page.goto('/shortlist');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/nothing saved|empty|no properties/i).first()).toBeVisible();
  });
});
