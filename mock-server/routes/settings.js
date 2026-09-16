/**
 * Site settings (00_MASTER_CONTEXT.md §5.14, §6.13).
 *
 *   GET /api/settings          the public subset — everything except `leads`
 *   GET /api/admin/settings    the whole singleton
 *   PUT /api/admin/settings    a deep merge of the keys the model knows
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
const { sanitize } = require('../middleware/timestamps');
const { validateBody } = require('../middleware/validate');

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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

  return router;
};

module.exports.deepMergeKnown = deepMergeKnown;
module.exports.applySettingsUpdate = applySettingsUpdate;
