/**
 * Admin → Content, end to end (QA-61).
 *
 * Three things the audit found broken only a browser shows:
 *
 * - **Jobs.** An opening was edited in place of the list, on the list's own
 *   address: Back left the Jobs screen, a reload dropped the form, and a
 *   changed URL broke every link to the old one in silence. It has a page of
 *   its own now — the spec adds an opening, reloads it, changes its URL, saves
 *   from the keyboard, and checks the redirect and the way Back goes.
 * - **Job applications.** Changing an application's status wrote the stored
 *   note over the one being typed, and closing the panel lost it without a
 *   word.
 * - **Testimonials.** The first press on a rating star after typing in the
 *   form did nothing: the icon under the pointer was re-drawn between
 *   `mousedown` and `mouseup`.
 *
 * What it creates it deletes again, through the API.
 */

const { test, expect, API_URL } = require('../fixtures/auth');

const STAMP = String(Date.now()).slice(-5);
const ROLE = `Site Engineer ${STAMP}`;
const SLUG = `site-engineer-${STAMP}`;
const MOVED = `site-engineer-bengaluru-${STAMP}`;
const APPLICANT = `Asha Menon ${STAMP}`;
const CLIENT = `Kavya Iyer ${STAMP}`;

/** Every record of an admin collection, as the API keeps them. */
const everything = async (adminApi, collection, params = {}) =>
  (
    await (
      await adminApi.get(`${API_URL}/admin/${collection}`, {
        params: { perPage: 'all', ...params },
      })
    ).json()
  ).data;

