#!/usr/bin/env node
/**
 * contrast-check.js — WCAG 2.1 contrast gate for the design tokens.
 *
 * Parses the `:root` block of `src/assets/styles/global.css`, computes the
 * contrast ratio of every pair listed in `00_MASTER_CONTEXT.md` §2.4 and exits 1
 * when a pair that must reach AA (4.5:1 for body text, 3:1 for large text and
 * non-text) falls below its minimum.
 *
 * No dependencies — it runs anywhere `node` runs.
 *
 * Usage: node scripts/contrast-check.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CSS_FILE = path.join(ROOT, 'src/assets/styles/global.css');

/** Read the `--token: #hex;` declarations of the first `:root` block. */
function readTokens(file) {
  const css = fs.readFileSync(file, 'utf8');
  const start = css.indexOf(':root {');
  if (start === -1) throw new Error(`No :root block in ${file}`);
  const end = css.indexOf('\n}', start);
  const block = css.slice(start, end);

  const tokens = {};
  const re = /(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let match;
  while ((match = re.exec(block)) !== null) tokens[match[1]] = match[2];
  return tokens;
}

function toRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  if (h.length === 8) h = h.slice(0, 6);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Relative luminance, WCAG 2.1 §relative luminance. */
function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * `min` is the ratio the pair must reach:
 *   4.5  — body text (AA)
 *   3    — large text (>= 24px or >= 19px bold) and non-text contrast (icons,
 *          control boundaries)
 *   null — informational only: §2.4 documents the value as below the threshold
 *          and names the rule that keeps it out of text/control use.
 *
 * The focus ring is never measured against the control it surrounds: it is
 * drawn with `outline-offset: 2px`, so it always lands on the page background.
 */
const PAIRS = [
  // Primary controls
  ['--color-text-inverse', '--color-primary', 4.5, 'white text on primary (buttons)'],
  ['--color-text-inverse', '--color-primary-dark', 4.5, 'white text on primary-dark (hover)'],
  ['--color-text-inverse', '--color-charcoal', 4.5, 'white text on charcoal surfaces'],
  // Red text and links
  ['--color-primary-dark', '--color-bg', 4.5, 'red link text on white'],
  ['--color-primary-dark', '--color-surface', 4.5, 'red link text on surface'],
  ['--color-primary-dark', '--color-primary-light', 4.5, 'red text on its own tint'],
  ['--color-primary', '--color-bg', 3, 'primary as icon/border on white'],
  ['--color-primary', '--color-surface', 3, 'primary as icon/border on surface'],
  ['--color-brand-red', '--color-bg', 3, 'brand red as display text (>= 24px) on white'],
  // Body copy
  ['--color-text', '--color-bg', 4.5, 'body text on white'],
  ['--color-text', '--color-surface', 4.5, 'body text on surface'],
  ['--color-charcoal', '--color-bg', 4.5, 'headings on white'],
  ['--color-charcoal', '--color-surface', 4.5, 'headings on surface'],
  ['--color-text-muted', '--color-bg', 4.5, 'muted text on white'],
  ['--color-text-muted', '--color-surface', 4.5, 'muted text on surface'],
  ['--color-text-muted', '--color-surface-2', 4.5, 'muted text on surface-2'],
  // Status text on its own tint and on the page background
  ['--color-success-dark', '--color-success-bg', 4.5, 'success text on success tint'],
  ['--color-success-dark', '--color-bg', 4.5, 'success text on white'],
  ['--color-warning-dark', '--color-warning-bg', 4.5, 'warning text on warning tint'],
  ['--color-warning-dark', '--color-bg', 4.5, 'warning text on white'],
  ['--color-error-dark', '--color-error-bg', 4.5, 'error text on error tint'],
  ['--color-error-dark', '--color-bg', 4.5, 'error text on white'],
  ['--color-info-dark', '--color-info-bg', 4.5, 'info text on info tint'],
  ['--color-info-dark', '--color-bg', 4.5, 'info text on white'],
  // Status base colours are icons/borders only
  ['--color-success', '--color-bg', 3, 'success icon/border on white'],
  ['--color-error', '--color-bg', 3, 'error icon/border on white'],
  ['--color-info', '--color-bg', 3, 'info icon/border on white'],
  // Focus ring must be visible on every surface it can land on
  ['--color-focus', '--color-bg', 3, 'focus ring on white'],
  ['--color-focus', '--color-surface', 3, 'focus ring on surface'],
  // Informational — §2.4 keeps these out of text and control-boundary use
  ['--color-warning', '--color-bg', null, 'warning base on white (fills only)'],
  ['--color-border-strong', '--color-bg', null, 'strong border on white (decorative)'],
  ['--color-border', '--color-bg', null, 'border on white (decorative)'],
];

function main() {
  const tokens = readTokens(CSS_FILE);
  const rows = [];
  const failures = [];

  for (const [fgName, bgName, min, label] of PAIRS) {
    const fg = tokens[fgName];
    const bg = tokens[bgName];
    if (!fg || !bg) {
      failures.push(`missing token: ${!fg ? fgName : bgName}`);
      continue;
    }
    const ratio = contrast(fg, bg);
    const pass = min === null || ratio + 1e-9 >= min;
    rows.push({ label, fg: fgName, bg: bgName, ratio, min, pass });
    if (!pass) {
      failures.push(
        `${label}: ${fgName} (${fg}) on ${bgName} (${bg}) is ${ratio.toFixed(2)}:1, needs ${min}:1`
      );
    }
  }

  const w = (s, n) => String(s).padEnd(n);
  console.log(`${w('pair', 46)}${w('fg', 22)}${w('on', 22)}${w('ratio', 9)}min  result`);
  console.log('-'.repeat(112));
  for (const r of rows) {
    console.log(
      `${w(r.label, 46)}${w(r.fg, 22)}${w(r.bg, 22)}${w(`${r.ratio.toFixed(2)}:1`, 9)}` +
        `${w(r.min === null ? '-' : r.min, 5)}${r.min === null ? 'info' : r.pass ? 'pass' : 'FAIL'}`
    );
  }
  console.log('-'.repeat(112));

  if (failures.length) {
    console.error(`\n${failures.length} contrast failure(s):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  const gated = rows.filter((r) => r.min !== null).length;
  console.log(`${gated} gated pairs checked, all pass (${rows.length - gated} informational).`);
}

main();
