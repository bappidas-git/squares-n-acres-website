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
    for (const branch of ['contact', 'hero', 'navigation', 'social', 'footer', 'integrations']) {
      if (original[branch] !== undefined) expect(after[branch]).toBeDefined();
    }
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

  test('only the administrator opens the users screen', async ({ page, signIn }) => {
    await signIn('manager');
    await page.goto('/admin/settings/users');
    await expect(page.getByText("You don't have access to this page.")).toBeVisible();

    await signIn('admin');
    await page.goto('/admin/settings/users');
    await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible();
  });
});
