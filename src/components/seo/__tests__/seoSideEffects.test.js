import { validateSeoBranch } from '../seoSideEffects';

jest.mock('../../../services/redirectService', () => ({}));

/** An address of exactly `length` characters. */
const address = (length) => `https://cdn.example.com/${'a'.repeat(length - 28)}.jpg`;

describe('validateSeoBranch', () => {
  it('passes an empty branch, and one with nothing set', () => {
    expect(validateSeoBranch()).toEqual({});
    expect(validateSeoBranch({ canonicalUrl: null, og: null, twitter: {} })).toEqual({});
  });

  it('still stops a redirect with nowhere to go, and JSON-LD that does not parse', () => {
    expect(validateSeoBranch({ redirect: { enabled: true, toPath: ' ' } })).toEqual({
      'seo.redirect.toPath': 'A redirect needs somewhere to send visitors.',
    });
    expect(validateSeoBranch({ schema: { custom: '{ not json' } })['seo.schema.custom']).toMatch(
      /custom schema/
    );
  });

  describe('an address past 500 characters (QA-65)', () => {
    it('is refused in the panel’s words, not by its key', () => {
      expect(
        validateSeoBranch({
          canonicalUrl: address(501),
          og: { imageUrl: address(501) },
          twitter: { imageUrl: address(501) },
        })
      ).toEqual({
        'seo.canonicalUrl': 'The canonical URL can be at most 500 characters.',
        'seo.og.imageUrl': 'The share image address can be at most 500 characters.',
        'seo.twitter.imageUrl': 'The X image address can be at most 500 characters.',
      });
    });

    it('takes 500, measured as it is sent — without the spaces around it', () => {
      expect(
        validateSeoBranch({
          canonicalUrl: address(500),
          og: { imageUrl: ` ${address(500)} ` },
          twitter: { imageUrl: address(500) },
        })
      ).toEqual({});
    });
  });
});
