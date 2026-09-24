/**
 * Adding a menu to the site's header, with a submenu and a page in it (QA-56).
 *
 * The header's menus used to be a list in the code that a page could join three
 * of. They are records now, edited at Admin → Pages → Header menu, and the
 * promise is the one the CMS spec makes about blocks: what an editor arranges
 * there is what a visitor meets. The spec adds the smallest menu that proves it
 * — one submenu, one page filed under it, one typed link — and opens the site.
 *
 * Two rules ride along because both are invisible until broken: the home page's
 * record lives at the site root, not at `/home`, and deleting a menu takes its
 * pages out of the header without taking them off the site.
 *
 * What it creates it deletes again, through the API.
 */

const { test, expect, API_URL } = require('../fixtures/auth');

const STAMP = Date.now();
const MENU = `Projects ${String(STAMP).slice(-3)}`;
const GROUP = 'Upcoming launches';
const LINK = 'Under 50 lakh';

/** The page the spec files under the new menu, and puts back afterwards. */
const PAGE_ID = 6; // Partner With Us, seeded under Company

test.describe('the header menus', () => {
  test.afterEach(async ({ adminApi }) => {
    const found = await adminApi.get(`${API_URL}/admin/header-menus`, {
      params: { q: MENU, perPage: 'all' },
    });
    if (found.ok()) {
      for (const menu of (await found.json()).data) {
        if (menu.name === MENU) await adminApi.delete(`${API_URL}/admin/header-menus/${menu.id}`);
      }
    }
    await adminApi.patch(`${API_URL}/admin/pages/${PAGE_ID}`, {
      data: { showInHeader: true, headerMenu: 'company', headerSubmenu: null },
    });
  });

  test('an admin adds a menu with a submenu, a page and a link, and the header draws it', async ({
    page,
    signIn,
    adminApi,
  }) => {
    await signIn('admin');
    await page.goto('/admin/pages/menus');
    await expect(page.getByRole('heading', { name: /Header menu/, level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Add menu' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add a menu' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('textbox', { name: /^Name/ }).fill(MENU);
    await dialog.getByRole('button', { name: 'Add submenu' }).click();
    await dialog.getByRole('textbox', { name: 'Submenu 1' }).fill(GROUP);

    await dialog
      .getByRole('combobox', { name: 'Add a page' })
      .selectOption({ label: 'Partner With Us — now in Company' });
    await dialog.getByRole('combobox', { name: 'To' }).selectOption({ label: GROUP });
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();

    await dialog.getByRole('button', { name: 'Add link' }).click();
    await dialog.getByRole('textbox', { name: 'Link 1 label' }).fill(LINK);
    await dialog.getByRole('textbox', { name: 'Link 1 address' }).fill('/buy?maxPrice=5000000');

    await dialog.getByRole('button', { name: 'Add menu' }).click();
    await expect(page.getByText(`“${MENU}” added to the header.`)).toBeVisible();

    // The page is filed under the new submenu.
    const placed = (await (await adminApi.get(`${API_URL}/admin/pages/${PAGE_ID}`)).json()).data;
    expect(placed.showInHeader).toBe(true);
    expect(placed.headerSubmenu).toBe('upcoming-launches');

    /* ---- The site ---- */
    // Menus that do not fit fold into "More" from the end of the bar, so the
    // new one is moved to the front — one `PATCH { order }`, as a drag sends.
    const menus = (
      await (
        await adminApi.get(`${API_URL}/admin/header-menus`, { params: { perPage: 'all' } })
      ).json()
    ).data;
    const created = menus.find((menu) => menu.name === MENU);
    await adminApi.patch(`${API_URL}/admin/header-menus/${created.id}`, { data: { order: 1 } });

    await page.setViewportSize({ width: 1920, height: 1000 });
    await page.goto('/contact');
    const nav = page.getByRole('navigation', { name: 'Main' });
    const trigger = nav.getByRole('link', { name: MENU, exact: true });
    await expect(trigger).toBeVisible();
    await trigger.hover();

    const panel = page.locator(`[id="${await trigger.getAttribute('aria-controls')}"]`);
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(new RegExp(GROUP, 'i'));
    await expect(panel.getByRole('link', { name: 'Partner With Us' })).toHaveAttribute(
      'href',
      '/partnership'
    );
    await expect(panel.getByRole('link', { name: LINK })).toHaveAttribute(
      'href',
      '/buy?maxPrice=5000000'
    );

    /* ---- Deleted: the page leaves the header, not the site ---- */
    await page.goto('/admin/pages/menus');
    await page.getByRole('button', { name: `Delete “${MENU}”` }).click();
    const confirm = page.getByRole('dialog', { name: `Delete “${MENU}”?` });
    await expect(confirm).toContainText('Partner With Us');
    await confirm.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(`“${MENU}” deleted.`)).toBeVisible();

    const after = (await (await adminApi.get(`${API_URL}/admin/pages/${PAGE_ID}`)).json()).data;
    expect(after.showInHeader).toBe(false);
    expect(after.status).toBe('published');
  });

  test('the home page’s record is listed, and opens, at the site root', async ({
    page,
    signIn,
  }) => {
    await signIn('admin');
    await page.goto('/admin/pages');
    const home = page.getByRole('row').filter({ has: page.getByText('Home', { exact: true }) });
    await expect(home.getByText('/', { exact: true })).toBeVisible();

    await page.goto('/home');
    await expect(page).toHaveURL(/\/$/);
  });
});
