/**
 * Playwright configuration for the property-path end-to-end suite (prompt 44).
 *
 * The suite drives the real application against the real mock API, so it starts
 * both: `npm run mock` on port 4000 and the CRA development server on port
 * 3000, the two halves `npm run dev` runs together. Either is reused when it is
 * already up, which is what makes `npm run e2e` usable beside a development
 * session rather than only in a clean shell.
 *
 * One browser (Chromium) and one worker: every spec writes to the same mock
 * database, and a second worker publishing a property while the first counts
 * the listing would make both flaky for reasons that have nothing to do with
 * the application. `npm run mock:reset` puts the seed back afterwards; each
 * spec also cleans up what it created.
 *
 * Node ≥ 20 is required (D6). `e2e/README.md` says what to run when it is not.
 */

const path = require('path');

const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000/api';

// Every path is absolute: the root `playwright.config.js` re-exports this file,
// and a relative path would then resolve against the repository root rather
// than against `e2e/`.
const REPO_ROOT = path.join(__dirname, '..');

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests'),
  outputDir: path.join(__dirname, 'test-results'),
  // A development build compiles a lazy chunk the first time a route asks for
  // it, so a first navigation is seconds rather than milliseconds.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'npm run mock',
      url: `${API_URL}/cities`,
      cwd: REPO_ROOT,
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm start',
      url: BASE_URL,
      cwd: REPO_ROOT,
      reuseExistingServer: true,
      // Create React App opens a browser on start unless it is told not to.
      env: { BROWSER: 'none' },
      timeout: 240_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
