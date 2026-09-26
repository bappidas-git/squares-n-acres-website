/**
 * The SEO panel's actions answer back (prompt 51).
 *
 * The screenshots that started this: "Fix SEO" on an article kept the Content
 * tab open and focused nothing, "Re-analyse" changed nothing anybody could see,
 * and "Auto-fill missing" on a record whose four fields were set wrote nothing
 * and said nothing. Each of them now lands somewhere, or says why it did not.
 *
 * The records are prepared through the API — a focus keyword their titles do
 * not carry, so the first failing test is `seo.title` — and put back afterwards,
 * so the suite can run twice against the same mock database.
 */

const { test, expect, API_URL } = require('../fixtures/auth');

const ARTICLE_ID = 9;
const PROPERTY_ID = 3;
/** A phrase no seeded title carries: the title test fails on `seo.title`. */
const KEYWORD = 'zebra crossing checklist';
/** `fieldId('seo.title')` of `SeoPanel.jsx`. */
const TITLE_FIELD_ID = 'seo-field-seo-title';

const read = async (api, path) => (await (await api.get(`${API_URL}${path}`)).json()).data;

test.describe('the SEO panel actions', () => {
  const originals = {};

  test.beforeEach(async ({ adminApi }) => {
    originals.article = await read(adminApi, `/admin/articles/${ARTICLE_ID}`);
    originals.property = await read(adminApi, `/admin/properties/${PROPERTY_ID}`);
    await adminApi.patch(`${API_URL}/admin/articles/${ARTICLE_ID}`, {
      data: { seo: { ...originals.article.seo, focusKeyword: KEYWORD } },
    });
    await adminApi.patch(`${API_URL}/admin/properties/${PROPERTY_ID}`, {
      data: { seo: { ...originals.property.seo, focusKeyword: KEYWORD } },
    });
  });

  test.afterEach(async ({ adminApi }) => {
    if (originals.article) {
      await adminApi.patch(`${API_URL}/admin/articles/${ARTICLE_ID}`, {
        data: { seo: originals.article.seo },
      });
    }
    if (originals.property) {
      await adminApi.patch(`${API_URL}/admin/properties/${PROPERTY_ID}`, {
        data: { seo: originals.property.seo },
      });
    }
  });

  test('Fix SEO on an article opens the SEO tab on the failing field; the score card answers', async ({
    page,
    signIn,
  }) => {
    await signIn('admin');
    await page.goto(`/admin/articles/edit/${ARTICLE_ID}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Opening the SEO tab runs the analysis, which the rail then reads.
    await page.getByRole('tab', { name: /^SEO/ }).click();
    await expect(page.getByRole('img', { name: /SEO score/ })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('tab', { name: /^Content/ }).click();

    await page.getByRole('button', { name: 'Fix SEO' }).click();

    await expect(page.getByRole('tab', { name: /^SEO/ })).toHaveAttribute('aria-selected', 'true');
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id ?? ''))
      .toBe(TITLE_FIELD_ID);
    await expect(page.getByText(/^Opened SEO — /)).toBeVisible();

    await page.getByRole('button', { name: /^Re-analyse/ }).click();
    await expect(page.getByText(/Re-analysed — /)).toBeVisible();

    await page.getByRole('button', { name: /^Auto-fill missing/ }).click();
    await expect(page.getByText(/^(Nothing to fill|Filled:)/)).toBeVisible();
  });

  test('Fix SEO on a property with an seo.* first failure lands on that field', async ({
    page,
    signIn,
  }) => {
    await signIn('admin');
    await page.goto(`/admin/properties/edit/${PROPERTY_ID}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Edit:');

    await page.getByRole('tab', { name: /^SEO/ }).click();
    await expect(page.getByRole('img', { name: /SEO score/ })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('tab', { name: /^Basics/ }).click();

    await page.getByRole('button', { name: 'Fix SEO' }).click();

    await expect(page.getByRole('tab', { name: /^SEO/ })).toHaveAttribute('aria-selected', 'true');
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id ?? ''))
      .toBe(TITLE_FIELD_ID);
  });
});
