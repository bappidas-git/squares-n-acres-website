/**
 * References by slug — a field that names another record by its slug rather
 * than by its id (`docs/DECISIONS.md`, QA-52).
 *
 * `exists` is Laravel's `exists:<table>,<column>`: `mock-server/middleware/
 * validate.js` enforces it against the collection it names, and the guidelines
 * generator renders it as that rule. It is a `string` with a pattern rather
 * than a `slug`, because a `slug` field is the record's **own** URL — unique in
 * its table and derived from the title when sent empty — and a reference is
 * neither.
 */

/**
 * A property's or a property type's segment: the slug of a `segments` record.
 * Its `kind` is what decides which fields a listing has (`src/config/segments.js`).
 */
const segmentRef = {
  type: 'string',
  required: true,
  maxLength: 75,
  pattern: '^[a-z0-9-]+$',
  exists: { collection: 'segments', field: 'slug' },
  default: 'residential',
};

module.exports = { segmentRef };
