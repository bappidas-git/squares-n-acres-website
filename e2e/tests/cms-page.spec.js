/**
 * Building a CMS page out of blocks and publishing it (prompt 45).
 *
 * §6.10 makes a page a list of blocks, and the promise the block editor makes
 * is that what an editor assembles is what a visitor reads. The spec assembles
 * the smallest page that proves it — a hero and a rich-text band — publishes it
 * and opens the public URL.
 *
 * Two rules are checked in the same pass because both are invisible until they
 * are broken: a draft page answers 404 on its own URL (§5.10), and a slug whose
 * first segment belongs to a static route is refused with the error on the
 * field rather than stored as a page nobody can reach (D11, MB-04).
 *
 * What it creates it deletes again, through the API.
 */

const { test, expect, API_URL } = require('../fixtures/auth');

const STAMP = Date.now();
const TITLE = `E2E Playwright Page ${STAMP}`;
const HEADING = `What the suite of prompt 45 built ${STAMP}`;
const PROSE = 'A paragraph an end-to-end spec typed into a rich-text block.';

test.describe('building and publishing a CMS page', () => {
  test.afterEach(async ({ adminApi }) => {
    const found = await adminApi.get(`${API_URL}/admin/pages`, {
      params: { q: `E2E Playwright Page ${STAMP}`, perPage: 'all' },
    });
    if (!found.ok()) return;

    for (const page of (await found.json()).data) {
      await adminApi.delete(`${API_URL}/admin/pages/${page.id}`);
    }
  });

  test('an admin adds two blocks, publishes and the page renders them', async ({
    page,
    signIn,
    adminApi,
  }) => {
    await signIn('admin');
    await page.goto('/admin/pages/add');
    await expect(page.getByRole('heading', { name: 'New page', level: 1 })).toBeVisible();

    await page.getByRole('group', { name: 'Basics' }).getByLabel('Title', { exact: false }).fill(TITLE);

    /* ---- A hero ---- */
    await page.getByRole('button', { name: 'Add block' }).click();
    const chooser = page.getByRole('dialog', { name: 'Add a block' });
    await expect(chooser).toBeVisible();
    await chooser.getByRole('button', { name: /^Hero/ }).click();
    await page.getByLabel('Heading', { exact: false }).first().fill(HEADING);

    /* ---- A rich-text band ---- */
    await page.getByRole('button', { name: 'Add block' }).click();
    await expect(chooser).toBeVisible();
    await chooser.getByRole('button', { name: /^Rich text/ }).click();

    const editor = page.locator('[contenteditable="true"]').last();
    await editor.click();
    await page.keyboard.insertText(PROSE);
    await expect(editor).toContainText(PROSE.slice(0, 30));

    /* ---- Saved as a draft ---- */
    // The screen carries its actions twice: in the header and in the bar that
    // follows the form down the page.
    await page.getByRole('button', { name: 'Save', exact: true }).first().click();
    await expect(page).toHaveURL(/\/admin\/pages\/edit\/\d+/, { timeout: 20_000 });

    const id = Number(page.url().match(/\/edit\/(\d+)/)[1]);
    const saved = await (await adminApi.get(`${API_URL}/admin/pages/${id}`)).json();
    const slug = saved.data.slug;

    // §5.9: the API derived the slug from the title, because the form sent none.
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(saved.data.blocks.map((block) => block.type)).toEqual(['hero', 'richText']);
    expect((await page.request.get(`${API_URL}/pages/slug/${slug}`)).status()).toBe(404);

    /* ---- Published ---- */
    await page.getByRole('button', { name: 'Publish', exact: true }).first().click();
    await expect
      .poll(async () => (await (await adminApi.get(`${API_URL}/admin/pages/${id}`)).json()).data.status, {
        timeout: 20_000,
      })
      .toBe('published');

    /* ---- Live, with both bands ---- */
    await page.goto(`/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(HEADING);
    await expect(page.getByText(PROSE, { exact: false }).first()).toBeVisible();
  });

  test('a slug under a reserved prefix is refused on the field', async ({ page, signIn }) => {
    await signIn('admin');
    await page.goto('/admin/pages/add');

    // The SEO panel carries a permalink field of its own, so the page's own
    // URL is asked for inside the Basics group that owns it.
    const basics = page.getByRole('group', { name: 'Basics' });
    await basics.getByLabel('Title', { exact: false }).fill(`${TITLE} reserved`);
    await basics.getByRole('button', { name: 'Edit the slug' }).click();
    await basics.getByLabel('URL', { exact: false }).fill('properties');

    await page.getByRole('button', { name: 'Save', exact: true }).first().click();

    await expect(page.getByText(/Reserved path/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/pages\/add/);
  });

  test('sales cannot reach the CMS at all', async ({ page, signIn }) => {
    await signIn('sales');
    await page.goto('/admin/pages');
    await expect(page.getByText("You don't have access to this page.")).toBeVisible();
  });
});
