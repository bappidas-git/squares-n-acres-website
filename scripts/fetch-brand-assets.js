#!/usr/bin/env node
/**
 * fetch-brand-assets.js — downloads the Squares N Acres brand assets from
 * Cloudinary into `public/brand/` so that `public/index.html` and
 * `public/manifest.json` can reference local files instead of a third-party
 * host. The downloaded PNGs are committed; the script only has to run again
 * when an asset changes.
 *
 * Sources and transformations follow 00_MASTER_CONTEXT.md §2.3.
 *
 * The build never depends on the network: a failed download prints `WARN`,
 * the remaining files are still fetched and the process exits 0. Whatever is
 * missing from `public/brand/` is referenced from its Cloudinary URL instead.
 *
 * Requires Node >= 18 for the global `fetch`. No dependencies.
 *
 * Usage:
 *   npm run generate:brand-assets
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'public', 'brand');

const UPLOAD = 'https://res.cloudinary.com/dn9gyaiik/image/upload';
const LOGO = 'v1789465788/sna-logo_o09ugt.png';
const ICON = 'v1789465791/sna-icon_efty7z.png';

/** Square monogram padded onto a white canvas at `size` × `size`. */
const monogram = (size) => `${UPLOAD}/w_${size},h_${size},c_pad,b_white,f_png/${ICON}`;

/** The ten files of §2.3, in the order the table lists them. */
const ASSETS = [
  { file: 'favicon-16.png', url: monogram(16) },
  { file: 'favicon-32.png', url: monogram(32) },
  { file: 'favicon-48.png', url: monogram(48) },
  { file: 'apple-touch-icon.png', url: monogram(180) },
  { file: 'icon-192.png', url: monogram(192) },
  { file: 'icon-512.png', url: monogram(512) },
  // Same padded render as icon-512: the monogram covers ~75 % of the canvas,
  // which satisfies the maskable safe zone.
  { file: 'icon-512-maskable.png', url: monogram(512) },
  { file: 'og-default.png', url: `${UPLOAD}/w_1200,h_630,c_pad,b_white/${LOGO}` },
  { file: 'logo.png', url: `${UPLOAD}/${LOGO}` },
  { file: 'icon.png', url: `${UPLOAD}/${ICON}` },
];

/** A PNG smaller than this is a placeholder or an error page, not an asset. */
const MIN_BYTES = 200;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Reads the pixel dimensions out of the PNG header: bytes 16–23 hold the IHDR
 * width and height as big-endian uint32s. Returns null for a non-PNG buffer.
 */
function readPngSize(buffer) {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function download(asset) {
  const response = await fetch(asset.url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim();
  if (contentType !== 'image/png') {
    throw new Error(`expected image/png, got ${contentType || 'no content-type'}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length <= MIN_BYTES) {
    throw new Error(`only ${buffer.length} bytes`);
  }

  const size = readPngSize(buffer);
  if (!size) {
    throw new Error('not a PNG (missing signature)');
  }

  fs.writeFileSync(path.join(OUT_DIR, asset.file), buffer);
  return { bytes: buffer.length, size };
}

/** Renders the result table with columns padded to their widest cell. */
function printTable(rows) {
  const headers = ['File', 'Bytes', 'Pixels', 'Status'];
  const widths = headers.map((header, i) =>
    Math.max(header.length, ...rows.map((row) => String(row[i]).length))
  );
  const line = (cells) => cells.map((cell, i) => String(cell).padEnd(widths[i])).join('  ');

  console.log(line(headers));
  console.log(line(widths.map((width) => '-'.repeat(width))));
  for (const row of rows) console.log(line(row));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const rows = [];
  let failed = 0;

  for (const asset of ASSETS) {
    try {
      const { bytes, size } = await download(asset);
      rows.push([asset.file, bytes, `${size.width}x${size.height}`, 'OK']);
    } catch (error) {
      failed += 1;
      rows.push([asset.file, 0, '-', `WARN ${error.message}`]);
    }
  }

  printTable(rows);
  console.log(`\n${ASSETS.length - failed}/${ASSETS.length} assets written to public/brand/`);

  if (failed > 0) {
    console.warn(
      `WARN: ${failed} asset(s) could not be downloaded. public/index.html and ` +
        'public/manifest.json must reference the Cloudinary URLs for those files.'
    );
  }
}

main().catch((error) => {
  // An unexpected failure must not break a build either.
  console.warn(`WARN: brand assets were not refreshed — ${error.message}`);
});
