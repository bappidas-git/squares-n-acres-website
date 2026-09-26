/**
 * Admin → Media, end to end (QA-63).
 *
 * The defects of the audit that only a browser shows whole:
 *
 * - **The Folder filter** listed the folders of the page on screen — two of the
 *   eleven — and once one was chosen, that one alone. It lists every folder
 *   (`meta.folders`) and moves straight from one to another — since prompt 51
 *   as the rail beside the grid.
 * - **Tags** could not be added at all: "Type a tag and press Enter" did
 *   nothing. A tag is added, saved, and found by the library's search.
 * - **A second record for an address already in the library** was created
 *   without a word; the dialog now says so under the address.
 * - **A request that failed** left the last answer on screen — photographs
 *   under "Type: Document". The grid now says it could not be loaded.
 * - **The picker of a document field** (the brochure) took a photograph by its
 *   address, and — once "Add by URL" was a form — submitted the listing's form
 *   around it, saving the listing. It now takes documents only, offers the file
 *   an address already belongs to, and saves nothing but the file.
 *
 * What it creates it removes again through the API; the tag it adds to a seed
 * file is taken off again.
 */

const { test, expect, API_URL } = require('../fixtures/auth');

const STAMP = String(Date.now()).slice(-6);

/** The grid's tiles, by the name each shows. */
const tile = (page, name) =>
  page
    .getByRole('list', { name: 'Media library' })
    .getByRole('button', { name: new RegExp(`^${name}`) });

/** The folder rail beside the grid (prompt 51), and one folder's entry in it. */
const rail = (page) => page.getByRole('region', { name: 'Folders' });
const folderEntry = (page, name) =>
  rail(page).getByRole('button', { name: new RegExp(`^${name}\\s*[\\d,]+$`) });

