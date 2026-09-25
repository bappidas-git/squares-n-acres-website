/**
 * Admin → Properties: featuring, publishing and saving, end to end (QA-62).
 *
 * The three defects of the audit that only a browser shows whole:
 *
 * - **The Featured row.** A listing featured from the list's star was featured
 *   in the admin and under "View all", and never on the home page: the row
 *   took the eight featured listings with the highest priority, and the seed
 *   already features ten. The spec stars a listing ranked eleventh and finds it
 *   in the row.
 * - **Publishing from the list.** The eye toggle put a listing live with no
 *   photograph, no description and no price — the form's rules were the form's
 *   alone. It now names the listing and what it lacks, and nothing goes live.
 * - **A form left open.** Saving it replaced the whole listing with the copy it
 *   had read, so a star pressed elsewhere meanwhile was silently undone. The
 *   save is refused and the editor is asked.
 *
 * Every listing it uses it creates, and deletes again through the API.
 */

const { test, expect, API_URL } = require('../fixtures/auth');

const STAMP = String(Date.now()).slice(-6);

/** Long enough to publish: 300 characters of description is the floor. */
const DESCRIPTION = `<p>${'A listing the end-to-end suite of the Properties audit creates, publishes and deletes again. '.repeat(4).trim()}</p>`;

/**
 * A listing as the API stores it, created for one test.
 *
 * @param {import('@playwright/test').APIRequestContext} adminApi
 * @param {string} title
 * @param {object} [extra] fields over the bare draft
 * @returns {Promise<object>} the stored record
 */
async function createListing(adminApi, title, extra = {}) {
  const response = await adminApi.post(`${API_URL}/admin/properties`, {
    data: {
      title,
      listingType: 'sale',
      segment: 'residential',
      propertyTypeId: 1,
      constructionStatus: 'ready-to-move',
      availability: 'available',
      location: { localityId: 1, cityId: 1 },
      pricing: {},
      area: {},
      configuration: {},
      project: {},
      isActive: false,
      ...extra,
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data;
}

/** What a listing needs before it may go live (`src/config/propertyRules.js`). */
const READY = {
  images: [
    {
      url: `https://picsum.photos/seed/sna-e2e-featured-${STAMP}/1200/800`,
      alt: 'The end-to-end listing from the street',
    },
  ],
  shortDescription: 'Three bedrooms, ready to move in.',
  description: DESCRIPTION,
  pricing: { price: 9_900_000 },
};

const readListing = async (adminApi, id) =>
  (await (await adminApi.get(`${API_URL}/admin/properties/${id}`)).json()).data;

test.describe('featuring and publishing a property', () => {
  test.afterEach(async ({ adminApi }) => {
    const found = await adminApi.get(`${API_URL}/admin/properties`, {
      params: { q: `E2E ${STAMP}`, perPage: 'all' },
    });
    if (!found.ok()) return;
    for (const property of (await found.json()).data) {
      await adminApi.delete(`${API_URL}/admin/properties/${property.id}`);
    }
  });

  test('a listing starred in the list is in the home page’s Featured row', async ({
    page,
    signIn,
    adminApi,
  }) => {
    const title = `E2E ${STAMP} Starred Residency in Whitefield`;
    const listing = await createListing(adminApi, title, {
      ...READY,
      isActive: true,
      priorityOrder: 0,
    });

    // The point of the test: it ranks below every seeded featured listing, so
    // a row cut at eight could never show it.
    const featured = await (
      await adminApi.get(`${API_URL}/properties/featured`, { params: { perPage: 24 } })
    ).json();
    expect(featured.meta.total).toBeGreaterThanOrEqual(8);

    await signIn('admin');
    await page.goto('/admin/properties');
    await page.getByLabel('Search').fill(title);

    const star = page.getByRole('button', { name: `Featured — ${title}` });
    await expect(star).toHaveAttribute('aria-pressed', 'false', { timeout: 20_000 });
    await star.click();
    await expect(page.getByText(`“${title}” is now featured`)).toBeVisible();
    await expect(star).toHaveAttribute('aria-pressed', 'true');
    expect((await readListing(adminApi, listing.id)).isFeatured).toBe(true);

    await page.goto('/');
    const heading = page.getByRole('heading', { name: 'Featured properties' });
    await heading.scrollIntoViewIfNeeded();
    const row = page.locator('section', { has: heading });
    await expect(row.getByText(title)).toHaveCount(1, { timeout: 20_000 });
  });

  test('the list will not publish a listing the form would refuse, and says why', async ({
    page,
    signIn,
    adminApi,
  }) => {
    const title = `E2E ${STAMP} Bare Draft`;
    const listing = await createListing(adminApi, title);

    await signIn('admin');
    await page.goto('/admin/properties');
    await page.getByLabel('Search').fill(title);

    await page.getByRole('button', { name: `Active — ${title}` }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(`“${title}” is not ready to go live`)).toBeVisible();
    await expect(dialog.getByText(/no photograph with a description/)).toBeVisible();
    await expect(dialog.getByText(/no price/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Got it' }).click();

    expect((await readListing(adminApi, listing.id)).isActive).toBe(false);
    const live = await adminApi.get(`${API_URL}/properties/slug/${listing.slug}`);
    expect(live.status()).toBe(404);
  });

  test('a form left open asks before undoing a star pressed elsewhere', async ({
    page,
    signIn,
    adminApi,
  }) => {
    const title = `E2E ${STAMP} Open Form Heights`;
    const listing = await createListing(adminApi, title, { ...READY, isActive: true });

    await signIn('admin');
    await page.goto(`/admin/properties/edit/${listing.id}`);
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(title);

    // Another tab stars it while this form is open.
    const starred = await adminApi.patch(`${API_URL}/admin/properties/${listing.id}`, {
      data: { isFeatured: true },
    });
    expect(starred.status()).toBe(200);

    await page.getByLabel('Project name').fill(`Open Form Heights ${STAMP}`);
    await page.getByRole('button', { name: 'Save', exact: true }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Somebody else saved this listing' });
    await expect(dialog).toBeVisible();
    // Nothing was written: the star stands.
    const stored = await readListing(adminApi, listing.id);
    expect(stored.isFeatured).toBe(true);
    expect(stored.projectName).not.toBe(`Open Form Heights ${STAMP}`);

    await dialog.getByRole('button', { name: 'Load their version' }).click();
    await expect(page.getByRole('switch', { name: /^Featured/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });
});
