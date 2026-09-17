/*
 * `@testing-library/user-event` is pinned at 13.5 (§3.1), which — unlike v14 —
 * does not wrap its own interactions in `act`. The wrappers below are what keep
 * the state updates that follow a click inside the click's `act` scope, so the
 * rule that assumes v14 is switched off for this file rather than the tests
 * being rewritten around a version this project does not use.
 */
/* eslint-disable testing-library/no-unnecessary-act */
/**
 * The title templates and their live examples (prompt 37 §4.6).
 *
 * One of these eleven fields decides the `<title>` of four hundred listings,
 * and `%bhk% %propertytype% %listingtype% in %locality%, %city% – %price%` is
 * unreadable until you can see what it resolves to. So the example is the
 * feature, and this is what it has to get right: real values from a real
 * record, updated while the template is still being typed, and the §9.5 rule
 * that an unresolved variable takes its punctuation with it.
 */

import { act, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';

import TitlesMetaTab from '../settings-tabs/TitlesMetaTab';
import renderWith from '../../../../test-utils';

jest.mock('../seoEntityServices', () => ({
  __esModule: true,
  serviceFor: jest.fn(),
  typeLabel: (type) => type,
}));

const { serviceFor } = require('../seoEntityServices');

const LOCALITY = { id: 1, name: 'Whitefield', slug: 'whitefield', cityId: 1 };
const CITY = { id: 1, name: 'Bengaluru' };
const PROPERTY_TYPE = { id: 4, name: 'Apartment', slug: 'apartments', segment: 'residential' };

/** The listing the example is resolved against — prompt 10's first seed record. */
const SAMPLE_PROPERTY = {
  id: 1,
  slug: 'lakeview-heights-3-bhk-whitefield',
  title: 'Lakeview Heights – 3 BHK Apartment in Whitefield',
  listingType: 'sale',
  segment: 'residential',
  propertyTypeId: 4,
  configuration: { bedrooms: 3 },
  pricing: { price: 14200000 },
  location: { localityId: 1, cityId: 1 },
  seo: {},
};

const CONTEXT = { localities: [LOCALITY], cities: [CITY], propertyTypes: [PROPERTY_TYPE] };

const SETTINGS = {
  siteUrl: 'https://www.squaresnacres.com',
  separator: '|',
  knowledgeGraph: { name: 'Squares N Acres' },
  titleTemplates: {
    default: '%title% %sep% %sitename%',
    property: '%bhk% %propertytype% %listingtype% in %locality%, %city% – %price% %sep% %sitename%',
  },
  defaults: {},
  noindex: {},
};

const rows = [{ key: 'property:1', id: 1, type: 'property', title: SAMPLE_PROPERTY.title }];

/** The tab, over a form that actually holds its values. */
function Host({ initial = SETTINGS }) {
  const [values, setValues] = useState(initial);

  const form = {
    values,
    setField: (path, value) =>
      setValues((current) => {
        const [head, ...rest] = path.split('.');
        if (rest.length === 0) return { ...current, [head]: value };
        return { ...current, [head]: { ...current[head], [rest.join('.')]: value } };
      }),
    getError: () => undefined,
  };

  return <TitlesMetaTab form={form} rows={rows} context={CONTEXT} />;
}

beforeEach(() => {
  serviceFor.mockImplementation((type) =>
    type === 'property' ? { get: () => Promise.resolve({ data: SAMPLE_PROPERTY }) } : null
  );
});

describe('the property title template', () => {
  it('resolves every variable against a real listing', async () => {
    renderWith(<Host />);

    expect(
      await screen.findByText(
        /3 BHK Apartment for Sale in Whitefield, Bengaluru – ₹1\.42 Cr \| Squares N Acres/
      )
    ).toBeInTheDocument();
  });

  it('follows the separator while it is being changed', async () => {
    renderWith(<Host />);
    await screen.findByText(/3 BHK Apartment for Sale in Whitefield/);

    await act(async () => {
      await userEvent.selectOptions(screen.getByLabelText('Separator'), '–');
    });

    expect(
      await screen.findByText(/Whitefield, Bengaluru – ₹1\.42 Cr – Squares N Acres/)
    ).toBeInTheDocument();
  });

  it('updates the example while the template is typed', async () => {
    renderWith(<Host />);
    await screen.findByText(/3 BHK Apartment for Sale in Whitefield/);

    const field = screen.getByLabelText('Property');
    await act(async () => {
      await userEvent.clear(field);
      await userEvent.type(field, '%bhk% in %locality% %sep% %sitename%');
    });

    expect(await screen.findByText('3 BHK in Whitefield | Squares N Acres')).toBeInTheDocument();
  });

  it('removes an unresolved variable and the punctuation it leaves behind (§9.5)', async () => {
    renderWith(<Host />);
    await screen.findByText(/3 BHK Apartment for Sale in Whitefield/);

    const field = screen.getByLabelText('Property');
    await act(async () => {
      await userEvent.clear(field);
      await userEvent.type(field, '%bhk% in %locality%, %developer%');
    });

    // This listing names no builder, so `%developer%` and the comma it was
    // hanging off both go, rather than publishing "3 BHK in Whitefield, ".
    expect(await screen.findByText('3 BHK in Whitefield')).toBeInTheDocument();
  });

  it('says so when a template resolves to nothing at all', async () => {
    renderWith(<Host />);
    const field = await screen.findByLabelText('Property');

    await act(async () => {
      await userEvent.clear(field);
      await userEvent.type(field, '%developer%');
    });

    await waitFor(() =>
      expect(
        screen.getAllByText(/this template resolves to nothing/i).length
      ).toBeGreaterThanOrEqual(1)
    );
  });
});

describe('the tab', () => {
  it('offers a field for every §9.5 template key', () => {
    renderWith(<Host />);

    for (const label of [
      'Everything else',
      'Home page',
      'Property',
      'Listing and search results',
      'Locality',
      'Builder',
      'Article',
      'Article category',
      'CMS page',
      'Author',
      'Site search',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('carries the four automatic noindex rules', () => {
    renderWith(<Host />);

    expect(screen.getByText('Search result pages')).toBeInTheDocument();
    expect(screen.getByText('Paginated listings (page 2 and beyond)')).toBeInTheDocument();
    expect(screen.getByText('Filtered listings')).toBeInTheDocument();
    expect(screen.getByText('Admin and sign-in pages')).toBeInTheDocument();
  });
});
