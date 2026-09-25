/**
 * The words the SEO settings page's messages use for each key of the record.
 *
 * The form passed `useForm` no labels, so every message reached the screen as
 * the schema and the API write it — "The defaults.ogImageUrl must be a valid
 * URL.", "The knowledgeGraph.sameAs.0 may not be greater than 500 characters."
 */

import { displayedAt, fieldError, seoSettingsLabel } from '../seoSettingsFields';
import { relabel } from '../../../../hooks/useForm';
import { schemas } from '../../../../services/schemas';
import { validate } from '../../../../utils/validation';

const SCHEMA = schemas['seoSettings.update'];

/** A word written the way a key is: `siteUrl`, `ogImageUrl`, `sameAs`. */
const CAMEL_CASE = /\b[a-z]+[A-Z][A-Za-z]*\b/;
/** A dotted path — anything but the two file names the page is about. */
const DOTTED = /\b(?!(?:robots|llms)\.txt\b)[A-Za-z]+\.[A-Za-z0-9]+/;

/** Every key the schema or the API can name: nested, and a list's entries. */
function keysOf(shape, prefix = '') {
  return Object.entries(shape).flatMap(([name, descriptor]) => {
    const key = prefix ? `${prefix}.${name}` : name;
    if (descriptor.type === 'object') return [key, ...keysOf(descriptor.shape, key)];
    if (descriptor.type === 'array') return [key, `${key}.0`, `${key}.11`];
    return [key];
  });
}

describe('seoSettingsLabel', () => {
  it.each([
    ['siteUrl', 'site URL'],
    ['titleTemplates.default', '“Everything else” title template'],
    ['titleTemplates.articleCategory', '“Article category” title template'],
    ['defaults.ogImageUrl', 'default share image address'],
    ['defaults.twitterCard', 'default Twitter card'],
    ['noindex.paginatedListings', 'noindex switch for paginated listings (page 2 and beyond)'],
    ['knowledgeGraph.address.postalCode', 'PIN code'],
    ['knowledgeGraph.sameAs.0', 'profile 1'],
    ['knowledgeGraph.openingHours.2', 'opening-hours entry 3'],
    ['knowledgeGraph.areaServed.9', 'area served 10'],
    ['verification.google', 'Google Search Console token'],
    ['sitemap.includePages', 'CMS pages sitemap switch'],
    ['sitemap.priority.developer', 'priority of the builders sitemap'],
    ['sitemap.excludeUrls.4', 'excluded URL 5'],
    ['robotsTxt', 'robots.txt document'],
    ['customBodyEndHtml', 'custom body HTML'],
  ])('calls %s "%s"', (key, label) => {
    expect(seoSettingsLabel(key)).toBe(label);
  });

  it('knows nothing of a key the record does not have', () => {
    expect(seoSettingsLabel('knowledgeGraph.nothing')).toBeUndefined();
    expect(seoSettingsLabel('knowledgeGraph.sameAs.first')).toBeUndefined();
  });

  it('names every key of the schema, and no two alike', () => {
    const keys = keysOf(SCHEMA);
    expect(keys.length).toBeGreaterThan(80);

    const labels = keys.map((key) => [key, seoSettingsLabel(key)]);
    expect(labels.filter(([, label]) => !label)).toEqual([]);

    const plain = labels.filter(([key]) => !/\.\d+$/.test(key)).map(([, label]) => label);
    expect(new Set(plain).size).toBe(plain.length);
  });

  it('leaves no dotted key and no camelCase word in any sentence about any key', () => {
    for (const key of keysOf(SCHEMA)) {
      for (const sentence of [
        `The ${key} may not be greater than 3 characters.`,
        `The selected ${key} is invalid.`,
        `The ${key} field must be true or false.`,
      ]) {
        const said = relabel({ [key]: sentence }, seoSettingsLabel)[key];
        expect(said).not.toMatch(CAMEL_CASE);
        expect(said).not.toMatch(DOTTED);
      }
    }
  });
});

describe('the messages of the schema, relabelled', () => {
  it.each([
    ['defaults.ogImageUrl', 'must be a valid URL.', 'The default share image address'],
    ['knowledgeGraph.email', 'must be a valid email address.', 'The e-mail'],
    ['knowledgeGraph.sameAs.0', 'may not be greater than 500 characters.', 'The profile 1'],
    ['siteUrl', 'may not be greater than 500 characters.', 'The site URL'],
  ])('"The %s %s" names the field', (key, rest, named) => {
    expect(relabel({ [key]: `The ${key} ${rest}` }, seoSettingsLabel)[key]).toBe(
      `${named} ${rest}`
    );
  });

  it('reads as the tabs label the fields, for values of every kind', () => {
    const errors = validate(
      {
        siteUrl: 'not a url',
        defaults: { ogImageUrl: 'nope', twitterCard: 'huge' },
        knowledgeGraph: {
          email: 'nobody',
          geo: { latitude: 120 },
          sameAs: ['https://profiles.test/a', `https://profiles.test/${'a'.repeat(490)}`],
        },
        sitemap: { priority: { property: 2 }, changefreq: { page: 'hourly-ish' } },
        breadcrumbs: { homeLabel: 'x'.repeat(41) },
      },
      SCHEMA,
      { partial: true }
    );

    expect(relabel(errors, seoSettingsLabel)).toEqual({
      siteUrl: 'The site URL must be a valid URL.',
      'defaults.ogImageUrl': 'The default share image address must be a valid URL.',
      'defaults.twitterCard': 'The selected default Twitter card is invalid.',
      'knowledgeGraph.email': 'The e-mail must be a valid email address.',
      'knowledgeGraph.geo.latitude': 'The latitude may not be greater than 90.',
      'knowledgeGraph.sameAs.1': 'The profile 2 may not be greater than 500 characters.',
      'sitemap.priority.property':
        'The priority of the properties sitemap may not be greater than 1.',
      'sitemap.changefreq.page':
        'The selected change frequency of the CMS pages sitemap is invalid.',
      'breadcrumbs.homeLabel': 'The label for the home step may not be greater than 40 characters.',
    });
  });
});

describe('the list fields', () => {
  it('shows a message about one entry on the list', () => {
    expect(displayedAt('knowledgeGraph.sameAs.2')).toBe('knowledgeGraph.sameAs');
    expect(displayedAt('sitemap.excludeUrls.0')).toBe('sitemap.excludeUrls');
    expect(displayedAt('knowledgeGraph.geo.latitude')).toBe('knowledgeGraph.geo.latitude');

    expect(fieldError({ 'knowledgeGraph.sameAs.1': 'Entry.' }, 'knowledgeGraph.sameAs')).toBe(
      'Entry.'
    );
    expect(
      fieldError(
        { 'knowledgeGraph.sameAs': 'Own.', 'knowledgeGraph.sameAs.1': 'Entry.' },
        'knowledgeGraph.sameAs'
      )
    ).toBe('Own.');
    expect(fieldError({ 'knowledgeGraph.sameAsX': 'No.' }, 'knowledgeGraph.sameAs')).toBe(
      undefined
    );
  });

  it('answers any other field with its own message only', () => {
    expect(fieldError({ siteUrl: 'Bad.' }, 'siteUrl')).toBe('Bad.');
    expect(fieldError({ 'knowledgeGraph.geo.latitude': 'Bad.' }, 'knowledgeGraph.geo')).toBe(
      undefined
    );
  });
});
