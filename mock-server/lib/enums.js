/**
 * The canonical enums, re-exported for the mock server.
 *
 * `src/config/enums.js` is CommonJS (decision D36b) precisely so that Node can
 * load the same file the React app imports; this module only shortens the
 * relative path for everything under `mock-server/`.
 */

module.exports = require('../../src/config/enums');
