/**
 * Signing in and out of the admin panel, for each of the three roles (§7).
 *
 * This is the one spec that drives the form itself; the rest use the fixture.
 */

const { test, expect, ACCOUNTS, STORAGE_KEYS } = require('../fixtures/auth');

const signInAs = async (page, role) => {
  const { email, password } = ACCOUNTS[role];
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
};

test.describe('admin login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible();
  });

  test('an admin signs in and lands on the dashboard', async ({ page }) => {
    await signInAs(page, 'admin');

    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const token = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      STORAGE_KEYS.token
    );
    expect(token).toBeTruthy();
  });

  test('a manager signs in and reaches the properties desk', async ({ page }) => {
    await signInAs(page, 'manager');

    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await page.getByRole('link', { name: 'All properties' }).click();
    await expect(page).toHaveURL(/\/admin\/properties/);
  });

  test('a sales user signs in and sees the properties list read-only', async ({ page }) => {
    await signInAs(page, 'sales');

    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await page.goto('/admin/properties');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Properties');
    // §7: sales may view properties and nothing else — no "Add property".
    await expect(page.getByRole('link', { name: 'Add property' })).toHaveCount(0);
  });

  test('a wrong password is refused and nothing is stored', async ({ page }) => {
    await page.getByLabel('Email address').fill(ACCOUNTS.admin.email);
    await page.getByLabel(/^Password/).fill('not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/admin\/login/);
    const token = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      STORAGE_KEYS.token
    );
    expect(token).toBeNull();
  });

  test('an admin route asked for while signed out sends the visitor to the login page', async ({
    page,
  }) => {
    await page.goto('/admin/properties');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('signing out clears the session', async ({ page }) => {
    await signInAs(page, 'admin');
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.getByRole('button', { name: /account menu/i }).click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();

    await expect(page).toHaveURL(/\/admin\/login/);
    const token = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      STORAGE_KEYS.token
    );
    expect(token).toBeNull();
  });
});
