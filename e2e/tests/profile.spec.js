/**
 * My profile (QA-65): what a person does to their own account — in two tabs,
 * on a slow connection, with a picture that does not load, on a small phone,
 * leaving while it saves — and the password form's guard against guessing.
 *
 * The admin's profile is put back through the API after each test; the
 * throttle is tried on an account of its own, deleted afterwards.
 */

const { test, expect, ACCOUNTS, API_URL, STORAGE_KEYS } = require('../fixtures/auth');

/** A 1×1 PNG, for the picture that loads. */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

const heading = (page) => page.getByRole('heading', { name: 'My profile', level: 1 });
const accountButton = (page) => page.getByRole('button', { name: /account menu/ });

test.describe('my profile (QA-65)', () => {
  /** @type {object|null} */
  let original = null;

  test.beforeEach(async ({ adminApi }) => {
    original = (await (await adminApi.get(`${API_URL}/auth/profile`)).json()).data;
  });

  test.afterEach(async ({ adminApi }) => {
    if (!original) return;
    await adminApi.put(`${API_URL}/auth/profile`, {
      data: { name: original.name, phone: original.phone, avatarUrl: original.avatarUrl },
    });
  });

  test('a save in one tab reaches the other, and saving the other keeps it', async ({
    page,
    context,
    signIn,
    adminApi,
  }) => {
    await signIn('admin');
    await page.goto('/admin/profile');
    await expect(heading(page)).toBeVisible();

    const other = await context.newPage();
    await other.goto('/admin/profile');
    await expect(heading(other)).toBeVisible();

    await other.getByLabel('Full name', { exact: false }).fill('QA Sixty Five');
    await other.getByRole('button', { name: 'Save profile' }).click();
    await expect(other.getByText('Profile saved')).toBeVisible();

    // The first tab follows: its header, and its untouched name box.
    await expect(accountButton(page)).toHaveAccessibleName('QA Sixty Five — account menu');
    await expect(page.getByLabel('Full name', { exact: false })).toHaveValue('QA Sixty Five');

    await page.getByLabel('Phone', { exact: false }).fill('98450 12345');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText('Profile saved')).toBeVisible();

    const saved = (await (await adminApi.get(`${API_URL}/auth/profile`)).json()).data;
    expect(saved.name).toBe('QA Sixty Five');
    expect(saved.phone).toBe('9845012345');
  });

  test('a slow session check does not put the old name back over a save', async ({
    page,
    signIn,
    adminApi,
  }) => {
    await signIn('admin');
    // Every read of the account answers five seconds late, with what it was
    // when it was asked.
    await page.route(/\/api\/auth\/profile$/, async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      return route.fulfill({ response });
    });

    await page.goto('/admin/profile');
    await expect(heading(page)).toBeVisible();
    await page.getByLabel('Full name', { exact: false }).fill('Saved Before The Check');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText('Profile saved')).toBeVisible();

    // Past the late answers: still the saved name, everywhere.
    await page.waitForTimeout(6_000);
    await expect(accountButton(page)).toHaveAccessibleName('Saved Before The Check — account menu');
    await expect(page.getByLabel('Full name', { exact: false })).toHaveValue(
      'Saved Before The Check'
    );
    const stored = await page.evaluate(
      (key) => JSON.parse(window.localStorage.getItem(key)).name,
      STORAGE_KEYS.user
    );
    expect(stored).toBe('Saved Before The Check');
    const saved = (await (await adminApi.get(`${API_URL}/auth/profile`)).json()).data;
    expect(saved.name).toBe('Saved Before The Check');
  });

  test('a picture that does not load is said so, and the corrected one reaches the header', async ({
    page,
    signIn,
  }) => {
    await signIn('admin');
    await page.route('https://broken.example.com/**', (route) =>
      route.fulfill({ status: 404, body: 'not found' })
    );
    await page.route('https://pictures.example.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL })
    );

    await page.goto('/admin/profile');
    await expect(heading(page)).toBeVisible();
    const avatar = page.getByLabel('Avatar URL', { exact: false });

    await avatar.fill('https://broken.example.com/me.png');
    await expect(
      page.getByText('This picture could not be loaded, so your initials show instead.', {
        exact: false,
      })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText('Profile saved')).toBeVisible();
    await expect(accountButton(page).locator('img')).toHaveCount(0);

    await avatar.fill('https://pictures.example.com/me.png');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText('Profile saved').last()).toBeVisible();
    await expect(accountButton(page).locator('img')).toHaveAttribute(
      'src',
      'https://pictures.example.com/me.png'
    );
  });

  test('leaving during a slow save says the save carries on, and it does', async ({
    page,
    signIn,
    adminApi,
  }) => {
    await signIn('admin');
    await page.route(/\/api\/auth\/profile$/, async (route) => {
      if (route.request().method() !== 'PUT') return route.continue();
      await new Promise((resolve) => setTimeout(resolve, 2_500));
      return route.continue();
    });

    await page.goto('/admin/profile');
    await expect(heading(page)).toBeVisible();
    await page.getByLabel('Full name', { exact: false }).fill('Left While Saving');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await page.getByRole('link', { name: 'Dashboard' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Leave while your profile is saving?')).toBeVisible();
    await dialog.getByRole('button', { name: 'Leave' }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.getByText('Profile saved')).toBeVisible();
    const saved = (await (await adminApi.get(`${API_URL}/auth/profile`)).json()).data;
    expect(saved.name).toBe('Left While Saving');
  });

  test('a save that answers after signing in as someone else stays with its account', async ({
    page,
    api,
  }) => {
    // A session of its own: signing out revokes it, and the run's shared admin
    // session must outlive this test.
    const signedIn = await api.post(`${API_URL}/auth/login`, { data: ACCOUNTS.admin });
    expect(signedIn.status()).toBe(200);
    const own = (await signedIn.json()).data;
    await page.addInitScript(
      ([keys, value]) => {
        window.localStorage.setItem(keys.token, JSON.stringify(value.token));
        window.localStorage.setItem(keys.user, JSON.stringify(value.user));
        window.localStorage.setItem(keys.expiresAt, JSON.stringify(value.expiresAt));
      },
      [STORAGE_KEYS, own]
    );
    await page.goto('/admin/profile');
    await expect(heading(page)).toBeVisible();
    // The server takes the save at once; its answer is slow on the way back.
    await page.route(/\/api\/auth\/profile$/, async (route) => {
      if (route.request().method() !== 'PUT') return route.continue();
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, 6_000));
      return route.fulfill({ response });
    });

    await page.getByLabel('Full name', { exact: false }).fill('Admin Late Save');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await accountButton(page).click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Leave' }).click();

    await expect(page).toHaveURL(/\/admin\/login/);
    await page.getByLabel('Email address').fill(ACCOUNTS.sales.email);
    await page.getByLabel(/^Password/).fill(ACCOUNTS.sales.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // Past the admin's answer: still the sales session, and its navigation.
    await expect(page.getByText('Profile saved')).toBeVisible({ timeout: 15_000 });
    await expect(accountButton(page)).toHaveAccessibleName('Sales User — account menu');
    await expect(page.getByRole('button', { name: 'Settings' })).toHaveCount(0);
    const stored = await page.evaluate(
      (key) => JSON.parse(window.localStorage.getItem(key)).role,
      STORAGE_KEYS.user
    );
    expect(stored).toBe('sales');
  });

  test('fits a 320px phone without a sideways scroll', async ({ page, signIn }) => {
    await signIn('admin');
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/admin/profile');
    await expect(heading(page)).toBeVisible();

    const overflow = await page.evaluate(() => {
      const main = document.querySelector('#admin-main');
      return main.scrollWidth - main.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('the keyboard ring on the dark sidebar is white', async ({ page, signIn }) => {
    await signIn('admin');
    await page.goto('/admin/profile');
    await expect(heading(page)).toBeVisible();

    const profileLink = page.getByRole('link', { name: 'Profile' });
    await profileLink.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(profileLink).toBeFocused();

    const ring = await profileLink.evaluate((link) => getComputedStyle(link).outlineColor);
    expect(ring).toBe('rgb(255, 255, 255)');
  });
});

test.describe('the password form (QA-65)', () => {
  const EMAIL = `qa65-${Date.now()}@squaresnacres.com`;
  const PASSWORD = 'Sixty5five';

  test.afterEach(async ({ adminApi }) => {
    const found = await (
      await adminApi.get(`${API_URL}/admin/users?q=${encodeURIComponent(EMAIL)}`)
    ).json();
    for (const user of found.data ?? []) {
      await adminApi.delete(`${API_URL}/admin/users/${user.id}`);
    }
  });

  test('stops guessing the current password after five tries', async ({ page, api, adminApi }) => {
    const created = await adminApi.post(`${API_URL}/admin/users`, {
      data: { name: 'QA Sixty Five', email: EMAIL, password: PASSWORD, role: 'sales' },
    });
    expect(created.status()).toBe(201);
    const signedIn = await api.post(`${API_URL}/auth/login`, {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(signedIn.status()).toBe(200);
    const session = (await signedIn.json()).data;
    await page.addInitScript(
      ([keys, value]) => {
        window.localStorage.setItem(keys.token, JSON.stringify(value.token));
        window.localStorage.setItem(keys.user, JSON.stringify(value.user));
        window.localStorage.setItem(keys.expiresAt, JSON.stringify(value.expiresAt));
      },
      [STORAGE_KEYS, session]
    );

    await page.goto('/admin/profile');
    await expect(heading(page)).toBeVisible();

    const card = page.locator('section', {
      has: page.getByRole('heading', { name: 'Change password' }),
    });
    const guess = async (attempt) => {
      await card.getByLabel(/^Current password/).fill(`guess${attempt}x`);
      await card.getByLabel(/^New password/).fill('Another123');
      await card.getByLabel(/^Confirm new password/).fill('Another123');
      await card.getByRole('button', { name: 'Change password' }).click();
    };

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await guess(attempt);
      await expect(card.getByText('Current password is incorrect.')).toBeVisible();
    }
    await guess(6);
    await expect(card.getByText('Too many attempts. Try again in a minute.')).toBeVisible();
  });
});
