import adminCopy from '../adminCopy';
import copy, { EMPTY, ERRORS, LEADS, LISTING, NAV, SEO, fill } from '../copy';
// The scan's own pattern lists, so this suite and `npm run check:traces` can
// never disagree about what a leftover looks like — and so the banned words
// are not spelled out in a file the scan itself reads (prompt 43 §6).
// eslint-disable-next-line import/no-relative-packages
import { COPY_PATTERNS, TRACE_PATTERNS } from '../../../scripts/check-traces';

/**
 * The copy files hold every word the product says on its own behalf, so the
 * rules they are written to (§8.5, §14) are worth asserting rather than
 * remembering: a string added in a hurry is exactly the one that would carry a
 * scaffolding marker, promise a callback time nobody agreed to, or spell the
 * company's name into a component (prompt 43).
 *
 * The walk is generic — it visits every leaf of both objects — so a new area
 * added tomorrow is covered the moment it exists.
 */

/** `[path, value]` for every string leaf, functions and templates included. */
function leaves(node, path = []) {
  if (typeof node === 'string') return [[path.join('.'), node]];
  if (typeof node === 'function' || node === null || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([key, value]) => leaves(value, [...path, key]));
}

/** A `/g` regex remembers where it stopped, so each test gets a fresh one. */
const matches = (pattern, value) => new RegExp(pattern.re.source, 'i').test(value);

const publicStrings = leaves(copy);
const adminStrings = leaves(adminCopy);
const allStrings = [...publicStrings, ...adminStrings];

