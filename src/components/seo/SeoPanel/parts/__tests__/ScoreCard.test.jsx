/**
 * The score card's three buttons (prompt 51): each one answers — a toast, a
 * pulse, a confirmation — or says why it did nothing. The analysis already runs
 * on every keystroke, so a button that only ran it again looked dead.
 */

import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ScoreCard from '../ScoreCard';
import renderWith from '../../../../../test-utils';
import { SeoPanelProvider } from '../../SeoPanelContext';
import { withSeoDefaults } from '../../../seoValues';

const SETTINGS = {
  siteUrl: 'https://www.squaresnacres.com',
  separator: '|',
  titleTemplates: { default: '%title% %sep% %sitename%' },
  defaults: {},
  knowledgeGraph: { name: 'Squares N Acres' },
};

const ANALYSIS = { score: 51, band: 'ok', testsPassed: 12, testsTotal: 32, groups: {} };

const ARTICLE = {
  id: 9,
  title: 'Khata Transfer in Bengaluru: The Complete Checklist',
  slug: 'khata-transfer-checklist',
  excerpt: 'What the BBMP asks for, and in what order.',
  content: '<p>Every khata transfer starts at the ward office with the sale deed.</p>',
  featuredImage: { url: 'https://images.test/khata.jpg', alt: 'A khata extract' },
};

const FILLED = {
  title: 'Khata transfer checklist | Squares N Acres',
  description: 'What the BBMP asks for.',
  focusKeyword: 'khata transfer',
  og: { imageUrl: 'https://images.test/share.jpg' },
};

/** The card with the panel API a host would have given it. */
function mountCard({ seo = {}, entity = ARTICLE, api = {} } = {}) {
  const full = withSeoDefaults(seo);
  const value = {
    entityType: 'article',
    entity: { ...entity, seo: full },
    seo: full,
    setSeo: jest.fn(),
    setField: jest.fn(),
    analysis: ANALYSIS,
    analysing: false,
    reanalyse: jest.fn(() => ANALYSIS),
    refreshSiteIndex: jest.fn(() => Promise.resolve([])),
    seoSettings: SETTINGS,
    siteUrl: SETTINGS.siteUrl,
    context: { seoSettings: SETTINGS },
    errors: {},
    disabled: false,
    variant: 'full',
    ...api,
  };

  renderWith(
    <SeoPanelProvider value={value}>
      <ScoreCard />
    </SeoPanelProvider>
  );
  return value;
}

const button = (name) => screen.getByRole('button', { name: new RegExp(`^${name}`) });

describe('ScoreCard — Re-analyse', () => {
  it('is busy while the site index is read again, then runs against it', async () => {
    let finish;
    const refreshSiteIndex = jest.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const api = mountCard({ api: { refreshSiteIndex } });

    await userEvent.click(button('Re-analyse'));

    expect(button('Re-analyse')).toBeDisabled();
    expect(button('Auto-fill missing')).toBeDisabled();
    expect(button('Regenerate all')).toBeDisabled();
    expect(api.reanalyse).not.toHaveBeenCalled();

    const rows = [{ id: 3, type: 'article', seo: { focusKeyword: 'khata' } }];
    await act(async () => finish(rows));

    expect(api.reanalyse).toHaveBeenCalledWith({ siteIndex: rows });
    await waitFor(() => expect(button('Re-analyse')).toBeEnabled());
  });

  it('says what changed when the score moved', async () => {
    mountCard({
      api: {
        reanalyse: jest.fn(() => ({ ...ANALYSIS, score: 60, testsPassed: 14 })),
      },
    });

    await userEvent.click(button('Re-analyse'));

    expect(
      await screen.findByText('Re-analysed — 60/100, 14 of 32 tests passed')
    ).toBeInTheDocument();
  });

  it('says "still" when nothing moved', async () => {
    mountCard();

    await userEvent.click(button('Re-analyse'));

    expect(
      await screen.findByText('Re-analysed — still 51/100, 12 of 32 tests passed')
    ).toBeInTheDocument();
  });

  it('still reports the score when the index is refused (a sales user)', async () => {
    const api = mountCard({ api: { refreshSiteIndex: jest.fn(() => Promise.resolve([])) } });

    await userEvent.click(button('Re-analyse'));

    expect(await screen.findByText(/Re-analysed — still 51\/100/)).toBeInTheDocument();
    expect(api.reanalyse).toHaveBeenCalledWith({ siteIndex: [] });
  });

  it('explains itself in a tooltip', () => {
    mountCard();
    expect(button('Re-analyse')).toHaveAttribute(
      'title',
      'Re-runs every test against the current values and the latest site-wide index (used by the uniqueness tests)'
    );
  });
});

