/**
 * Site settings (00_MASTER_CONTEXT.md §5.14, §6.13).
 *
 *   GET  /api/settings          the public subset — everything except `leads`
 *   GET  /api/admin/settings    the whole singleton
 *   PUT  /api/admin/settings    a deep merge of the keys the model knows
 *   POST /api/admin/settings/test-lead-alert
 *                               a test lead alert to the saved addresses
 *                               (prompt 51) — the mock writes it to its
 *                               console, its "outbox"; Laravel sends it
 *
 * `siteSettings` is one object, not a collection, and the admin form edits it
 * one panel at a time: General, Contact, Hero, Navigation, Footer, Newsletter,
 * Integrations, Lead notifications. So a `PUT` that carries only
 * `{ general: { siteName } }` has to keep the other twenty `general.*` keys and
 * all seven other panels — which is why this is the one `PUT` in the contract
 * that merges instead of replacing (§5.14).
 *
 * Two rules make that merge predictable:
 *   - **known keys only.** Anything the model does not declare is dropped, so
 *     a stale field from an old bundle cannot take up residence in the data.
 *   - **arrays replace.** `footer.columns` is a list the editor reordered;
 *     merging it entry by entry would resurrect a link they deleted.
 *
 * Who may write is not decided here: `PUT /admin/settings` resolves to
 * `settings.edit`, which the §7 matrix gives to admins only, and
 * `mock-server/middleware/role.js` has answered 403 to a manager long before
 * this router runs.
 */

const express = require('express');

const schemas = require('../../src/services/schemas');
const { publicSettings } = require('../lib/scope');
const { validation } = require('../middleware/errors');
const { sanitize } = require('../middleware/timestamps');
const { validateBody } = require('../middleware/validate');

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** An address a lead alert could be sent to. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Merges `patch` into `target`, descending into objects and replacing arrays.
 *
 * @param {object} target the stored settings
 * @param {object} patch the sanitised request body
 * @returns {object} a new object; neither argument is mutated
 */
function deepMergeKnown(target, patch) {
  const merged = { ...target };

  for (const [key, value] of Object.entries(patch)) {
    merged[key] =
      isPlainObject(value) && isPlainObject(target?.[key])
        ? deepMergeKnown(target[key], value)
        : value;
  }

  return merged;
}

/**
 * Applies a settings body to a singleton: validate, drop what the model does
 * not know, merge, stamp.
 *
 * @param {object} current the stored singleton
 * @param {object} body the request body
 * @param {{schema: string, fields: object}} options
 * @returns {object} the new singleton
 */
function applySettingsUpdate(current, body, { schema, fields }) {
  // A settings `PUT` states a panel, not the whole document, so every key is
  // optional — `partial` here means "do not demand the panels you did not
  // open", not "skip the checks".
  validateBody(schemas.getSchema(schema), body ?? {}, { partial: true });

  const clean = sanitize(body ?? {}, fields);
  return { ...deepMergeKnown(current ?? {}, clean), updatedAt: new Date().toISOString() };
}

/**
 * The settings router.
 *
 * @param {{db: object, getModel: Function}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db, getModel }) => {
  const router = express.Router();
  const model = getModel('siteSettings');

  const current = () => db.getSingleton('siteSettings') ?? {};

  router.get('/settings', (req, res) => {
    res.ok(publicSettings(current()));
  });

  router.get('/admin/settings', (req, res) => {
    res.ok({ ...current() });
  });

  router.put('/admin/settings', (req, res, next) => {
    try {
      const updated = applySettingsUpdate(current(), req.body, {
        schema: 'settings.update',
        fields: model.fields,
      });

      // The merge only ever adds or replaces keys, so writing it back over
      // the stored object is the whole update — and it works the same over
      // lowdb and over a test's own copy of the seed.
      Object.assign(current(), updated);
      db.write();

      res.ok({ ...current() });
    } catch (error) {
      next(error);
    }
  });

  /**
   * "Send a test alert" (prompt 51): the lead notification, addressed to the
   * **saved** list — the one a real lead would reach. Nothing leaves the mock:
   * the alert is written to its console, and the answer names every address
   * it went to. Laravel sends it for real and answers 502 with the mailer's
   * reason when the SMTP relay refuses it.
   */
  router.post('/admin/settings/test-lead-alert', (req, res, next) => {
    try {
      const emails = Array.isArray(current().leads?.notificationEmails)
        ? current().leads.notificationEmails
        : [];
      if (emails.length === 0) {
        throw validation({
          'leads.notificationEmails': [
            'Add at least one notification e-mail and save the settings first.',
          ],
        });
      }
      const invalid = emails.filter((email) => !EMAIL.test(String(email)));
      if (invalid.length > 0) {
        throw validation({
          'leads.notificationEmails': [`Not an e-mail address: ${invalid.join(', ')}.`],
        });
      }

      const sentAt = new Date().toISOString();
      console.info(`[outbox] Test lead alert to ${emails.join(', ')}`);
      res.message(
        `Test alert sent to ${emails.length} ${emails.length === 1 ? 'address' : 'addresses'}.`,
        { sentTo: [...emails], sentAt }
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
};

module.exports.deepMergeKnown = deepMergeKnown;
module.exports.applySettingsUpdate = applySettingsUpdate;
