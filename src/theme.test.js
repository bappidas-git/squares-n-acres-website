import fs from 'fs';
import path from 'path';
import theme from './theme';

const CSS_PATH = path.join(__dirname, 'assets/styles/global.css');
const css = fs.readFileSync(CSS_PATH, 'utf8');

/** Every `--token: #hex;` declaration of the `:root` block. */
function readTokens(source) {
  const start = source.indexOf(':root {');
  const block = source.slice(start, source.indexOf('\n}', start));
  const tokens = {};
  const re = /(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let match;
  while ((match = re.exec(block)) !== null) tokens[match[1]] = match[2].toUpperCase();
  return tokens;
}

const tokens = readTokens(css);

/** Every `--color-*` token the design system defines (§2.4 + the derived set). */
const EXPECTED_COLOUR_TOKENS = [
  '--color-brand-red',
  '--color-primary',
  '--color-primary-dark',
  '--color-primary-light',
  '--color-charcoal',
  '--color-text',
  '--color-text-muted',
  '--color-text-inverse',
  '--color-bg',
  '--color-surface',
  '--color-surface-2',
  '--color-border',
  '--color-border-strong',
  '--color-success',
  '--color-success-dark',
  '--color-success-bg',
  '--color-warning',
  '--color-warning-dark',
  '--color-warning-bg',
  '--color-error',
  '--color-error-dark',
  '--color-error-bg',
  '--color-info',
  '--color-info-dark',
  '--color-info-bg',
  '--color-focus',
  '--color-serp-title',
  '--color-serp-url',
  '--color-serp-text',
  '--color-whatsapp',
  '--color-facebook',
  '--color-x',
  '--color-linkedin',
  '--color-instagram',
  '--color-youtube',
];

describe('theme.js mirrors the global.css design tokens', () => {
  const pairs = [
    ['--color-primary', () => theme.palette.primary.main],
    ['--color-primary-dark', () => theme.palette.primary.dark],
    ['--color-primary-light', () => theme.palette.primary.light],
    ['--color-charcoal', () => theme.palette.secondary.main],
    ['--color-error', () => theme.palette.error.main],
    ['--color-error-dark', () => theme.palette.error.dark],
    ['--color-warning', () => theme.palette.warning.main],
    ['--color-warning-dark', () => theme.palette.warning.dark],
    ['--color-info', () => theme.palette.info.main],
    ['--color-info-dark', () => theme.palette.info.dark],
    ['--color-success', () => theme.palette.success.main],
    ['--color-success-dark', () => theme.palette.success.dark],
    ['--color-text', () => theme.palette.text.primary],
    ['--color-text-muted', () => theme.palette.text.secondary],
    ['--color-text-inverse', () => theme.palette.primary.contrastText],
    ['--color-bg', () => theme.palette.background.default],
    ['--color-bg', () => theme.palette.background.paper],
    ['--color-border', () => theme.palette.divider],
    ['--color-surface', () => theme.palette.surface.main],
    ['--color-surface-2', () => theme.palette.surface.dark],
  ];

  it.each(pairs)('%s', (token, read) => {
    expect(tokens[token]).toBeDefined();
    expect(String(read()).toUpperCase()).toBe(tokens[token]);
  });

  it('uses the 900px md breakpoint on both sides', () => {
    expect(theme.breakpoints.values.md).toBe(900);
    expect(css).toContain('@media (min-width: 900px)');
  });

  it('declares the Manrope/Inter stacks', () => {
    expect(css).toContain("--font-heading: 'Manrope'");
    expect(css).toContain("--font-body: 'Inter'");
    expect(theme.typography.fontFamily).toContain('Inter');
    expect(theme.typography.h1.fontFamily).toContain('Manrope');
  });

  // The boilerplate palette is a string check and belongs to
  // `npm run check:traces`, which greps for those literals across the whole
  // repository. Here we assert the shape instead: the colour tokens are exactly
  // the ones the design system defines, and no hex escapes a token declaration.
  it('declares exactly the documented colour tokens', () => {
    const declared = Object.keys(tokens)
      .filter((name) => name.startsWith('--color-'))
      .sort();
    expect(declared).toEqual([...EXPECTED_COLOUR_TOKENS].sort());
  });

  it('keeps every hex inside a token declaration', () => {
    const stray = css
      .split('\n')
      .filter((line) => /#[0-9a-fA-F]{3,8}\b/.test(line))
      .filter((line) => !/^\s*--[\w-]+\s*:/.test(line));
    expect(stray).toEqual([]);
  });

  it('exposes the three soft shadows as shadows[1..3]', () => {
    expect(theme.shadows[1]).toContain('1px 2px');
    expect(theme.shadows[2]).toContain('4px 12px');
    expect(theme.shadows[3]).toContain('12px 32px');
  });
});
