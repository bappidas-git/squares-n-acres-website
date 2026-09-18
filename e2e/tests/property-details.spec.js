/**
 * The public property page: the gallery, the sections, the navigation, the
 * counted view and the 404 (prompt 44).
 */

const { test, expect, API_URL } = require('../fixtures/auth');

const SLUG = 'lakeview-heights-3-bhk-whitefield';
const TITLE = 'Lakeview Heights – 3 BHK Apartment in Whitefield';

test.describe('a property page', () => {
  test('shows the heading, the gallery and the sections the listing has', async ({ page }) => {
    await page.goto(`/properties/${SLUG}`);

    await expect(page.getByRole('heading', { name: TITLE, level: 1 })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Photos \(\d+\)$/ })).toBeVisible();

    const nav = page.getByRole('navigation', { name: 'Sections of this property' });
    await expect(nav).toBeVisible();

    // Every chip points at a section the page printed (BUG-06).
    const keys = await nav.locator('[data-section]').evaluateAll((chips) =>
      chips.map((chip) => chip.dataset.section)
    );
    expect(keys.length).toBeGreaterThan(0);

    for (const key of keys) {
      await expect(page.locator(`#section-${key}`)).toHaveCount(1);
    }
  });

  test('scrolls to the section a chip names', async ({ page }) => {
    await page.goto(`/properties/${SLUG}`);

    await page.getByRole('link', { name: 'Amenities', exact: true }).click();
    await expect(page.locator('#section-amenities')).toBeInViewport({ timeout: 10_000 });
  });

  test('offers the gallery, the video and the virtual tour as tabs', async ({ page }) => {
    await page.goto(`/properties/${SLUG}`);

    await page.getByRole('tab', { name: 'Video' }).click();
    await page.getByRole('tab', { name: 'Virtual tour' }).click();
    await page.getByRole('tab', { name: /^Photos \(\d+\)$/ }).click();

    await expect(page.getByRole('button', { name: /View all \d+ photos/ })).toBeVisible();
  });

  test('counts one view per session (D29)', async ({ page, adminApi }) => {
    const before = await adminApi.get(`${API_URL}/admin/properties/slug/${SLUG}`);
    const start = (await before.json()).data.viewCount;

    await page.goto(`/properties/${SLUG}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const after = await adminApi.get(`${API_URL}/admin/properties/slug/${SLUG}`);
    const end = (await after.json()).data.viewCount;

    // The session guard and the API's own per-IP hour both cap it; either way
    // two page loads are never two views.
    expect(end - start).toBeLessThanOrEqual(1);
  });

  test('an unknown slug is the 404 page, not an error', async ({ page }) => {
    await page.goto('/properties/there-is-no-listing-at-this-address');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/not found/i);
  });

  test('an unpublished listing is a 404 for a visitor and a preview for an editor', async ({
    page,
    signIn,
    adminApi,
  }) => {
    // `duplicate` is the shortest honest way to an unpublished listing: §5.14
    // has it copy a record and leave the copy switched off.
    const created = await adminApi.post(`${API_URL}/admin/properties/1/duplicate`);
    expect(created.status()).toBe(201);
    const property = (await created.json()).data;
    expect(property.isActive).toBe(false);

    try {
      await page.goto(`/properties/${property.slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(/not found/i);

      await signIn('admin');
      await page.goto(`/properties/${property.slug}?preview=admin`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(property.title);
      await expect(page.getByText(/admin preview/i)).toBeVisible();
    } finally {
      await adminApi.delete(`${API_URL}/admin/properties/${property.id}`);
    }
  });

  test('gates the brochure for a new visit and opens it once, per kind', async ({ page }) => {
    await page.goto(`/properties/${SLUG}`);
    await page.locator('#section-documents').scrollIntoViewIfNeeded();

    await page.getByRole('button', { name: /Download brochure/i }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Your name')).toBeVisible();

    await dialog.getByLabel('Your name').fill('Playwright Downloader');
    await dialog.getByLabel('Phone', { exact: false }).fill('9876500077');
    await dialog.getByLabel('E-mail', { exact: false }).fill('downloader@example.com');
    await dialog.getByRole('button', { name: /send|download|get/i }).first().click();

    // The dialog stays open and becomes its own success state — the file is
    // what the visitor came for, so it is handed over rather than announced
    // behind a closed dialog.
    await expect(dialog.getByRole('status')).toBeVisible({ timeout: 20_000 });
    await expect(dialog.getByLabel('Your name')).toHaveCount(0);

    // The success state offers its own "Close" beside the dialog's own ×.
    await dialog.getByRole('button', { name: 'Close' }).first().click();
    await expect(dialog).toBeHidden();

    // The unlock is per kind and per listing (`leadStorage.UNLOCK_KINDS`), so
    // the next document of this listing opens without asking again.
    await page.locator('#section-documents').scrollIntoViewIfNeeded();
    const next = page.locator('#section-documents').getByRole('button', { name: /Download|Open/i });
    if (await next.first().isVisible()) await next.first().click();
    await page.waitForTimeout(1000);

    await expect(page.getByRole('dialog').getByLabel('Your name')).toHaveCount(0);
  });

  test('recomputes the EMI when the loan terms move', async ({ page }) => {
    await page.goto(`/properties/${SLUG}`);
    const finance = page.locator('#section-finance');
    await finance.scrollIntoViewIfNeeded();

    const before = await finance.innerText();
    await finance.getByRole('slider').first().focus();
    for (let step = 0; step < 6; step += 1) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);

    expect(await finance.innerText()).not.toBe(before);
  });

  test('keeps what this visitor has been looking at', async ({ page }) => {
    await page.goto(`/properties/${SLUG}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.goto('/properties/nandi-skyline-towers-3-bhk-hebbal');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const recent = page.getByRole('region', { name: /recently viewed/i });
    await expect(recent).toBeVisible({ timeout: 20_000 });
    await expect(recent).toContainText('Lakeview Heights');
  });
});
