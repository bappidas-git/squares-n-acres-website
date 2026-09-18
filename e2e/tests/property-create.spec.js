/**
 * Creating a property through the sixteen-tab form and publishing it (prompt 44).
 *
 * The spec fills the four tabs a listing cannot be published without — Basics,
 * Location, Pricing, Media — flips "Published on site" and saves, then checks
 * the two things the editor was promised: the listing is in the admin table,
 * and its public page is live at the slug the form derived from the title.
 *
 * What it creates it deletes again, through the API, so the suite can run twice
 * in a row against the same mock database.
 */

const { test, expect, API_URL } = require('../fixtures/auth');

const STAMP = Date.now();
const TITLE = `E2E Playwright Apartment ${STAMP} in Whitefield`;
const SLUG = `e2e-playwright-apartment-${STAMP}-in-whitefield`;

/** 300 characters is the floor a published listing's description has to clear. */
const DESCRIPTION =
  'A three-bedroom apartment created by the end-to-end suite of prompt 44, so the whole path from ' +
  'the sixteen-tab form to the public page is exercised against the mock exactly as an editor ' +
  'would exercise it. The text is long enough to clear the three hundred characters a published ' +
  'listing needs before it may go live, and it says what it is.';

test.describe('creating and publishing a property', () => {
  test.afterEach(async ({ adminApi }) => {
    const found = await adminApi.get(`${API_URL}/admin/properties`, {
      params: { q: `E2E Playwright Apartment ${STAMP}`, perPage: 'all' },
    });
    if (!found.ok()) return;

    for (const property of (await found.json()).data) {
      await adminApi.delete(`${API_URL}/admin/properties/${property.id}`);
    }
  });

  test('an admin fills the basics, adds an image, publishes and the page is live', async ({
    page,
    signIn,
  }) => {
    await signIn('admin');
    await page.goto('/admin/properties/add');
    await expect(page.getByRole('heading', { name: 'Add property', level: 1 })).toBeVisible();

    /* ---- Basics ---- */
    await page.getByLabel('Title', { exact: false }).first().fill(TITLE);
    await page.getByLabel('Property type', { exact: false }).first().selectOption({ index: 1 });
    await page.getByLabel('Short description').fill('An end-to-end fixture listing.');

    // The description is a Tiptap document rather than a textarea.
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.fill(DESCRIPTION);

    // The slug follows the title while it is locked, which is what a new
    // listing wants: the URL the visitor gets is the one derived here.
    await expect(page.getByLabel('URL', { exact: false }).first()).toHaveValue(SLUG);

    /* ---- Location ---- */
    await page.getByRole('tab', { name: 'Location' }).click();
    const panel = page.getByRole('tabpanel');
    const locality = panel.getByLabel('Locality', { exact: false }).first();
    await locality.click();
    await locality.fill('Whitefield');
    await page
      .getByRole('option', { name: /whitefield/i })
      .first()
      .click();
    await panel.getByLabel('Address', { exact: true }).fill('1 End To End Road, Whitefield');
    await panel.getByLabel('Pincode').fill('560066');

    /* ---- Pricing ---- */
    await page.getByRole('tab', { name: 'Pricing' }).click();
    await page.getByLabel('Price', { exact: true }).fill('9500000');

    /* ---- Media ---- */
    await page.getByRole('tab', { name: 'Media' }).click();
    await page.getByLabel('Add an image').fill('https://picsum.photos/seed/sna-e2e/1200/800');
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    const alt = page.getByLabel(/description of the photograph|alt/i).first();
    await expect(alt).toBeVisible();
    await alt.fill('The living room of the end-to-end fixture listing');

    /* ---- Publish ---- */
    await page.getByRole('switch', { name: 'Published on site' }).click();
    await expect(page.getByRole('switch', { name: 'Published on site' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await page.getByRole('button', { name: 'Create property' }).click();

    // The form leaves "add" for the record's own URL once the API has answered.
    await expect(page).toHaveURL(/\/admin\/properties\/edit\/\d+/, { timeout: 30_000 });

    /* ---- It is in the table, and it is on the site ---- */
    await page.goto('/admin/properties');
    await page.getByLabel('Search').fill(`E2E Playwright Apartment ${STAMP}`);
    await expect(page.getByRole('link', { name: TITLE })).toBeVisible({ timeout: 20_000 });

    await page.goto(`/properties/${SLUG}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE);
    await expect(page.getByText('₹95 L').first()).toBeVisible();
  });

  test('a sales user opens the same form read-only', async ({ page, signIn, adminApi }) => {
    const list = await adminApi.get(`${API_URL}/admin/properties`, { params: { perPage: 1 } });
    const property = (await list.json()).data[0];

    await signIn('sales');
    await page.goto(`/admin/properties/edit/${property.id}`);

    // §7/D15: the form opens, and nothing in it can be written to.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel('Title', { exact: false }).first()).toBeDisabled();
    await expect(page.getByRole('button', { name: /^(Create property|Save)/ })).toHaveCount(0);
  });

  test('maps a 422 from the API onto the field that earned it', async ({ page, signIn }) => {
    await signIn('admin');
    await page.goto('/admin/properties/edit/1');
    await page.getByRole('tab', { name: 'Location' }).click();

    const panel = page.getByRole('tabpanel');
    await panel.getByLabel('Pincode').fill('12');
    await page.getByRole('button', { name: /^Save/ }).first().click();

    // §5.3: the error arrives keyed `location.pincode`, and the form puts it
    // under that box rather than in a toast nobody can act on.
    await expect(panel.getByText(/pincode/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(panel.getByText(/six digits|invalid|format/i).first()).toBeVisible();
  });

  test('exports the filtered table as a CSV (D44)', async ({ page, signIn }) => {
    await signIn('admin');
    await page.goto('/admin/properties?listingType=rent');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }),
      page.getByRole('button', { name: /Export CSV/ }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
});
