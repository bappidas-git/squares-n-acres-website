/**
 * `scripts/bundle-report.js` — does the gate actually close?
 *
 *   npm run test:scripts
 *
 * The report's own output is prose and changes whenever the build does; what
 * has to keep working is the reading of the manifest and the two rules. So the
 * tests build a miniature `build/` directory in a temporary folder — an entry
 * chunk, a lazy chunk, a stylesheet — and check that the entry is picked out
 * of it, that the sizes are measured, and that a chunk carrying `SeoPanel` is
 * reported as a leak.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, describe, it } = require('node:test');

const report = require('../bundle-report');

/** A throwaway `build/`-shaped directory, cleaned up when the file is done. */
const roots = [];

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sna-bundle-'));
  roots.push(root);

  for (const [relative, contents] of Object.entries(files)) {
    const file = path.join(root, ...relative.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  }

  return root;
}

after(() => roots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

describe('the budget and the markers', () => {
  it('budgets 300 000 bytes — the smaller reading of "300 KB"', () => {
    assert.equal(report.BUDGET_BYTES, 300_000);
  });

  it('watches the four admin-only modules of prompts 29, 32, 36 and 39', () => {
    assert.deepEqual(report.ADMIN_MARKERS, [
      'SeoPanel',
      'RichTextEditor',
      'recharts',
      'MediaLibrary',
    ]);
  });
});

describe('adminMarkersIn', () => {
  it('finds the markers a chunk carries and none it does not', () => {
    const root = fixture({
      'clean.js': 'var a=1;export default a;',
      'leaky.js': 'var x="SeoPanel";var y=require("recharts");',
    });

    assert.deepEqual(report.adminMarkersIn(path.join(root, 'clean.js')), []);
    assert.deepEqual(report.adminMarkersIn(path.join(root, 'leaky.js')), ['SeoPanel', 'recharts']);
  });
});

describe('mainChunk', () => {
  it('picks the hashed public entry chunk out of the entry assets', () => {
    const entries = [{ name: 'static/css/main.abc123.css' }, { name: 'static/js/main.def456.js' }];

    assert.equal(report.mainChunk(entries).name, 'static/js/main.def456.js');
  });

  it('answers null when the build names no entry chunk', () => {
    assert.equal(report.mainChunk([{ name: 'static/js/9216.abc.chunk.js' }]), null);
    assert.equal(report.mainChunk([]), null);
  });
});

describe('readAssets and entryAssets', () => {
  it('measures every js and css file the manifest names, once', () => {
    const root = fixture({
      'static/js/main.aaa.js': 'x'.repeat(4096),
      'static/js/9216.bbb.chunk.js': 'y'.repeat(1024),
      'static/css/main.ccc.css': 'body{color:red}',
      'static/media/logo.svg': '<svg/>',
    });

    const manifest = {
      files: {
        'main.js': '/static/js/main.aaa.js',
        'main.css': '/static/css/main.ccc.css',
        'static/js/9216.bbb.chunk.js': '/static/js/9216.bbb.chunk.js',
        // The same chunk named twice, as CRA's manifest does for a chunk that
        // is both a file and an entry of the map.
        duplicate: '/static/js/9216.bbb.chunk.js',
        'logo.svg': '/static/media/logo.svg',
        'missing.js': '/static/js/never-built.js',
      },
      entrypoints: ['static/css/main.ccc.css', 'static/js/main.aaa.js'],
    };

    const assets = report.readAssets(manifest, root);

    assert.deepEqual(
      assets.map((asset) => asset.name).sort(),
      ['static/css/main.ccc.css', 'static/js/9216.bbb.chunk.js', 'static/js/main.aaa.js'],
      'images are skipped, duplicates counted once, missing files ignored'
    );

    const main = assets.find((asset) => asset.name === 'static/js/main.aaa.js');
    assert.equal(main.raw, 4096);
    assert.ok(main.gzip > 0 && main.gzip < main.raw, 'gzip is measured and compresses');

    const entries = report.entryAssets(manifest, assets);
    assert.deepEqual(
      entries.map((asset) => asset.name),
      ['static/css/main.ccc.css', 'static/js/main.aaa.js']
    );
    assert.equal(report.mainChunk(entries).name, 'static/js/main.aaa.js');
  });
});
