/**
 * Limits the contract gives a type as a whole, rather than one descriptor at a
 * time.
 *
 * Every `url` is stored in a `VARCHAR(500)` column
 * (`scripts/lib/guidelines/sql.js`), and only three descriptors said so: a
 * 3 000-character `logoUrl` was taken by the mock with a 200, and the rule the
 * guidelines rendered for Laravel, `nullable|url`, would have let the database
 * fail the write or cut the address short (QA-65). So a `url` is at most 500
 * characters unless its descriptor names its own `maxLength` — and every reader
 * of the descriptors asks `maxLengthOf()` rather than `descriptor.maxLength`:
 * the mock's validator, the forms' `validate()`, the seed's validator and the
 * guidelines' Laravel rules, SQL columns and OpenAPI schemas.
 *
 * CommonJS, like the schemas beside it: the mock server and the scripts read it
 * as well as the web app.
 */

/** The width of a `url` column, and so the longest address the API takes. */
const URL_MAX_LENGTH = 500;

/** What each type is limited to when its descriptor names no `maxLength`. */
const TYPE_MAX_LENGTHS = { url: URL_MAX_LENGTH };

/**
 * The longest string a descriptor accepts: its own `maxLength`, else its
 * type's, else none.
 *
 * @param {object|null|undefined} descriptor a field descriptor
 * @returns {number|undefined}
 */
const maxLengthOf = (descriptor) =>
  typeof descriptor?.maxLength === 'number'
    ? descriptor.maxLength
    : TYPE_MAX_LENGTHS[descriptor?.type];

module.exports = { URL_MAX_LENGTH, maxLengthOf };