test.describe('the media library', () => {
  test('offers every folder, and moves straight from one to another', async ({ signIn, page }) => {
    await signIn('admin');
    await page.goto('/admin/media');
    await expect(tile(page, 'Whitefield, Bengaluru')).toBeVisible();

    // The first page holds localities and developers only; the rail offers them all.
    for (const name of ['articles', 'authors', 'banks']) {
      await expect(folderEntry(page, name)).toBeVisible();
    }
    const entries = rail(page).getByRole('list').getByRole('button');
    const count = await entries.count();
    expect(count).toBeGreaterThan(10);

    await folderEntry(page, 'localities').click();
    await expect(page).toHaveURL(/folder=localities/);
    await expect(entries).toHaveCount(count);

    await folderEntry(page, 'banks').click();
    await expect(page).toHaveURL(/folder=banks/);
    // A bank's logo is a use of the file, not "Not used yet".
    await expect(tile(page, 'Garden City Bank logo')).toContainText('Used in 1');
  });

  test('adds a tag, saves it, and finds the file by it', async ({ signIn, page, adminApi }) => {
    const tag = `e2e-${STAMP}`;
    const record = (await (await adminApi.get(`${API_URL}/admin/media/5`)).json()).data;

    try {
      await signIn('admin');
      await page.goto('/admin/media');
      await tile(page, record.alt).click();

      const drawer = page.getByRole('dialog', { name: 'File details' });
      const tags = drawer.getByLabel('Tags');
      await tags.fill(tag);
      await tags.press('Enter');
      await expect(drawer.getByRole('button', { name: `Remove ${tag}` })).toBeVisible();

      await drawer.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByText('File saved')).toBeVisible();
      await expect(drawer).toBeHidden();

      await page.getByRole('searchbox').fill(tag);
      await expect(page).toHaveURL(new RegExp(`q=${tag}`));
      await expect(tile(page, record.alt)).toBeVisible();
      await expect(
        page.getByRole('list', { name: 'Media library' }).getByRole('listitem')
      ).toHaveCount(1);
    } finally {
      await adminApi.patch(`${API_URL}/admin/media/5`, { data: { tags: record.tags } });
    }
  });

  test('refuses an address already in the library, under the address', async ({
    signIn,
    page,
    adminApi,
  }) => {
    const before = (await (await adminApi.get(`${API_URL}/admin/media?perPage=1`)).json()).meta
      .total;

    await signIn('admin');
    await page.goto('/admin/media');
    await page.getByRole('button', { name: 'Add by URL' }).click();

    const dialog = page.getByRole('dialog', { name: 'Add a file by address' });
    await dialog
      .getByLabel('File address')
      .fill('https://picsum.photos/seed/sna-locality-hebbal/1600/900');
    await dialog.getByLabel('Alt text').fill(`A second Hebbal ${STAMP}`);
    // Enter adds, as in every other dialog of the admin.
    await dialog.getByLabel('Alt text').press('Enter');

    await expect(dialog.getByText('This address is already in the library.')).toBeVisible();
    const after = (await (await adminApi.get(`${API_URL}/admin/media?perPage=1`)).json()).meta
      .total;
    expect(after).toBe(before);
  });

  test('the brochure picker takes documents only, offers the one already filed, and saves nothing else', async ({
    signIn,
    page,
    adminApi,
  }) => {
    const pdf = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    const listing = async () =>
      (await (await adminApi.get(`${API_URL}/admin/properties/1`)).json()).data;
    const before = await listing();

    await signIn('admin');
    await page.goto('/admin/properties/edit/1');
    await page.getByRole('tab', { name: 'Media' }).click();
    const brochure = page.getByLabel('Brochure (PDF)', { exact: true });
    await brochure.fill('');
    await brochure.locator('xpath=..').getByRole('button', { name: 'Media library' }).click();

    const picker = page.getByRole('dialog', { name: /Brochure \(PDF\)/ });
    // It opens in the field's own folder, which is empty — and says so.
    await expect(picker.getByText('No files match')).toBeVisible();
    await picker.getByRole('button', { name: 'Show every file' }).click();
    await expect(picker.getByRole('list', { name: 'Files you can choose' })).toContainText(
      'Placeholder floor plan document'
    );

    await picker.getByRole('tab', { name: 'By URL' }).click();
    await picker
      .getByLabel('File address')
      .fill('https://picsum.photos/seed/sna-e2e-photo/800/600');
    await expect(
      picker.getByText('That address is a picture, and this field takes a document.')
    ).toBeVisible();
    await expect(picker.getByLabel('Type')).toBeDisabled();

    await picker.getByLabel('File address').fill(pdf);
    await picker.getByLabel('Alt text').fill(`The floor plan ${STAMP}`);
    await picker.getByRole('button', { name: 'Use this file' }).click();
    await expect(picker.getByText('This address is already in the library.')).toBeVisible();
    await picker.getByRole('button', { name: 'Use that file' }).click();

    await expect(picker).toBeHidden();
    await expect(brochure).toHaveValue(pdf);
    // The picker's own form never submitted the listing's around it.
    await expect(page.getByText('Property saved.')).toHaveCount(0);
    expect((await listing()).updatedAt).toBe(before.updatedAt);
  });

  test('says a failed request failed, rather than showing the last answer', async ({
    signIn,
    page,
  }) => {
    await signIn('admin');
    await page.goto('/admin/media');
    await expect(tile(page, 'Whitefield, Bengaluru')).toBeVisible();

    await page.route('**/api/admin/media?**', (route) => route.abort('connectionrefused'));
    await page.getByLabel('Type', { exact: true }).selectOption('document');

    await expect(page.getByText('The library could not be loaded')).toBeVisible();
    await expect(tile(page, 'Whitefield, Bengaluru')).toHaveCount(0);

    await page.unroute('**/api/admin/media?**');
    await page.getByRole('button', { name: 'Try again' }).click();
    // A document's tile starts with its format badge ("PDF …").
    await expect(page.getByRole('list', { name: 'Media library' })).toContainText(
      'Placeholder floor plan document'
    );
  });
});
