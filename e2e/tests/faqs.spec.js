/**
 * Admin → FAQs, end to end (QA-59).
 *
 * The screen opens on the drag list, and the audit found it broken in the
 * ways only a browser shows: a keyboard move sent the focus to the neighbour,
 * so the second Alt+↓ undid the first; a move snapped back until the API
 * answered; the list had no pager, no Edit and no Delete. The spec drives the
 * list the way an editor does — adds a FAQ, moves it twice from the keyboard,
 * edits it from the list, deletes it — and checks the API after each step.
 *
 * A FAQ tied to a property type is the second promise: the form says "it also
 * appears on those listings", and until QA-59 no page asked for it.
 *
 * What it creates it deletes again, through the API.
 */

const { test, expect, API_URL } = require('../fixtures/auth');

const STAMP = String(Date.now()).slice(-5);
const QUESTION = `Can I visit a site on a Sunday (${STAMP})?`;
const ANSWER = 'Yes — most sites are open on Sundays, and an advisor will come along.';

/** Every FAQ, in the order the API keeps them. */
const faqsInOrder = async (adminApi) =>
  (
    await (
      await adminApi.get(`${API_URL}/admin/faqs`, { params: { perPage: 'all', sort: 'order' } })
    ).json()
  ).data;

test.describe('the FAQ screen', () => {
  test.afterEach(async ({ adminApi }) => {
    for (const faq of await faqsInOrder(adminApi)) {
      if (faq.question.includes(STAMP)) await adminApi.delete(`${API_URL}/admin/faqs/${faq.id}`);
    }
  });

  test('an admin adds a FAQ, moves it from the keyboard, edits it from the list and deletes it', async ({
    page,
    signIn,
    adminApi,
  }) => {
    await signIn('admin');
    await page.goto('/admin/faqs');
    await expect(page.getByRole('heading', { name: /FAQs/, level: 1 })).toBeVisible();

    /* ---- Add ---- */
    await page.getByRole('button', { name: 'Add FAQ' }).click();
    const dialog = page.getByRole('dialog', { name: 'New FAQ' });
    await dialog.getByRole('textbox', { name: /^Question/ }).fill(`  ${QUESTION}  `);
    await dialog.getByRole('textbox', { name: 'Answer' }).click();
    await page.keyboard.type(ANSWER);
    await dialog.getByRole('button', { name: 'Create FAQ' }).click();
    await expect(page.getByText('FAQ created')).toBeVisible();

    // Created at 0, the form's default: first, trimmed, and nobody shares 1.
    let stored = await faqsInOrder(adminApi);
    expect(stored[0].question).toBe(QUESTION);
    expect(new Set(stored.map((faq) => faq.order)).size).toBe(stored.length);

    /* ---- Move twice from the keyboard ---- */
    const rows = page.locator('[data-sortable-row]');
    await expect(rows.first()).toHaveAttribute('aria-label', new RegExp(`^${escape(QUESTION)}`));
    await rows.first().focus();
    await page.keyboard.press('Alt+ArrowDown');
    // The row moves at once, and the focus goes with it.
    await expect(rows.nth(1)).toHaveAttribute('aria-label', new RegExp(`^${escape(QUESTION)}`));
    await expect(rows.nth(1)).toBeFocused();
    await page.keyboard.press('Alt+ArrowDown');
    await expect(rows.nth(2)).toHaveAttribute('aria-label', new RegExp(`^${escape(QUESTION)}`));

    await expect
      .poll(async () => (await faqsInOrder(adminApi)).findIndex((faq) => faq.question === QUESTION))
      .toBe(2);

    /* ---- Edit from the drag list ---- */
    await rows
      .nth(2)
      .getByRole('button', { name: `Edit ${QUESTION}` })
      .click();
    const edit = page.getByRole('dialog', { name: 'Edit FAQ' });
    await edit.getByRole('switch', { name: 'Show on the home page' }).click();
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('FAQ saved')).toBeVisible();
    stored = await faqsInOrder(adminApi);
    expect(stored.find((faq) => faq.question === QUESTION).showOnHome).toBe(true);

    /* ---- Delete from the drag list ---- */
    await rows
      .nth(2)
      .getByRole('button', { name: `Delete ${QUESTION}` })
      .click();
    await page
      .getByRole('dialog', { name: 'Delete FAQ?' })
      .getByRole('button', { name: 'Delete' })
      .click();
    await expect(page.getByText(`“${QUESTION}” deleted`)).toBeVisible();
    expect((await faqsInOrder(adminApi)).some((faq) => faq.question === QUESTION)).toBe(false);
  });

  test('a FAQ tied to a property type is asked on that type’s listings', async ({
    page,
    api,
    adminApi,
  }) => {
    const [listing] = (
      await (await api.get(`${API_URL}/properties`, { params: { perPage: 1 } })).json()
    ).data;

    const created = await adminApi.post(`${API_URL}/admin/faqs`, {
      data: {
        question: QUESTION,
        answer: `<p>${ANSWER}</p>`,
        category: 'buying',
        propertyTypeId: listing.propertyTypeId,
      },
    });
    expect(created.status()).toBe(201);

    await page.goto(`/properties/${listing.slug}`);
    await expect(page.getByRole('button', { name: QUESTION })).toBeVisible();
  });
});

/** A question as a regular expression that matches it literally. */
function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
