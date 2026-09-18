/**
 * The SEO panel: analysing, saving and what the save does (prompt 45).
 *
 * The SEO Manager is the other module §1 calls most important, and the panel is
 * where an editor meets it. Three promises are worth a browser:
 *
 *   - the analysis runs on what is on screen, so typing a focus keyword changes
 *     the verdict without a save (§9.6);
 *   - a save writes the `seo` branch and **only** the `seo` branch — §5.8's
 *     `PATCH` semantics, which a form that sent the whole record would break;
 *   - the score and band the dashboard sorts by are stored with it, so the
 *     dashboard does not have to re-analyse a hundred records to draw a list.
 *
 * It runs against seed property 3 and puts the `seo` branch back afterwards, so
 * the suite can run twice against the same mock database.
 */

const { test, expect, API_URL } = require('../fixtures/auth');

const PROPERTY_ID = 3;
const KEYWORD = 'ready 3 bhk in hebbal';
const SEO_TITLE = 'Ready 3 BHK in Hebbal — Nandi Skyline Towers';

test.describe('the SEO panel', () => {
  /** @type {object|null} */
  let original = null;

  test.beforeEach(async ({ adminApi }) => {
    const record = await (await adminApi.get(`${API_URL}/admin/properties/${PROPERTY_ID}`)).json();
    original = record.data;
  });

  test.afterEach(async ({ adminApi }) => {
    if (!original) return;
    await adminApi.patch(`${API_URL}/admin/properties/${PROPERTY_ID}`, {
      data: { seo: original.seo },
    });
  });

  test('an admin edits the panel, saves, and only the seo branch changes', async ({
    page,
    signIn,
    adminApi,
  }) => {
    await signIn('admin');
    await page.goto(`/admin/properties/edit/${PROPERTY_ID}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Edit:');

    await page.getByRole('tab', { name: 'SEO' }).click();

    const focus = page.getByLabel('Focus keyword', { exact: false });
    await expect(focus).toBeVisible();
    await focus.fill(KEYWORD);
    await page.getByLabel('SEO title', { exact: false }).fill(SEO_TITLE);

    // The search preview is drawn from what is on screen, before any save.
    await expect(page.getByText(SEO_TITLE, { exact: false }).first()).toBeVisible();

    // The analysis is debounced; the rail says "N of M passed" once it has run,
    // and only then is there a score for the save to carry (§9.6).
    await expect(page.getByText(/\d+ of \d+ passed/).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect
      .poll(
        async () =>
          (await (await adminApi.get(`${API_URL}/admin/properties/${PROPERTY_ID}`)).json()).data.seo
            .focusKeyword,
        { timeout: 20_000 }
      )
      .toBe(KEYWORD);

    const after = (await (await adminApi.get(`${API_URL}/admin/properties/${PROPERTY_ID}`)).json())
      .data;

    expect(after.seo.title).toBe(SEO_TITLE);
    // §9.6: the score and its band are stored with the analysis, so the
    // dashboard lists them without re-analysing.
    expect(typeof after.seo.score).toBe('number');
    expect(['good', 'ok', 'poor']).toContain(after.seo.scoreBand);
    expect(after.seo.testsTotal).toBeGreaterThan(0);
    expect(after.seo.lastAnalyzedAt).toBeTruthy();

    // §5.8: everything the panel did not edit survived the save untouched.
    expect(after.title).toBe(original.title);
    expect(after.slug).toBe(original.slug);
    expect(after.pricing.price).toBe(original.pricing.price);
    expect(after.viewCount).toBe(original.viewCount);
    expect(after.enquiryCount).toBe(original.enquiryCount);
  });

  test('the saved title is what the public page puts in its head', async ({
    page,
    signIn,
    adminApi,
  }) => {
    await signIn('admin');
    await adminApi.patch(`${API_URL}/admin/properties/${PROPERTY_ID}`, {
      data: { seo: { ...original.seo, title: SEO_TITLE, focusKeyword: KEYWORD } },
    });

    await page.goto(`/properties/${original.slug}`);
    await expect(page).toHaveTitle(new RegExp(SEO_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  test('the dashboard lists the record with the band it was given', async ({
    page,
    signIn,
    adminApi,
  }) => {
    await signIn('admin');
    await adminApi.patch(`${API_URL}/admin/properties/${PROPERTY_ID}`, {
      data: {
        seo: { ...original.seo, focusKeyword: KEYWORD, score: 88, scoreBand: 'good' },
      },
    });

    await page.goto('/admin/seo');
    await expect(page.getByRole('heading', { name: 'SEO dashboard', level: 1 })).toBeVisible();
    await expect(page.getByText(original.title, { exact: false }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('a manager may use the panel; sales cannot open the dashboard', async ({ page, signIn }) => {
    await signIn('manager');
    await page.goto('/admin/seo');
    await expect(page.getByRole('heading', { name: 'SEO dashboard', level: 1 })).toBeVisible();

    await signIn('sales');
    await page.goto('/admin/seo');
    await expect(page.getByText("You don't have access to this page.")).toBeVisible();
  });
});
