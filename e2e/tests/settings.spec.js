/**
 * Site settings: saving them, seeing them, and who may do which (prompt 45).
 *
 * §7 gives the settings screen to the administrator and to the manager, and the
 * save to the administrator alone — the manager reads a disabled form. That is
 * the kind of rule a unit test can assert about a matrix and only a browser can
 * assert about a screen, so it is checked here on both sides: the manager sees
 * no Save, and the API refuses the manager's `PUT` even when it is sent by hand.
 *
 * The save itself is proved end to end: a tagline typed in the admin panel is
 * the tagline the public footer prints on the next load, because both read the
 * same `siteSettings` record (§6.13).
 *
 * The original settings are restored afterwards, through the API.
 */

const { test, expect, API_URL } = require('../fixtures/auth');

const TAGLINE = `Bengaluru property, end to end — ${Date.now()}`;

test.describe('site settings', () => {
  /** @type {object|null} */
  let original = null;

  test.beforeEach(async ({ adminApi }) => {
    original = (await (await adminApi.get(`${API_URL}/admin/settings`)).json()).data;
  });

  test.afterEach(async ({ adminApi }) => {
    if (!original) return;
    await adminApi.put(`${API_URL}/admin/settings`, { data: original });
  });

  test('an admin saves a tagline and the public footer prints it', async ({
    page,
    signIn,
    adminApi,
  }) => {
    await signIn('admin');
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'Site settings', level: 1 })).toBeVisible();

    await page.getByLabel('Tagline', { exact: false }).fill(TAGLINE);
    // The screen carries the same action in its header and in its footer bar.
    await page.getByRole('button', { name: 'Save settings' }).first().click();

    await expect
      .poll(
        async () =>
          (await (await adminApi.get(`${API_URL}/admin/settings`)).json()).data.general.tagline,
        { timeout: 20_000 }
      )
      .toBe(TAGLINE);

    // §5.8: a settings save deep-merges — the branches it did not mention are
    // still there afterwards.
    const after = (await (await adminApi.get(`${API_URL}/admin/settings`)).json()).data;
    const BRANCHES = ['contact', 'hero', 'navigation', 'social', 'footer', 'integrations'];
    const present = (settings) => BRANCHES.filter((branch) => settings[branch] !== undefined);
    // Comparing the two lists rather than asserting each branch under a guard:
    // a guarded assertion inside a loop can quietly assert nothing, and this
    // also catches a branch the save *invented*.
    expect(present(after)).toEqual(present(original));
    expect(after.general.siteName).toBe(original.general.siteName);

    // The public site reads the same record.
    await page.goto('/');
    await expect(page.getByText(TAGLINE, { exact: false }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('the tabs are the ones §7 names, and each one opens', async ({ page, signIn }) => {
    await signIn('admin');
    await page.goto('/admin/settings');

    for (const name of [
      'General',
      'Contact',
      'Hero',
      'Navigation & footer',
      'Integrations',
      'Lead notifications',
    ]) {
      const tab = page.getByRole('tab', { name });
      await expect(tab).toBeVisible();
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('a manager reads the settings and is given nothing to save with', async ({
    page,
    signIn,
    api,
  }) => {
    const session = await signIn('manager');

    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'Site settings', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save settings' })).toHaveCount(0);
    await expect(page.getByLabel('Tagline', { exact: false })).toBeDisabled();

    // …and the API refuses the write even when the form is bypassed (§7).
    const refused = await api.put(`${API_URL}/admin/settings`, {
      headers: { Authorization: `Bearer ${session.token}` },
      data: { general: { tagline: 'Sent past the disabled form' } },
    });
    expect(refused.status()).toBe(403);
  });

  test('sales reach neither the settings nor the users screen', async ({ page, signIn }) => {
    await signIn('sales');

    await page.goto('/admin/settings');
    await expect(page.getByText("You don't have access to this page.")).toBeVisible();

    await page.goto('/admin/settings/users');
    await expect(page.getByText("You don't have access to this page.")).toBeVisible();
  });

  test('two tabs saving different fields do not undo each other (QA-64)', async ({
    page,
    context,
    signIn,
    adminApi,
  }) => {
    await signIn('admin');
    const other = await context.newPage();
    for (const tab of [page, other]) {
      await tab.goto('/admin/settings');
      await expect(tab.getByLabel('Tagline', { exact: false })).toBeVisible();
    }

    // The second tab saves the hero title…
    await other.getByRole('tab', { name: 'Hero' }).click();
    await other.getByLabel('Title', { exact: true }).fill('A hero title saved elsewhere');
    await other.getByRole('button', { name: 'Save settings' }).first().click();
    await expect(other.getByText('Site settings saved')).toBeVisible();

    // …and the first, opened before that save, saves the tagline.
    await page.getByLabel('Tagline', { exact: false }).fill(TAGLINE);
    await page.getByRole('button', { name: 'Save settings' }).first().click();
    await expect(page.getByText('Site settings saved')).toBeVisible();

    const after = (await (await adminApi.get(`${API_URL}/admin/settings`)).json()).data;
    expect(after.general.tagline).toBe(TAGLINE);
    expect(after.hero.title).toBe('A hero title saved elsewhere');

    // The first tab now shows the other's title too.
    await page.getByRole('tab', { name: 'Hero' }).click();
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
      'A hero title saved elsewhere'
    );
  });

  test('the open panel is in the address and survives a reload (QA-64)', async ({
    page,
    signIn,
  }) => {
    await signIn('admin');
    await page.goto('/admin/settings');

    await page.getByRole('tab', { name: 'Lead notifications' }).click();
    await expect(page).toHaveURL(/\/admin\/settings\?tab=leads$/);

    await page.reload();
    await expect(page.getByRole('tab', { name: 'Lead notifications' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await page.goto('/admin/settings?tab=integrations');
    await expect(page.getByRole('tab', { name: 'Integrations' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  test('visiting a phone box leaves the form clean (QA-64)', async ({ page, signIn }) => {
    await signIn('admin');
    await page.goto('/admin/settings?tab=contact');

    await page.getByLabel('WhatsApp number').click();
    await page.getByLabel('Alternate phone').click();
    await page.getByLabel('Contact e-mail', { exact: false }).click();

    await expect(page.getByText('You have unsaved changes.')).toHaveCount(0);
  });

  test('only the administrator opens the users screen', async ({ page, signIn }) => {
    await signIn('manager');
    await page.goto('/admin/settings/users');
    await expect(page.getByText("You don't have access to this page.")).toBeVisible();

    await signIn('admin');
    await page.goto('/admin/settings/users');
    await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible();
  });
});

test.describe('users (QA-64)', () => {
  const EMAIL = `qa64-${Date.now()}@squaresnacres.com`;

  test.afterEach(async ({ adminApi }) => {
    const found = await (
      await adminApi.get(`${API_URL}/admin/users?q=${encodeURIComponent(EMAIL)}`)
    ).json();
    for (const user of found.data ?? []) {
      await adminApi.delete(`${API_URL}/admin/users/${user.id}`);
    }
  });

  test('a password of letters only is refused, and a reset signs the account out', async ({
    page,
    signIn,
    api,
  }) => {
    await signIn('admin');
    await page.goto('/admin/settings/users');
    await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible();

    // Your own row offers no Delete.
    await expect(page.getByRole('button', { name: 'Delete Admin User' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Add user' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Full name', { exact: false }).fill('QA Sixty Four');
    await dialog.getByLabel('Email address', { exact: false }).fill(EMAIL);
    await dialog.getByLabel('Password', { exact: false }).fill('aaaaaaaa');
    await dialog.getByRole('button', { name: 'Create user' }).click();
    await expect(
      dialog.getByText('Use at least 8 characters, with a letter and a digit.')
    ).toBeVisible();

    await dialog.getByLabel('Password', { exact: false }).fill('Sixty4four');
    await dialog.getByRole('button', { name: 'Create user' }).click();
    await expect(page.getByText('User created')).toBeVisible();

    const login = await api.post(`${API_URL}/auth/login`, {
      data: { email: EMAIL, password: 'Sixty4four' },
    });
    expect(login.status()).toBe(200);
    const token = (await login.json()).data.token;

    await page.getByRole('button', { name: 'Reset the password of QA Sixty Four' }).click();
    const reset = page.getByRole('dialog');
    await reset.getByLabel('New password', { exact: false }).fill('Fresh4password');
    await reset.getByLabel('New password', { exact: false }).press('Enter');
    await expect(page.getByText('The password of QA Sixty Four has been reset.')).toBeVisible();

    const old = await api.get(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(old.status()).toBe(401);
  });
});
