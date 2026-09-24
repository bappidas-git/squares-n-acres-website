/**
 * Request-body schema registry.
 *
 * Every entry of `src/services/endpoints.js` that accepts a body names a key
 * here (`'property.create'`, `'lead.patch'`, …). The descriptors are the
 * contract the mock validator enforces (422, §5.3), the seed validator checks
 * and `scripts/generate-backend-guidelines.js` renders as Laravel rules.
 *
 * Field descriptor mini-language — see `mock-server/schemas/README.md`:
 *   type      string | int | number | bool | enum | date | datetime | email |
 *             phone | url | html | slug | array | object
 *   required  the key must be present and non-empty on create/replace
 *   nullable  `null` is a valid value
 *   enum      allowed values (with `type: 'enum'`)
 *   accepts   extra values the API tolerates and normalises (legacy input)
 *   min/max   numeric bounds, string minimum length, array length bounds
 *   maxLength string maximum length
 *   pattern   regular expression source the value must match
 *   items     descriptor for each element of an `array`
 *   shape     `{ field: descriptor }` for an `object`
 *   default   the value the API stores when the key is absent
 */

const { BULK_ACTIONS } = require('../../config/enums');
const property = require('./property');
const lead = require('./lead');
const article = require('./article');
const page = require('./page');
const headerMenu = require('./headerMenu');
const masterData = require('./masterData');
const settings = require('./settings');
const auth = require('./auth');
const newsletter = require('./newsletter');
const jobApplication = require('./jobApplication');

/** Every key optional, one level deep — the `PATCH` variant of a write shape. */
const allOptional = (shape) =>
  Object.fromEntries(
    Object.entries(shape).map(([name, descriptor]) => {
      const { required: _required, ...rest } = descriptor;
      return [name, rest];
    })
  );

/** `POST /admin/<resource>/bulk` (§5.8) — shared by every bulk-capable list. */
const bulk = {
  ids: { type: 'array', required: true, items: { type: 'int' }, min: 1 },
  action: { type: 'enum', enum: BULK_ACTIONS.values, required: true },
  payload: { type: 'object', nullable: true, default: null },
};

const groups = {
  property,
  lead,
  article,
  // Only the write shapes: the two modules also export their constants.
  page: { create: page.create, update: page.update, patch: page.patch },
  headerMenu: { create: headerMenu.create, update: headerMenu.update, patch: headerMenu.patch },
  auth,
  newsletter,
  jobApplication,
  settings: settings.siteSettings,
  seoSettings: settings.seoSettings,
  ...Object.fromEntries(
    Object.entries(masterData).map(([name, entity]) => [
      name,
      { ...entity, patch: allOptional(entity.create) },
    ])
  ),
};

const schemas = { bulk };
for (const [group, actions] of Object.entries(groups)) {
  for (const [action, shape] of Object.entries(actions)) {
    schemas[`${group}.${action}`] = shape;
  }
}

/** A schema by registry key, or `null` when the key is unknown. */
const getSchema = (key) => schemas[key] ?? null;

/** Every registry key, sorted. */
const schemaKeys = () => Object.keys(schemas).sort();

module.exports = { schemas, getSchema, schemaKeys, bulk };
