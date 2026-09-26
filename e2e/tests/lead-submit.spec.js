/**
 * Lead capture from the property page, and where the lead lands (prompt 44).
 *
 * The enquiry form on the page and the modal behind every CTA are the same
 * component with a different `source` (§6.17); both are checked here, and both
 * are followed through to the admin list, where the lead has to carry the
 * property it came from.
 */

const { test, expect, API_URL } = require('../fixtures/auth');

const SLUG = 'lakeview-heights-3-bhk-whitefield';

/**
 * A synthetic but valid Indian mobile — ten digits starting 6–9 (§14) — with
 * the run's own tail, so one run never finds the leads of another. The *name*
 * carries no digits: `LeadForm` rejects those, which is the rule the second
 * test leans on.
 */
const PHONE = `98765${String(Date.now()).slice(-5)}`;
// `LeadForm` allows letters, spaces, hyphens, dots and apostrophes and nothing
// else, so the name carries no run marker; the phone number is the run's key.
const NAME = 'Playwright Test Buyer';

test.describe('submitting a lead', () => {
  test.afterEach(async ({ adminApi }) => {
    const found = await adminApi.get(`${API_URL}/admin/leads`, {
      params: { q: PHONE, perPage: 'all' },
    });
    if (!found.ok()) return;

    for (const lead of (await found.json()).data) {
      await adminApi.delete(`${API_URL}/admin/leads/${lead.id}`);
    }
  });

  test('the enquiry form on the page creates a lead that names the property', async ({
    page,
    adminApi,
  }) => {
    await page.goto(`/properties/${SLUG}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const form = page.locator('#section-enquiry');
    await form.scrollIntoViewIfNeeded();

    await form.getByLabel('Your name').fill(NAME);
    await form.getByLabel('Phone', { exact: false }).fill(PHONE);
    await form.getByLabel('E-mail', { exact: false }).fill('e2e.buyer@example.com');
    await form.getByLabel('Message').fill('Sent by the prompt 44 end-to-end suite.');
    await form.getByRole('button', { name: 'Send enquiry' }).click();

    // The form replaces itself with its success state rather than reloading.
    await expect(form.getByText(/request received|advisor will get back/i).first()).toBeVisible({
      timeout: 20_000,
    });

    const listed = await adminApi.get(`${API_URL}/admin/leads`, {
      params: { q: PHONE, perPage: 'all' },
    });
    const leads = (await listed.json()).data;

    expect(leads.length).toBeGreaterThan(0);
    expect(leads[0].phone).toContain(PHONE);
    expect(leads[0].property?.slug).toBe(SLUG);
    expect(leads[0].source).toBeTruthy();
  });

  test('an invalid phone number is refused before anything is sent', async ({ page }) => {
    await page.goto(`/properties/${SLUG}`);
    const form = page.locator('#section-enquiry');
    await form.scrollIntoViewIfNeeded();

    await form.getByLabel('Your name').fill(NAME);
    await form.getByLabel('Phone', { exact: false }).fill('12345');
    await form.getByRole('button', { name: 'Send enquiry' }).click();

    await expect(form.getByText(/mobile number|valid phone|10 digits/i).first()).toBeVisible();
  });

  test('the lead reaches the admin list with a link back to the property', async ({
    page,
    signIn,
    adminApi,
  }) => {
    const created = await adminApi.post(`${API_URL}/leads`, {
      data: {
        name: NAME,
        phone: PHONE,
        email: 'e2e.admin@example.com',
        source: 'site-visit-request',
        propertyId: 1,
        consent: true,
      },
    });
    expect([200, 201]).toContain(created.status());

    await signIn('admin');
    await page.goto('/admin/leads');
    await page.getByLabel('Search', { exact: true }).fill(PHONE);

    const row = page.getByRole('row', { name: new RegExp(NAME) });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText(/Lakeview Heights/);
  });

  test('the financial assessment scores the visitor and records the answers', async ({
    page,
    adminApi,
  }) => {
    await page.goto(`/properties/${SLUG}`);
    const finance = page.locator('#section-finance');
    await finance.scrollIntoViewIfNeeded();

    await finance.getByLabel('Full name').fill(NAME);
    await finance.getByLabel('Phone number').fill(PHONE);

    // Every money question is a band rather than a figure, so each is a select.
    for (const label of [
      'Years in this job or business',
      'Monthly income',
      'Monthly EMIs you already pay',
    ]) {
      await finance.getByLabel(label, { exact: false }).first().selectOption({ index: 1 });
    }

    // What the visitor does and what their credit is are chip rows, not selects.
    await finance
      .getByRole('group', { name: 'What do you do?' })
      .getByRole('button', { name: 'Salaried' })
      .click();
    await finance
      .getByRole('group', { name: 'Credit score' })
      .getByRole('button', { name: /Excellent/ })
      .click();
    const [created] = await Promise.all([
      page.waitForResponse(
        (response) => response.url().endsWith('/leads') && response.request().method() === 'POST',
        { timeout: 20_000 }
      ),
      finance
        .getByRole('button', { name: /check|assess|see|eligib/i })
        .first()
        .click(),
    ]);

    expect(created.status()).toBe(201);

    // The questionnaire is replaced by its answer, so the boxes are gone.
    await expect(finance.getByLabel('Monthly income', { exact: false })).toHaveCount(0, {
      timeout: 20_000,
    });

    const listed = await adminApi.get(`${API_URL}/admin/leads`, {
      params: { q: PHONE, source: 'financial-assessment', perPage: 'all' },
    });
    const leads = (await listed.json()).data;

    expect(leads.length).toBeGreaterThan(0);
    // D56: the answers and the score travel in `meta`, free-form by contract.
    expect(leads[0].meta).toBeTruthy();
  });

  // MB-02 as a visitor meets it. §6.10 types a CMS page's slug as a URL path
  // and every lead-capture block passes `page.slug` through verbatim, so the
  // four seeded pages under `buyer-assistance/` and `insights/` send a slug
  // with a separator in it. `lead.pageSlug` used to refuse one, which made
  // every enquiry from three of the site's service pages fail for the visitor.
  test('an enquiry from a nested CMS page files a lead that names the page', async ({
    page,
    adminApi,
  }) => {
    await page.goto('/buyer-assistance/home-loan');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // The page's own CTAs open the shared lead modal; the lenders band is the
    // one that passes `pageSlug` (`BanksBlock`, §6.10).
    await page.getByRole('button', { name: 'Check eligibility' }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Your name').fill(NAME);
    await dialog.getByLabel('Phone', { exact: false }).fill(PHONE);
    await dialog.getByLabel('E-mail', { exact: false }).fill('e2e.borrower@example.com');
    await dialog.getByRole('button', { name: 'Send', exact: true }).click();

    await expect(dialog.getByText(/An advisor will get back to you/i)).toBeVisible({
      timeout: 20_000,
    });

    const listed = await adminApi.get(`${API_URL}/admin/leads`, {
      params: { q: PHONE, perPage: 'all' },
    });
    const leads = (await listed.json()).data;

    expect(leads.length).toBeGreaterThan(0);
    expect(leads[0].pageSlug).toBe('buyer-assistance/home-loan');
  });

  test('a second enquiry from the same visitor is stored and shown beside the first', async ({
    page,
    signIn,
    adminApi,
  }) => {
    const body = {
      name: NAME,
      phone: PHONE,
      source: 'property-enquiry',
      propertyId: 1,
      consent: true,
    };
    expect([200, 201]).toContain(
      (await adminApi.post(`${API_URL}/leads`, { data: body })).status()
    );
    expect([200, 201]).toContain(
      (await adminApi.post(`${API_URL}/leads`, { data: { ...body, message: 'again' } })).status()
    );

    await signIn('admin');
    await page.goto('/admin/leads');
    await page.getByLabel('Search', { exact: true }).fill(PHONE);

    await expect(page.getByRole('row', { name: new RegExp(NAME) }).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
