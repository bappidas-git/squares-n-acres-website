/**
 * `scripts/lib/chrome.js` — does it find a browser, and does it say so?
 *
 *   npm run test:scripts
 *
 * Everything here is pure path resolution: `findChrome` takes the environment
 * and the platform as arguments precisely so that the Windows and macOS
 * answers can be asserted from Linux CI. The one test that needs a real
 * browser skips itself when there is none, because a machine with no Chrome is
 * a supported machine (D16) and a skipped test says that out loud where a
 * missing one would not.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const chrome = require('../lib/chrome');

describe('candidatePaths', () => {
  it('builds Windows paths from the environment, not from a hardcoded drive', () => {
    const paths = chrome.candidatePaths('win32', {
      PROGRAMFILES: 'C:\\Program Files',
      'PROGRAMFILES(X86)': 'C:\\Program Files (x86)',
      LOCALAPPDATA: 'C:\\Users\\dev\\AppData\\Local',
    });

    assert.ok(paths.length > 0, 'some candidate is offered');
    assert.ok(
      paths.some((candidate) => candidate.includes(path.join('Google', 'Chrome', 'Application'))),
      'Chrome’s own install directory is among them'
    );
    assert.ok(
      paths.some((candidate) => candidate.startsWith('C:\\Users\\dev\\AppData\\Local')),
      'a per-user install is looked for too'
    );
    assert.ok(
      paths.every((candidate) => candidate.endsWith('.exe')),
      'every Windows candidate is an executable'
    );
  });

  it('looks in /Applications and the user’s own on macOS', () => {
    const paths = chrome.candidatePaths('darwin', { HOME: '/Users/dev' });

    assert.ok(paths.includes('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'));
    assert.ok(
      paths.includes('/Users/dev/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    );
  });

  it('lists the usual Linux binaries', () => {
    const paths = chrome.candidatePaths('linux', {});

    assert.ok(paths.includes('/usr/bin/google-chrome'));
    assert.ok(paths.includes('/usr/bin/chromium'));
  });
});

describe('findChrome', () => {
  it('returns CHROME_PATH verbatim when it is set', () => {
    const found = chrome.findChrome({
      env: { CHROME_PATH: '/opt/my-own/chrome' },
      platform: 'linux',
    });

    assert.deepEqual(found, { executablePath: '/opt/my-own/chrome', source: 'CHROME_PATH' });
  });

  it('trims CHROME_PATH and ignores a blank one', () => {
    assert.equal(
      chrome.findChrome({ env: { CHROME_PATH: '  /opt/chrome  ' }, platform: 'linux' })
        .executablePath,
      '/opt/chrome'
    );

    // Blank means "not set": the discovery pass runs, and on a platform with
    // no candidate directories at all it finds nothing.
    assert.equal(chrome.findChrome({ env: { CHROME_PATH: '   ' }, platform: 'win32' }), null);
  });

  it('answers null when nothing is configured and nothing is installed', () => {
    assert.equal(chrome.findChrome({ env: {}, platform: 'win32' }), null);
    assert.equal(chrome.hasChrome({ env: {}, platform: 'win32' }), false);
  });

  it('discovers an installed browser when CHROME_PATH is absent', (t) => {
    const found = chrome.findChrome({ env: {}, platform: process.platform });

    if (!found) {
      t.skip('no Chrome installed in a standard location on this machine');
      return;
    }

    assert.equal(found.source, 'discovered');
    assert.ok(
      chrome.candidatePaths(process.platform, {}).includes(found.executablePath),
      'the path it found is one of the candidates it looked at'
    );
    assert.ok(fs.statSync(found.executablePath).isFile(), 'and it is a real file');
  });
});

describe('the one-line description and the hard requirement', () => {
  it('names the source in the one-line description', () => {
    assert.match(
      chrome.describe({ env: { CHROME_PATH: '/opt/chrome' }, platform: 'linux' }),
      /CHROME_PATH \(\/opt\/chrome\)/
    );
    assert.match(chrome.describe({ env: {}, platform: 'win32' }), /set CHROME_PATH/);
  });

  it('throws the message that says what to set', () => {
    assert.match(
      chrome.missingChromeMessage('the prerender'),
      /Set CHROME_PATH to run the prerender/
    );
    assert.throws(
      () => chrome.requireChrome('the prerender', { env: {}, platform: 'win32' }),
      /Set CHROME_PATH to run the prerender \(optional step\)\./
    );
  });

  it('returns the browser when there is one', () => {
    assert.equal(
      chrome.requireChrome('the prerender', {
        env: { CHROME_PATH: '/opt/chrome' },
        platform: 'linux',
      }).executablePath,
      '/opt/chrome'
    );
  });
});

describe('DEFAULT_ARGS', () => {
  it('carries the two flags a container needs', () => {
    assert.ok(chrome.DEFAULT_ARGS.includes('--no-sandbox'));
    assert.ok(chrome.DEFAULT_ARGS.includes('--disable-dev-shm-usage'));
  });
});
