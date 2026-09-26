/**
 * Media folders, end to end (prompt 51).
 *
 * "I can't create a folder" was the complaint: a folder is a string on its
 * files, and the only place to type one was inside an upload that was not even
 * offered before Cloudinary was set up. Now a folder is made first — "New
 * folder", then the file — shows in the rail with its count, and a select
 * mode moves files out of it again. A folder with nothing left in it leaves
 * the rail; the one the file went to counts it.
 *
 * The file it adds is removed again through the API, which is also all it
 * takes to remove the folder: a folder is only ever the files filed in it.
 */

const { test, expect, API_URL } = require('../fixtures/auth');

const STAMP = String(Date.now()).slice(-6);
const FOLDER = 'campaigns/diwali';
const ADDRESS = `https://picsum.photos/seed/e2e-folders-${STAMP}/800/600`;
const ALT = `Diwali campaign banner ${STAMP}`;

/** The folder rail, and one folder's entry in it by its name and count. */
const rail = (page) => page.getByRole('region', { name: 'Folders' });
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const folderEntry = (page, name, count = '[\\d,]+') =>
  rail(page).getByRole('button', { name: new RegExp(`^${escape(name)}\\s*${count}$`) });

/** How many files the rail says a folder holds. */
async function countOf(page, name) {
  const label = await folderEntry(page, name).textContent();
  return Number(String(label).replace(name, '').replace(/\D/g, ''));
}

test.describe('media folders', () => {
  test.afterEach(async ({ adminApi }) => {
    const found = await (
      await adminApi.get(`${API_URL}/admin/media?perPage=all&q=${encodeURIComponent(ADDRESS)}`)
    ).json();
    for (const record of found.data ?? []) {
      if (record.url === ADDRESS) {
        await adminApi.delete(`${API_URL}/admin/media/${record.id}?force=true`);
      }
    }
  });

  test('a new folder, a file filed into it, and a move that empties it', async ({
    signIn,
    page,
  }) => {
    await signIn('admin');
    await page.goto('/admin/media');
    await expect(folderEntry(page, 'pages')).toBeVisible();
    const pagesBefore = await countOf(page, 'pages');

    // Two clicks to a folder, before any upload.
    await rail(page).getByRole('button', { name: 'New folder' }).click();
    const create = page.getByRole('dialog', { name: 'New folder' });
    await create.getByLabel('Folder name').fill(FOLDER);
    await create.getByRole('button', { name: /^Create and / }).click();

    // No Cloudinary in the seed: the address form opens with the folder chosen.
    const address = page.getByRole('dialog', { name: 'Add a file by address' });
    await expect(address.getByRole('combobox', { name: 'Folder' })).toHaveValue(FOLDER);
    await address.getByLabel('File address').fill(ADDRESS);
    await address.getByLabel('Alt text').fill(ALT);
    await address.getByRole('button', { name: 'Add to library' }).click();
    await expect(page.getByText(`“${ALT}” is in the library.`)).toBeVisible();

    // The folder is real now, and counts its file.
    await expect(folderEntry(page, FOLDER, '1')).toBeVisible();
    await expect(page).toHaveURL(/folder=campaigns%2Fdiwali/);

    // Select mode: the file, moved to `pages`.
    await page.getByRole('button', { name: 'Select' }).click();
    await page
      .getByRole('list', { name: 'Media library' })
      .getByRole('button', { name: new RegExp(`^${escape(ALT)}`) })
      .click();
    const bar = page.getByRole('region', { name: 'Bulk actions' });
    await expect(bar).toContainText('1 selected');
    await bar.getByRole('button', { name: 'Move to folder' }).click();

    const move = page.getByRole('dialog', { name: 'Move 1 file' });
    const field = move.getByRole('combobox', { name: 'Move to' });
    await field.fill('pages');
    await move.getByRole('option', { name: /^pages/ }).click();
    await move.getByRole('button', { name: 'Move' }).click();
    await expect(page.getByText('Moved 1 file to “pages”.')).toBeVisible();

    // The emptied folder leaves the rail; the view follows the file.
    await expect(folderEntry(page, FOLDER)).toHaveCount(0);
    await expect(folderEntry(page, 'pages', String(pagesBefore + 1))).toBeVisible();
    await expect(page).toHaveURL(/folder=pages/);
  });
});