test.describe('the Content screens', () => {
  test.afterEach(async ({ adminApi }) => {
    // An opening that has applications refuses to go (409): its applications first.
    for (const application of await everything(adminApi, 'job-applications', { q: STAMP })) {
      await adminApi.delete(`${API_URL}/admin/job-applications/${application.id}`);
    }
    for (const job of await everything(adminApi, 'jobs', { q: STAMP })) {
      await adminApi.delete(`${API_URL}/admin/jobs/${job.id}`);
    }
    for (const rule of await everything(adminApi, 'redirects')) {
      if (rule.fromPath.includes(STAMP))
        await adminApi.delete(`${API_URL}/admin/redirects/${rule.id}`);
    }
    for (const testimonial of await everything(adminApi, 'testimonials', { q: STAMP })) {
      await adminApi.delete(`${API_URL}/admin/testimonials/${testimonial.id}`);
    }
  });

  test('an opening has a page of its own: added, reloaded, moved with a redirect, and Back returns to the list', async ({
    page,
    signIn,
    adminApi,
  }) => {
    await signIn('admin');
    await page.goto('/admin/jobs');
    await expect(page.getByRole('heading', { name: 'Jobs', level: 1 })).toBeVisible();

    /* ---- Add, at its own address ---- */
    await page.getByRole('button', { name: 'Add opening' }).click();
    await expect(page).toHaveURL(/\/admin\/jobs\/add$/);
    await expect(page.getByRole('heading', { name: 'New opening', level: 1 })).toBeVisible();

    await page.getByRole('textbox', { name: /^Role title/ }).fill(`  ${ROLE} `);
    await page.getByLabel(/^Department/).fill('Projects');
    await page.getByRole('textbox', { name: /^Location/ }).fill('Bengaluru, Karnataka');
    await page.getByRole('textbox', { name: 'About the role' }).click();
    await page.keyboard.type('Oversee handovers on our Whitefield projects.');
    await page.getByRole('button', { name: 'Add responsibility' }).click();
    await page
      .getByRole('textbox', { name: /^Responsibility 1/ })
      .fill('Walk every unit before handover');
    await page.getByRole('button', { name: 'Save', exact: true }).first().click();

    // The add route gives way to the edit route of what was created.
    await expect(page).toHaveURL(/\/admin\/jobs\/edit\/\d+$/);
    const [created] = await everything(adminApi, 'jobs', { q: STAMP });
    expect(created.title).toBe(ROLE);
    expect(created.slug).toBe(SLUG);
    expect(created.responsibilities).toEqual(['Walk every unit before handover']);

    /* ---- A reload keeps the form ---- */
    await page.reload();
    await expect(page.getByRole('textbox', { name: /^Role title/ })).toHaveValue(ROLE);

    /* ---- A new URL, saved from the keyboard, sends the old one on ---- */
    await page.getByRole('textbox', { name: /^URL/ }).fill(MOVED);
    await expect(
      page.getByRole('switch', {
        name: `Send visitors from /careers/${SLUG} to the new address (301)`,
      })
    ).toBeChecked();
    await page.keyboard.press('Control+s');
    await expect(page.getByText('Opening saved')).toBeVisible();

    await expect
      .poll(async () =>
        (await everything(adminApi, 'redirects'))
          .filter((rule) => rule.fromPath === `/careers/${SLUG}`)
          .map((rule) => `${rule.toPath} ${rule.statusCode}`)
      )
      .toEqual([`/careers/${MOVED} 301`]);

    /* ---- Back returns to the list, not out of the section ---- */
    await page.goBack();
    await expect(page).toHaveURL(/\/admin\/jobs$/);
    await expect(page.getByRole('heading', { name: 'Jobs', level: 1 })).toBeVisible();
  });

  test('a note being typed survives a status change, and closing the panel asks before losing it', async ({
    page,
    signIn,
    adminApi,
    api,
  }) => {
    const job = (
      await (
        await adminApi.post(`${API_URL}/admin/jobs`, {
          data: {
            title: ROLE,
            department: 'Projects',
            location: 'Bengaluru, Karnataka',
            employmentType: 'full-time',
            description: '<p>Oversee handovers.</p>',
          },
        })
      ).json()
    ).data;
    const applied = await api.post(`${API_URL}/jobs/${job.id}/apply`, {
      data: {
        name: APPLICANT,
        email: `asha.${STAMP}@example.com`,
        phone: '9876543210',
        resumeUrl: 'https://example.com/asha-menon.pdf',
      },
    });
    expect(applied.status()).toBe(201);
    const application = (await applied.json()).data;

    await signIn('admin');
    await page.goto(`/admin/jobs/applications?jobId=${job.id}`);
    await page.getByText(APPLICANT, { exact: true }).click();

    const panel = page.getByRole('dialog', { name: APPLICANT });
    const notes = panel.getByRole('textbox', { name: /^Notes/ });
    await notes.fill('Call on Monday about the site visit.');

    // The status is the commonest thing to change next; it wrote the note over.
    await panel.getByLabel('Status').selectOption('interview');
    await expect
      .poll(async () => (await everything(adminApi, 'job-applications', { q: STAMP }))[0].status)
      .toBe('interview');
    await expect(notes).toHaveValue('Call on Monday about the site visit.');

    // Closing asks first, and "Keep editing" keeps it.
    await panel.getByRole('button', { name: 'Close', exact: true }).click();
    const confirm = page.getByRole('dialog', { name: 'Discard your note?' });
    await confirm.getByRole('button', { name: 'Keep editing' }).click();
    await expect(notes).toHaveValue('Call on Monday about the site visit.');

    // Given up, it goes — and nothing was written.
    await panel.getByRole('button', { name: 'Close', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Discard your note?' })
      .getByRole('button', { name: 'Discard note' })
      .click();
    await expect(panel).toBeHidden();
    const stored = (await everything(adminApi, 'job-applications', { q: STAMP })).find(
      (row) => row.id === application.id
    );
    expect(stored.notes ?? '').toBe('');
  });

  test('the first press on a rating star after typing counts', async ({
    page,
    signIn,
    adminApi,
  }) => {
    await signIn('admin');
    await page.goto('/admin/testimonials');
    await page.getByRole('button', { name: 'Add testimonial' }).click();

    const dialog = page.getByRole('dialog', { name: 'New testimonial' });
    // A new testimonial goes first, and the box says so in the hint's own terms.
    await expect(dialog.getByRole('spinbutton', { name: /^Order/ })).toHaveValue('1');

    await dialog
      .getByRole('textbox', { name: /^Quote/ })
      .fill('They found us a flat near the metro in two weeks, and it was painless.');
    await dialog.getByRole('textbox', { name: /^Name/ }).fill(CLIENT);
    // Straight from the box to the star: the press that used to be lost.
    await dialog.locator('label', { hasText: '3 stars' }).click();
    await expect(dialog.getByRole('radio', { name: '3 stars' })).toBeChecked();

    await dialog.getByRole('button', { name: 'Create testimonial' }).click();
    await expect(page.getByText('Testimonial created')).toBeVisible();

    const [stored] = await everything(adminApi, 'testimonials', { q: STAMP });
    expect(stored.rating).toBe(3);
    expect(stored.order).toBe(1);

    // The stars are drawn from the Iconify API, and a run that cannot reach it
    // draws none — nothing under the pointer to be re-drawn, so the press above
    // lands either way. The rule that keeps an icon out of the way is checked
    // itself, so such a run still fails without it.
    const iconPointerEvents = await page.evaluate(() => {
      const probe = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      probe.setAttribute('class', 'iconify');
      document.body.append(probe);
      const value = getComputedStyle(probe).pointerEvents;
      probe.remove();
      return value;
    });
    expect(iconPointerEvents).toBe('none');
  });
});
