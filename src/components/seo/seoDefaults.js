/**
 * The page-type tables of `src/seo/pageTypes.js`, plus the one default that
 * needs the design system.
 *
 * The tables themselves live a folder up, in CommonJS, because
 * `scripts/validate-jsonld.js` has to read exactly what the browser reads and
 * cannot load a MUI theme to get there. This module is what React imports, so
 * a component never has to know which of the two files a constant came from.
 */

import theme from '../../theme';
import pageTypes from '../../seo/pageTypes';

export const {
  DEFAULT_ROBOTS,
  ENGINE_TYPE_FOR,
  HTML_LANG,
  INDEX_PAGES,
  NEVER_INDEXED,
  OG_LOCALE,
  OG_TYPE_FOR,
  PAGE_TYPES,
  RECORD_TYPES,
  RSS_TYPES,
  VERIFICATION_META,
} = pageTypes;

/**
 * The browser-chrome colour, read from the design system rather than written
 * down again: `theme.js` and `global.css` are the only two places a hex literal
 * is allowed to live (§2.4, D17).
 */
export const THEME_COLOR = theme.palette.primary.main;

const seoDefaults = { ...pageTypes, THEME_COLOR };

export default seoDefaults;
