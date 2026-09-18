/**
 * The accessibility contract of the SEO panel's tab strip (prompt 42 §4.5).
 *
 * The panel is the busiest control in the admin — four tabs over a few dozen
 * fields — and it is rendered inside eight different forms, so an unlabelled
 * box or a repeated id here is one in every one of them.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import SeoPanel from '../SeoPanel';
import renderWith from '../../../../test-utils';
import { resetSeoCaches } from '../useSiteSeoIndex';
import {
  expectLabelledInputs,
  expectNoDuplicateIds,
  expectRoleGroup,
  expectRovingTabIndex,
} from '../../../../test-utils/a11y';

jest.mock('../../../../services/seoService', () => ({
  __esModule: true,
  default: {
    settings: () => Promise.resolve({ data: SETTINGS }),
    overview: () => Promise.resolve({ data: [] }),
  },
}));

const SETTINGS = {
  siteUrl: 'https://www.squaresnacres.com',
  separator: '|',
  titleTemplates: { default: '%title% %sep% %sitename%' },
  defaults: { metaDescription: 'The site-wide description.', robots: { index: true } },
  knowledgeGraph: { name: 'Squares N Acres' },
};

const PROPERTY = {
  id: 1,
  title: 'Lakeview Heights',
  slug: 'lakeview-heights',
  listingType: 'sale',
  segment: 'residential',
  isActive: true,
  shortDescription: 'A three-bedroom apartment beside the lake.',
  description: '<p>A quiet three bedroom apartment in Whitefield, Bengaluru.</p>',
  pricing: { price: 14200000 },
  configuration: { bedrooms: 3 },
  location: { locality: { id: 4, name: 'Whitefield' }, city: { id: 1, name: 'Bengaluru' } },
  images: [{ url: 'https://example.com/a.jpg', alt: 'Lakeview Heights', isCover: true }],
  faqs: [],
  seo: null,
};

function Host() {
  const [seo, setSeo] = useState(undefined);

  return (
    <SeoPanel
      entityType="property"
      entity={{ ...PROPERTY, seo }}
      seo={seo}
      seoSettings={SETTINGS}
      onChange={(patch) => setSeo((current) => ({ ...(current ?? {}), ...patch }))}
    />
  );
}

beforeEach(() => resetSeoCaches());

// The analysis runs 400 ms behind the last change and the settings arrive from
// a promise, so every test waits for the gauge before it finishes.
const settle = () =>
  waitFor(() => expect(screen.getByRole('img', { name: /SEO score/i })).toBeInTheDocument());

describe('SeoPanel tabs', () => {
  it('is a named tab list with one stop in the tab order', async () => {
    const { container } = renderWith(<Host />);
    await settle();

    expectRoleGroup(container, 'tablist');
    expectRovingTabIndex(container, '[role="tab"]');
  });

  it('links every tab to the panel it opens, and back', async () => {
    renderWith(<Host />);
    await settle();

    const tabs = screen.getAllByRole('tab');
    const selected = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true');

    expect(selected).toBeTruthy();
    expect(selected.getAttribute('aria-controls')).toBeTruthy();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(selected.textContent.trim());
  });

  it('labels every box on every tab and never repeats an id', async () => {
    const { container } = renderWith(<Host />);
    await settle();

    for (const tab of screen.getAllByRole('tab')) {
      fireEvent.click(tab);
      expectLabelledInputs(container);
      expectNoDuplicateIds(container);
    }
  });
});
