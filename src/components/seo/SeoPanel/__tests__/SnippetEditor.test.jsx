import { screen } from '@testing-library/react';

import SnippetEditor from '../parts/SnippetEditor';
import renderWith from '../../../../test-utils';
import { SeoPanelProvider } from '../SeoPanelContext';
import { meterState } from '../parts/SeoMeter';
import { withSeoDefaults } from '../../seoValues';
import { measureSnippet } from '../../../../seo';

const SETTINGS = {
  siteUrl: 'https://www.squaresnacres.com',
  separator: '|',
  titleTemplates: { default: '%title% %sep% %sitename%' },
  defaults: {},
  knowledgeGraph: { name: 'Squares N Acres' },
};

/** The editor on its own, with the panel API a host would have given it. */
function render(seo, overrides = {}) {
  const entity = {
    id: 1,
    title: 'Lakeview Heights',
    slug: 'lakeview-heights',
    ...overrides.entity,
  };
  const full = withSeoDefaults(seo);

  const api = {
    entityType: 'property',
    entity: { ...entity, seo: full },
    seo: full,
    setSeo: jest.fn(),
    setField: jest.fn(),
    seoSettings: SETTINGS,
    siteUrl: SETTINGS.siteUrl,
    context: { seoSettings: SETTINGS },
    errors: {},
    disabled: false,
    variant: 'full',
    resolved: { title: 'Lakeview Heights | Squares N Acres', description: '' },
    ...overrides.api,
  };

  return renderWith(
    <SeoPanelProvider value={api}>
      <SnippetEditor />
    </SeoPanelProvider>
  );
}

describe('meterState', () => {
  it('is muted while the field is empty, because the template fills it', () => {
    expect(
      meterState(0, 0, { chars: { min: 50, max: 60, warnMin: 40, warnMax: 65 }, maxPx: 580 })
    ).toMatchObject({ tone: 'muted' });
  });

  it('is a success inside the guide and a warning on either shoulder', () => {
    const limits = { chars: { min: 50, max: 60, warnMin: 40, warnMax: 65 }, maxPx: 580 };
    expect(meterState(55, 480, limits).tone).toBe('success');
    expect(meterState(45, 400, limits)).toMatchObject({
      tone: 'warning',
      verdict: 'A little short',
    });
    expect(meterState(63, 540, limits)).toMatchObject({
      tone: 'warning',
      verdict: 'A little long',
    });
  });

  it('is an error well outside it, and a warning whenever the pixels overflow', () => {
    const limits = { chars: { min: 50, max: 60, warnMin: 40, warnMax: 65 }, maxPx: 580 };
    expect(meterState(12, 100, limits)).toMatchObject({ tone: 'error', verdict: 'Too short' });
    expect(meterState(90, 800, limits)).toMatchObject({
      tone: 'warning',
      verdict: 'Cut in the result',
    });
  });
});

describe('SnippetEditor', () => {
  it('measures the title in characters and in pixels', () => {
    const title = '3 BHK Apartment for Sale in Whitefield, Bengaluru 2026';
    render({ title });

    const measured = measureSnippet(title, 'title');
    expect(screen.getByText(`${measured.chars} chars`)).toBeInTheDocument();
    expect(screen.getByText(`${Math.round(measured.pixels)} px of 580`)).toBeInTheDocument();
  });

  it('says a title is good when it sits inside the 50–60 character guide', () => {
    render({ title: '3 BHK Apartment for Sale in Whitefield, Bengaluru 2026' });
    expect(screen.getAllByText('Good').length).toBeGreaterThan(0);
  });

  it('says a title a few characters short is a warning rather than an error', () => {
    render({ title: '3 BHK Apartment for Sale in Whitefield, Bengaluru' });
    expect(screen.getByText('A little short')).toBeInTheDocument();
  });

  it('says an empty description is empty rather than wrong', () => {
    render({ title: 'Lakeview Heights' });
    expect(screen.getAllByText('Empty').length).toBeGreaterThan(0);
    expect(screen.getByText(/every page without one shares/i)).toBeInTheDocument();
  });

  it('measures the description against its own 920 px limit', () => {
    const description =
      'A three-bedroom apartment in Whitefield with a lake view, covered parking and a clubhouse.';
    render({ description });

    const measured = measureSnippet(description, 'description');
    expect(screen.getByText(`${Math.round(measured.pixels)} px of 920`)).toBeInTheDocument();
  });

  it('shows what an empty title resolves to through the site template', () => {
    render({});
    expect(screen.getByText(/the site template gives/i)).toBeInTheDocument();
    expect(screen.getByText('Lakeview Heights | Squares N Acres')).toBeInTheDocument();
  });

  it('shows an address that never changes as it is (QA-56)', () => {
    render(
      {},
      {
        entity: { title: 'Home', slug: 'home' },
        api: { entityType: 'page', fixedPath: '/', setSlug: jest.fn() },
      }
    );

    const permalink = screen.getByRole('textbox', { name: 'Permalink' });
    expect(permalink).toHaveValue('/');
    expect(permalink).toHaveAttribute('readonly');
    expect(screen.queryByDisplayValue('home')).toBeNull();
    expect(screen.getByText('This page’s address is fixed.')).toBeInTheDocument();
  });
});
