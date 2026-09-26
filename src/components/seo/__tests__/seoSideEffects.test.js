import { applySeoSideEffects, redirectWarning, validateSeoBranch } from '../seoSideEffects';
import redirectService from '../../../services/redirectService';

jest.mock('../../../services/redirectService', () => ({
  __esModule: true,
  default: {
    findByFromPath: jest.fn(),
    upsertByFromPath: jest.fn(),
    deactivateByFromPath: jest.fn(),
  },
}));

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

describe('applySeoSideEffects — answers whether the redirect landed (prompt 51)', () => {
  const page = (redirect) => ({
    id: 3,
    slug: 'old-offer',
    title: 'Old offer',
    status: 'published',
    seo: { redirect },
  });

  beforeEach(() => jest.clearAllMocks());

  it('is ok when there is nothing to write', async () => {
    await expect(
      applySeoSideEffects('page', page({ enabled: false, toPath: '' }))
    ).resolves.toMatchObject({ ok: true, redirect: 'none', error: null });
    expect(redirectService.upsertByFromPath).not.toHaveBeenCalled();
  });

  it('is ok when the redirect is written', async () => {
    redirectService.findByFromPath.mockResolvedValue(null);
    redirectService.upsertByFromPath.mockResolvedValue({ id: 9 });

    await expect(
      applySeoSideEffects('page', page({ enabled: true, toPath: '/new-offer', statusCode: 301 }))
    ).resolves.toMatchObject({ ok: true, redirect: 'created' });
  });

  it('is not ok, with the reason, when the API refuses it — and never throws', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const refusal = Object.assign(new Error('The given data was invalid.'), {
      errors: { toPath: ['The destination cannot be the page itself.'] },
    });
    redirectService.findByFromPath.mockResolvedValue(null);
    redirectService.upsertByFromPath.mockRejectedValue(refusal);

    const result = await applySeoSideEffects(
      'page',
      page({ enabled: true, toPath: '/old-offer', statusCode: 301 })
    );

    expect(result).toMatchObject({ ok: false, error: refusal });
    expect(redirectWarning(result.error)).toBe(
      'Saved, but the redirect was not created: The destination cannot be the page itself.'
    );
    warn.mockRestore();
  });
});

describe('redirectWarning', () => {
  it('falls back to the message, then to a plain reason', () => {
    expect(redirectWarning(new Error('Network Error'))).toBe(
      'Saved, but the redirect was not created: Network Error.'
    );
    expect(redirectWarning(null)).toBe(
      'Saved, but the redirect was not created: the redirect was refused.'
    );
  });
});
