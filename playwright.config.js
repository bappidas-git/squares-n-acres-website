/**
 * Playwright resolves its configuration from the working directory, and
 * `npm run e2e` runs from the repository root. The configuration itself lives
 * beside the specs it configures, in `e2e/`; this file is only how the runner
 * finds it, so `npm run e2e` is `playwright test` with nothing to remember.
 */

module.exports = require('./e2e/playwright.config.js');
