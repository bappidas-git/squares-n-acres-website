/**
 * The web dev server's control routes (QA-66). Create React App loads this
 * file into `react-scripts start` only — the name is its convention — so no
 * build carries it, and it proxies nothing.
 *
 *   GET  /__web/identity   this project's dev server: its process and checkout
 *   POST /__web/shutdown   stop, so that a newer `npm run dev` can take the port
 *
 * `npm run dev` asks them before it starts a web dev server of its own
 * (`scripts/claim-web-port.js`): a server left running by an earlier session
 * gives port 3000 up, instead of the new one exiting on "Something is already
 * running on port 3000.". A shutdown is accepted from this machine and from a
 * program only, exactly as the mock's (`mock-server/lib/takeover.js`).
 */

const path = require('path');

module.exports = function setupProxy(app) {
  try {
    const { mountControlRoutes } = require('../scripts/lib/webTakeover');
    mountControlRoutes(app, { root: path.resolve(__dirname, '..') });
  } catch (error) {
    // The routes only make the next `npm run dev` smoother; the dev server starts without them.
    console.warn(`The web dev server's control routes are off: ${error.message}`);
  }
};