describe('ScoreCard — Auto-fill missing', () => {
  it('writes nothing and says so when all four are set', async () => {
    const api = mountCard({ seo: FILLED });

    await userEvent.click(button('Auto-fill missing'));

    expect(api.setSeo).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        'Nothing to fill — the SEO title, description, focus keyword and share image are already set. Use "Regenerate all" to replace them.'
      )
    ).toBeInTheDocument();
  });

  it('fills the one that is empty and names it', async () => {
    const api = mountCard({ seo: { ...FILLED, description: '' } });

    await userEvent.click(button('Auto-fill missing'));

    expect(api.setSeo).toHaveBeenCalledTimes(1);
    const patch = api.setSeo.mock.calls[0][0];
    expect(Object.keys(patch)).toEqual(['description']);
    // An article's summary is its excerpt, which is what a description is made from.
    expect(patch.description).toBe(ARTICLE.excerpt);
    expect(await screen.findByText('Filled: description')).toBeInTheDocument();
  });

  it('names what it could not fill, and why', async () => {
    const api = mountCard({
      seo: { ...FILLED, description: '', og: { imageUrl: '' } },
      entity: { ...ARTICLE, featuredImage: null },
    });

    await userEvent.click(button('Auto-fill missing'));

    expect(Object.keys(api.setSeo.mock.calls[0][0])).toEqual(['description']);
    expect(
      await screen.findByText(
        'Filled: description. Could not fill: share image (no image on this record)'
      )
    ).toBeInTheDocument();
  });

  it('never replaces a value somebody wrote', async () => {
    const api = mountCard({ seo: { ...FILLED, focusKeyword: '' } });

    await userEvent.click(button('Auto-fill missing'));

    const patch = api.setSeo.mock.calls[0][0];
    expect(patch.title).toBeUndefined();
    expect(patch.description).toBeUndefined();
    expect(patch.focusKeyword).toBeTruthy();
  });
});

describe('ScoreCard — Regenerate all', () => {
  it('asks first, then replaces all four with generated values', async () => {
    const api = mountCard({ seo: FILLED });

    await userEvent.click(button('Regenerate all'));

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(
        'Replace the SEO title, description, focus keyword and share image with generated values? What you typed will be lost.'
      )
    ).toBeInTheDocument();
    expect(api.setSeo).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Regenerate' }));

    expect(api.setSeo).toHaveBeenCalledTimes(1);
    const patch = api.setSeo.mock.calls[0][0];
    expect(patch.title).not.toBe(FILLED.title);
    expect(patch.description).not.toBe(FILLED.description);
    expect(patch.og.imageUrl).toBe(ARTICLE.featuredImage.url);
    expect(
      await screen.findByText('Regenerated: title, description, focus keyword, share image')
    ).toBeInTheDocument();
  });

  it('changes nothing when the dialog is cancelled', async () => {
    const api = mountCard({ seo: FILLED });

    await userEvent.click(button('Regenerate all'));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' })
    );

    expect(api.setSeo).not.toHaveBeenCalled();
  });
});

describe('ScoreCard — read-only', () => {
  it('shows no actions on a read-only panel', () => {
    mountCard({ api: { disabled: true } });
    expect(screen.queryByRole('button', { name: /Re-analyse/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Regenerate all/ })).not.toBeInTheDocument();
  });
});
