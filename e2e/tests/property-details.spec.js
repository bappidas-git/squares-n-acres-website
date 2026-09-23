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
    const keys = await nav
      .locator('[data-section]')
      .evaluateAll((chips) => chips.map((chip) => chip.dataset.section));
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

  test('gates the brochure for a new visit and opens it once, per kind', async ({
    page,
    request,
  }) => {
    // The public read names the brochure but not its address (QA-51 OPEN-1).
    const read = await request.get(`${API_URL}/properties/slug/${SLUG}`);
    const { data: listing } = await read.json();
    expect(listing.brochureUrl).toBeNull();
    expect(listing.hasBrochure).toBe(true);
    expect(
      listing.documents.filter((document) => document.leadGated && document.url !== null)
    ).toEqual([]);

    // The seed's brochure is a placeholder on w3.org; the run never leaves the
    // machine for it.
    await page
      .context()
      .route('https://www.w3.org/**', (route) =>
        route.fulfill({ status: 200, contentType: 'text/plain', body: 'brochure' })
      );

    await page.goto(`/properties/${SLUG}`);
    await page.locator('#section-documents').scrollIntoViewIfNeeded();

    await page
      .getByRole('button', { name: /Download brochure/i })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Your name')).toBeVisible();

    await dialog.getByLabel('Your name').fill('Playwright Downloader');
    await dialog.getByLabel('Phone', { exact: false }).fill('9876500077');
    await dialog.getByLabel('E-mail', { exact: false }).fill('downloader@example.com');

    // The address arrives from `POST /properties/:id/documents/access`, with
    // the token the lead was answered with, and the brochure opens in a tab.
    const opened = page.context().waitForEvent('page');
    await dialog
      .getByRole('button', { name: /send|download|get/i })
      .first()
      .click();
    const tab = await opened;
    await expect(tab).toHaveURL(/\/dummy\.pdf$/);
    await tab.close();

    // The dialog stays open and becomes its own success state — the file is
    // what the visitor came for, so it is handed over rather than announced
    // behind a closed dialog.
    await expect(dialog.getByRole('status')).toBeVisible({ timeout: 20_000 });
    await expect(dialog.getByLabel('Your name')).toHaveCount(0);
    await expect(dialog.getByRole('link', { name: /^Open project brochure/i })).toHaveAttribute(
      'href',
      /\/dummy\.pdf$/
    );

    // The success state offers its own "Close" beside the dialog's own ×.
    await dialog.getByRole('button', { name: 'Close' }).first().click();
    await expect(dialog).toBeHidden();

    // The unlock is per kind and per listing (`leadStorage.UNLOCK_KINDS`), so
    // the next document of this listing opens without asking again.
    await page.locator('#section-documents').scrollIntoViewIfNeeded();
    const next = page.locator('#section-documents').getByRole('button', { name: /Download|Open/i });
    const again = page.context().waitForEvent('page');
    await next.first().click();
    await (await again).close();

    await expect(page.getByRole('dialog').getByLabel('Your name')).toHaveCount(0);
  });

  test('keeps a gated paper’s address out of the page until the visitor has asked', async ({
    page,
    request,
    adminApi,
  }) => {
    const FILES = {
      brochure: 'https://files.e2e.test/lakeview/brochure.pdf',
      prices: 'https://files.e2e.test/lakeview/price-list.pdf',
      rera: 'https://files.e2e.test/lakeview/rera-certificate.pdf',
    };

    // A listing of its own with three distinct files, so that nothing else on
    // the page can carry a gated address by coincidence (the seed uses one
    // placeholder PDF for everything).
    const created = await adminApi.post(`${API_URL}/admin/properties/1/duplicate`);
    expect(created.status()).toBe(201);
    const property = (await created.json()).data;

    try {
      const saved = await adminApi.patch(`${API_URL}/admin/properties/${property.id}`, {
        data: {
          isActive: true,
          brochureUrl: FILES.brochure,
          brochureLeadGated: true,
          documents: [
            {
              id: 1,
              title: 'Current price list',
              url: FILES.prices,
              type: 'price-list',
              leadGated: true,
              order: 1,
            },
            {
              id: 2,
              title: 'RERA certificate',
              url: FILES.rera,
              type: 'approval',
              leadGated: false,
              order: 2,
            },
          ],
        },
      });
      expect(saved.status()).toBe(200);

      // Not in the public JSON, and not in the page, until the form is filled.
      const read = await request.get(`${API_URL}/properties/slug/${property.slug}`);
      const json = await read.text();
      expect(json).not.toContain(FILES.brochure);
      expect(json).not.toContain(FILES.prices);
      expect(json).toContain(FILES.rera);

      await page
        .context()
        .route('https://files.e2e.test/**', (route) =>
          route.fulfill({ status: 200, contentType: 'text/plain', body: 'file' })
        );
      await page.goto(`/properties/${property.slug}`);
      const documents = page.locator('#section-documents');
      await documents.scrollIntoViewIfNeeded();
      const prices = documents.getByRole('button', { name: 'Open Current price list' });
      await expect(prices).toBeVisible();
      expect(await page.content()).not.toContain(FILES.prices);
      expect(await page.content()).not.toContain(FILES.brochure);

      await prices.click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Your name').fill('Playwright Papers');
      await dialog.getByLabel('Phone', { exact: false }).fill('9876500078');

      const opened = page.context().waitForEvent('page');
      await dialog.getByRole('button', { name: /send/i }).first().click();
      const tab = await opened;
      await expect(tab).toHaveURL(FILES.prices);
      await tab.close();

      await expect(dialog.getByRole('link', { name: /^Open Current price list/i })).toHaveAttribute(
        'href',
        FILES.prices
      );

      // The same lead opens the brochure too — one form per listing (P28).
      await dialog.getByRole('button', { name: 'Close' }).first().click();
      const brochure = page.context().waitForEvent('page');
      await documents.getByRole('button', { name: /Download brochure/i }).click();
      const second = await brochure;
      await expect(second).toHaveURL(FILES.brochure);
      await second.close();
      await expect(page.getByRole('dialog').getByLabel('Your name')).toHaveCount(0);
    } finally {
      await adminApi.delete(`${API_URL}/admin/properties/${property.id}`);
    }
  });

  test('keeps the floor plans’ drawings and PDFs out of the page until the visitor has asked', async ({
    page,
    request,
  }) => {
    // Every plan and unit keeps its row in the public read, without an address.
    const { data: listing } = await (
      await request.get(`${API_URL}/properties/slug/${SLUG}`)
    ).json();
    expect(listing.floorPlans.length).toBeGreaterThan(0);
    expect(listing.floorPlans.filter((plan) => plan.imageUrl || plan.pdfUrl)).toEqual([]);
    expect(listing.floorPlans.every((plan) => plan.hasImage)).toBe(true);
    expect(
      listing.unitConfigurations.filter((unit) => unit.floorPlanImageUrl || unit.floorPlanPdfUrl)
    ).toEqual([]);

    // The seed's drawings are picsum placeholders; the run never leaves the
    // machine for them.
    await page.context().route('https://picsum.photos/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"/>',
      })
    );

    await page.goto(`/properties/${SLUG}`);
    const plans = page.locator('#section-floorPlans');
    await plans.scrollIntoViewIfNeeded();
    const ask = plans.getByRole('button', { name: /view floor plans/i });
    await expect(ask).toBeVisible();

    // Not in the page either — the lock blurs a stand-in sketch.
    const before = await page.content();
    expect(before).not.toContain('-plan-');
    expect(before).not.toContain('dummy.pdf');

    await ask.click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Your name').fill('Playwright Planner');
    await dialog.getByLabel('Phone', { exact: false }).fill('9876500079');
    await dialog.getByRole('button', { name: /send/i }).first().click();
    await expect(dialog.getByRole('status')).toBeVisible({ timeout: 20_000 });
    await dialog.getByRole('button', { name: 'Close' }).first().click();

    // The drawings arrive with the token of the lead, and the first opens
    // full size once the dialog is out of the way.
    const lightbox = page.locator('.yarl__root');
    await expect(lightbox).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(lightbox).toBeHidden();

    await expect(plans.getByRole('img', { name: /floor plan$/ }).first()).toHaveAttribute(
      'src',
      /-plan-1/
    );
    await expect(plans.getByRole('link', { name: /download pdf/i })).toHaveAttribute(
      'href',
      /\/dummy\.pdf$/
    );

    // The same answer fills in the unit configurations' thumbnails.
    await expect(
      page
        .locator('#section-unitConfigurations')
        .getByRole('button', { name: /floor plan full screen$/ })
        .first()
    ).toBeVisible();
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
