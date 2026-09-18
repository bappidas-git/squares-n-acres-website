/**
 * Writing an article in the editor and publishing it (prompt 45).
 *
 * The article module is one of the two the master context calls most important
 * (§1), and the path a spec can prove that a unit test cannot is the whole of
 * it: the form, the Tiptap editor, the status panel, the slug the API derives,
 * and the public page that has to be live at that slug a moment later.
 *
 * Two more promises are checked on the way, because both are silent when they
 * break: a draft answers 404 on its public URL, and the preview link opens it
 * anyway (§5.10, D28).
 *
 * What it creates it deletes again, through the API, so the suite can run twice
 * in a row against the same mock database.
 */

const { test, expect, API_URL } = require('../fixtures/auth');

const STAMP = Date.now();
const TITLE = `E2E Playwright Guide ${STAMP} to Buying in Whitefield`;
const EXCERPT =
  'An end-to-end fixture article, written by the suite of prompt 45 so the editor, the status ' +
  'panel and the public page are exercised exactly as an editor exercises them.';
/**
 * An article needs three things before it may go live (§2 of prompt 33): an
 * excerpt, a featured image with alt text, and three hundred words of body.
 * The spec supplies all three, because publishing is what it is testing.
 */
const PARAGRAPH =
  'Buying in Whitefield starts with the approvals rather than with the brochure, and the order ' +
  'matters more than most buyers are told. Read the title chain first, then the encumbrance ' +
  'certificate, then the khata and the tax receipts, and only then the price. A project that ' +
  'cannot produce those four in an afternoon is telling you something about the next two years. ' +
  'The approved plan and the commencement certificate come next, and for a finished building the ' +
  'occupancy certificate is the document that says it may be lived in at all. ';
const BODY = PARAGRAPH.repeat(6);
const IMAGE = 'https://picsum.photos/seed/sna-e2e-article/1200/700';
const IMAGE_ALT = 'A gated development seen from the road on a clear morning';

test.describe('writing and publishing an article', () => {
  test.afterEach(async ({ adminApi }) => {
    const found = await adminApi.get(`${API_URL}/admin/articles`, {
      params: { q: `E2E Playwright Guide ${STAMP}`, perPage: 'all' },
    });
    if (!found.ok()) return;

    for (const article of (await found.json()).data) {
      await adminApi.delete(`${API_URL}/admin/articles/${article.id}`);
    }
  });

  test('an admin writes a draft, previews it, publishes it and the page is live', async ({
    page,
    signIn,
    adminApi,
  }) => {
    await signIn('admin');
    await page.goto('/admin/articles/add');
    await expect(page.getByRole('heading', { name: 'New article', level: 1 })).toBeVisible();

    await page.getByLabel('Headline', { exact: false }).fill(TITLE);
    await page.getByLabel('Excerpt', { exact: false }).fill(EXCERPT);

    // The body is a Tiptap editor rather than a textarea: `insertText` is the
    // paste ProseMirror understands, and three hundred words typed one key at
    // a time is slower than the action timeout allows.
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await page.keyboard.insertText(BODY);
    await expect(editor).toContainText(PARAGRAPH.slice(0, 40));

    await page.getByLabel('Category', { exact: false }).selectOption({ index: 1 });
    await page.getByLabel('Author', { exact: false }).selectOption({ index: 1 });

    // The editor toolbar has an "Image" button of its own, so the featured
    // image field is asked for by role rather than by label alone.
    await page.getByRole('textbox', { name: 'Image' }).fill(IMAGE);
    await page.getByLabel('Alt text', { exact: false }).fill(IMAGE_ALT);

    /* ---- Saved as a draft ---- */
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/articles\/edit\/\d+/, { timeout: 20_000 });

    const id = Number(page.url().match(/\/edit\/(\d+)/)[1]);
    expect(id).toBeGreaterThan(0);

    // The slug is the API's to derive (§5.9): it lowercases, replaces and caps
    // at 75 characters, so the spec reads it back rather than guessing it.
    const saved = await (await adminApi.get(`${API_URL}/admin/articles/${id}`)).json();
    const slug = saved.data.slug;
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(saved.data.status).toBe('draft');

    /* ---- The draft is not public, and the preview link opens it ---- */
    expect((await page.request.get(`${API_URL}/articles/slug/${slug}`)).status()).toBe(404);

    const issued = await (
      await adminApi.get(`${API_URL}/admin/articles/${id}/preview-token`)
    ).json();
    await page.goto(`/insights/articles/${slug}?preview=${issued.data.token}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(TITLE);

    await page.goto(`/admin/articles/edit/${id}`);

    /* ---- Published ---- */
    await expect(page.getByRole('button', { name: 'Publish now' })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('button', { name: 'Publish now' }).click();

    // The button is the editor's promise; the record is the fact. Waiting on
    // the record rather than on a toast keeps the spec honest about what
    // "published" means (§5.10).
    await expect
      .poll(
        async () =>
          (await (await adminApi.get(`${API_URL}/admin/articles/${id}`)).json()).data.status,
        { timeout: 20_000 }
      )
      .toBe('published');

    /* ---- Live on the public blog ---- */
    await page.goto(`/insights/articles/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(TITLE);
    await expect(page.getByText(PARAGRAPH.slice(0, 40), { exact: false }).first()).toBeVisible();

    /* ---- And in the index ---- */
    await page.goto('/insights/articles');
    await expect(
      page.getByRole('link', { name: new RegExp(`Guide ${STAMP}`) }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test('a manager may write one; a sales user may not reach the screen', async ({
    page,
    signIn,
  }) => {
    await signIn('manager');
    await page.goto('/admin/articles/add');
    await expect(page.getByRole('heading', { name: 'New article', level: 1 })).toBeVisible();

    await signIn('sales');
    await page.goto('/admin/articles');
    await expect(page.getByText("You don't have access to this page.")).toBeVisible();
  });
});
