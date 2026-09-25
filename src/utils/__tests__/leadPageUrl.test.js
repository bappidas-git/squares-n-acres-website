/**
 * `leadPageUrl` (QA-65): the address a lead records fits the 500 characters
 * every `url` of the contract is held to, and stays an address — a visitor from
 * an advertisement must never have an enquiry refused over tracking tags.
 */

import leadPageUrl from '../leadPageUrl';

const PAGE = 'https://www.squaresnacres.com/properties/lakeview-heights-3-bhk-whitefield';

describe('leadPageUrl', () => {
  it('keeps an address that fits as it is', () => {
    const href = `${PAGE}?utm_source=google&utm_medium=cpc#gallery`;
    expect(leadPageUrl(href)).toBe(href);
  });

  it('drops the fragment first, then the query, of an address that does not fit', () => {
    const query = `?utm_source=google&gclid=${'C'.repeat(300)}`;
    const fragment = `#${'f'.repeat(200)}`;

    // Without its fragment it fits: the query stays.
    expect(leadPageUrl(`${PAGE}${query}${fragment}`)).toBe(`${PAGE}${query}`);
    // It does not fit even so: the page itself is what is kept.
    expect(leadPageUrl(`${PAGE}${query}&_gl=${'g'.repeat(300)}`)).toBe(PAGE);
  });

  it('never answers more than 500 characters', () => {
    const result = leadPageUrl(`${PAGE}?${'x'.repeat(2000)}`);
    expect(result.length).toBeLessThanOrEqual(500);
  });

  it('sends nothing for a path too long to keep, or for what is not an address', () => {
    expect(leadPageUrl(`https://www.squaresnacres.com/${'p'.repeat(600)}`)).toBeNull();
    expect(leadPageUrl(`not an address ${'x'.repeat(600)}`)).toBeNull();
    expect(leadPageUrl('')).toBeNull();
  });

  it('reads the page the visitor is on by default', () => {
    expect(leadPageUrl()).toBe(window.location.href);
  });
});