describe('copy.js and adminCopy.js', () => {
  it('has strings to check at all', () => {
    // A refactor that empties an export would otherwise make every rule below
    // pass vacuously.
    expect(publicStrings.length).toBeGreaterThan(150);
    expect(adminStrings.length).toBeGreaterThan(40);
  });

  it('has no empty or whitespace-only string, except where one is deliberate', () => {
    // `HOME.testimonials.subtitle` is empty on purpose: the band has a heading
    // and no standfirst, and an invented sentence would be worse than none.
    const allowedEmpty = new Set(['HOME.testimonials.subtitle']);

    const empty = allStrings
      .filter(([path, value]) => value.trim() === '' && !allowedEmpty.has(path))
      .map(([path]) => path);

    expect(empty).toEqual([]);
  });

  it('has no placeholder copy and no scaffolding marker', () => {
    const found = allStrings
      .filter(([, value]) => COPY_PATTERNS.some((pattern) => matches(pattern, value)))
      .map(([path]) => path);

    expect(found).toEqual([]);
  });

  it('never spells the boilerplate brand out', () => {
    const found = allStrings
      .filter(([, value]) => TRACE_PATTERNS.some((pattern) => matches(pattern, value)))
      .map(([path]) => path);

    expect(found).toEqual([]);
  });

  it('promises no service level the client has not made (§14)', () => {
    // A response time is a fact about the company: it comes from settings, or
    // the site says "as soon as possible" and nothing more.
    const banned = /within \d+ (hours?|hrs?|minutes?|days?)|same day|guaranteed|24 hours/i;
    const found = allStrings.filter(([, value]) => banned.test(value)).map(([path]) => path);

    expect(found).toEqual([]);
    expect(LEADS.successMessage).toMatch(/as soon as possible/);
  });

  it('uses no exclamation mark', () => {
    const found = allStrings.filter(([, value]) => value.includes('!')).map(([path]) => path);

    expect(found).toEqual([]);
  });

  it('keeps the company name out of the strings that settings own', () => {
    // The consent line is the one that used to name the company in a
    // component; it takes `%siteName%` from `siteSettings` instead.
    expect(LEADS.consent).toContain('%siteName%');
    expect(fill(LEADS.consent, { siteName: 'Squares N Acres' })).toBe(
      'By submitting you agree to be contacted by Squares N Acres'
    );
  });

  it('writes buttons and menu labels in sentence case', () => {
    // Every word after the first is lower case unless it is a proper noun, an
    // acronym or a word that carries its own capital (§8.5).
    const properNouns =
      /^(BHK|RERA|EMI|FOIR|NRI|GST|CSV|SEO|URL|FAQs?|WhatsApp|Bengaluru|Whitefield|Cloudinary|India|Indian|Google|I)$/;

    const offenders = [
      ...Object.entries(NAV),
      ...Object.entries(LISTING).filter(([, value]) => typeof value === 'string'),
      ...Object.entries(adminCopy.TABLES),
      ...Object.entries(adminCopy.FORMS),
    ]
      .filter(([, value]) => typeof value === 'string')
      .filter(([, value]) =>
        value
          .split(/[\s—–]+/)
          .slice(1)
          .some((word) => /^[A-Z]/.test(word) && !properNouns.test(word.replace(/[^\w]/g, '')))
      )
      .map(([key]) => key);

    expect(offenders).toEqual([]);
  });

  it('keeps every toast short enough for a phone', () => {
    // §6: a toast is 60 characters or fewer. Only the toast vocabulary is
    // measured — an empty state's paragraph is a paragraph.
    const samples = [
      adminCopy.TOASTS.saved('Locality'),
      adminCopy.TOASTS.created('Locality'),
      adminCopy.TOASTS.published('Article'),
      adminCopy.TOASTS.unpublished('Article'),
      adminCopy.TOASTS.deleted('“Aurelia Court Duplex”'),
      adminCopy.TOASTS.duplicated('“Aurelia Court”'),
      adminCopy.TOASTS.updatedCount(120, 'lead'),
      adminCopy.TOASTS.copied(),
      copy.PROPERTY.shortlistAdded,
      copy.PROPERTY.shortlistRemoved,
      copy.PROPERTY.linkCopied,
      copy.PROPERTY.shortlist.cleared,
    ];

    samples.forEach((message) => expect(message.length).toBeLessThanOrEqual(60));
  });

  it('builds the admin vocabulary the way every screen expects', () => {
    expect(adminCopy.TOASTS.saved('Locality')).toBe('Locality saved');
    expect(adminCopy.TOASTS.published('Article')).toBe('Article published');
    expect(adminCopy.TOASTS.copied('Link')).toBe('Link copied');
    expect(adminCopy.TOASTS.updatedCount(1, 'lead')).toBe('1 lead updated');
    expect(adminCopy.TOASTS.updatedCount(12, 'lead')).toBe('12 leads updated');
    expect(adminCopy.TOASTS.updatedCount(3, 'property', 'properties')).toBe('3 properties updated');
  });

  it('names the record in every confirmation', () => {
    expect(adminCopy.DIALOGS.deleteTitle('locality')).toBe('Delete locality?');
    expect(adminCopy.DIALOGS.deleteMessage('Whitefield')).toContain('“Whitefield”');
    expect(adminCopy.DIALOGS.deleteMessage('Whitefield')).toContain('cannot be undone');
  });

  it('fills a template and leaves an unknown placeholder alone', () => {
    expect(fill(LISTING.searchFor, { term: 'Koramangala' })).toBe('Search for “Koramangala”');
    expect(fill(EMPTY.listing.viewAllIn, { locality: 'Whitefield' })).toBe(
      'View all in Whitefield'
    );
    // A missing key prints its placeholder rather than "undefined".
    expect(fill('%a% and %b%', { a: 'one' })).toBe('one and %b%');
    expect(fill(undefined)).toBe('');
  });

  it('gives every state of §8.2 something to say', () => {
    expect(ERRORS.title).toBeTruthy();
    expect(ERRORS.retry).toBeTruthy();
    expect(ERRORS.boundary.reload).toBeTruthy();
    expect(ERRORS.boundary.goHome).toBeTruthy();
    expect(ERRORS.notFound.title).toBeTruthy();
    expect(EMPTY.shortlist.action).toBeTruthy();
    expect(EMPTY.listing.viewAllIn).toContain('%locality%');
  });

  it('is what the SEO engine reads its index pages from', () => {
    // `src/seo/pageTypes.js` exports this table as `INDEX_PAGES`; asserting the
    // join here is what stops the two drifting into two sets of titles.
    // eslint-disable-next-line global-require
    const { INDEX_PAGES } = require('../../seo/pageTypes');

    expect(INDEX_PAGES).toBe(SEO.indexPages);
    Object.entries(INDEX_PAGES).forEach(([key, page]) => {
      expect(typeof page.title).toBe('string');
      expect(page.title.length).toBeGreaterThan(0);
      expect(page.description.length).toBeGreaterThan(0);
      expect(key).toMatch(/^[a-zA-Z]+$/);
    });
  });
});
