import { Route, Routes } from 'react-router-dom';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import ApiError from '../../../services/apiError';
import BuilderDetail from '../BuilderDetail';
import ToastProvider from '../../../components/common/ToastProvider';
import leadService from '../../../services/leadService';
import masterDataService from '../../../services/masterDataService';
import propertyService from '../../../services/propertyService';
import renderWith from '../../../test-utils';

jest.mock('../../../services/masterDataService', () => ({
  __esModule: true,
  default: { developers: { bySlug: jest.fn() } },
}));

jest.mock('../../../services/propertyService', () => ({
  __esModule: true,
  default: { list: jest.fn() },
}));

jest.mock('../../../services/leadService', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

/**
 * The counters run off `prefers-reduced-motion` and jsdom has no `matchMedia`
 * at all: answering it here makes the figures settle on their final value
 * rather than counting up to it over a second and a half, which is both the
 * §3.1 path worth testing and the only deterministic one. It is what makes
 * framer-motion print its one-time "Reduced Motion enabled" notice below.
 */
const preferReducedMotion = () => {
  window.matchMedia = (query) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
};

/** A §6.5 developer with every section filled in. */
const aurelia = {
  id: 1,
  name: 'Aurelia Estates',
  slug: 'aurelia-estates',
  logoUrl: 'https://example.test/aurelia-logo.png',
  coverImageUrl: 'https://example.test/aurelia-cover.jpg',
  shortDescription: 'Mid-rise gated apartment projects across east Bengaluru.',
  description: '<p>Aurelia Estates builds mid-rise gated apartment projects.</p>',
  establishedYear: 2004,
  headquarters: 'Bengaluru, Karnataka',
  website: 'https://example.test/aurelia',
  totalProjects: 26,
  ongoingProjects: 5,
  completedProjects: 21,
  reraIds: ['PRM/KA/RERA/1251/446/PR/200/placeholder'],
  highlights: ['Cross-ventilated layouts', 'Clubhouse and podium landscaping as standard'],
  isFeatured: true,
  isActive: true,
  propertyCount: 8,
  seo: { description: 'Projects by Aurelia Estates in Bengaluru.' },
};

const property = {
  id: 11,
  slug: 'lakeview-heights-3-bhk-whitefield',
  title: 'Lakeview Heights – 3 BHK Apartment in Whitefield',
  listingType: 'sale',
  images: [{ id: 1, url: 'https://example.test/cover.jpg', alt: 'Cover', isCover: true }],
  pricing: { price: 14200000 },
  area: { superBuiltUpArea: 1650, areaUnit: 'sqft' },
  configuration: { bedrooms: 3 },
  location: {
    locality: { id: 1, name: 'Whitefield', slug: 'whitefield' },
    city: { id: 1, name: 'Bengaluru', slug: 'bengaluru' },
  },
};

const envelope = (data, meta) => ({ data, meta: meta ?? null });

const render = () =>
  renderWith(
    <ToastProvider>
      <Routes>
        <Route path="/builders/:slug" element={<BuilderDetail />} />
      </Routes>
    </ToastProvider>,
    { initialEntries: ['/builders/aurelia-estates'] }
  );

beforeEach(() => {
  jest.clearAllMocks();
  preferReducedMotion();
  masterDataService.developers.bySlug.mockResolvedValue(envelope(aurelia));
  propertyService.list.mockResolvedValue(
    envelope([property], { page: 1, perPage: 12, total: 8, totalPages: 1 })
  );
  leadService.create.mockResolvedValue({ data: { id: 46 }, message: 'Thank you.' });
});

describe('BuilderDetail', () => {
  it('renders the profile of a builder that carries every section', async () => {
    render();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Aurelia Estates' })
    ).toBeInTheDocument();

    expect(screen.getByText('Bengaluru, Karnataka')).toBeInTheDocument();
    const website = screen.getByRole('link', { name: /Visit website/ });
    expect(website).toHaveAttribute('href', 'https://example.test/aurelia');
    expect(website).toHaveAttribute('rel', 'noopener noreferrer nofollow');

    expect(screen.getByRole('heading', { level: 2, name: 'At a glance' })).toBeInTheDocument();
    expect(screen.getByText('Established')).toBeInTheDocument();
    expect(screen.getByText('2004')).toBeInTheDocument();
    // The three counts settle one tick after the record arrives.
    expect(await screen.findByText('26')).toBeInTheDocument();
    expect(screen.getByText('Ongoing')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('PRM/KA/RERA/1251/446/PR/200/placeholder')).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { level: 2, name: 'About Aurelia Estates' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Aurelia Estates builds mid-rise gated apartment projects.')
    ).toBeInTheDocument();
    expect(screen.getByText('Cross-ventilated layouts')).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Projects by Aurelia Estates' })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Interested in a project by Aurelia Estates?' })
    ).toBeInTheDocument();
  });

  it('asks the API for the builder named in the URL', async () => {
    render();

    await screen.findByRole('heading', { level: 1, name: 'Aurelia Estates' });
    expect(masterDataService.developers.bySlug).toHaveBeenCalledWith(
      'aurelia-estates',
      expect.objectContaining({ signal: expect.anything() })
    );
    // The projects below settle on their own; waiting for them keeps the
    // teardown from landing in the middle of a render.
    await screen.findByText('Lakeview Heights – 3 BHK Apartment in Whitefield');
  });

  it('embeds the listing engine with the builder fixed (prompt 26)', async () => {
    render();

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Projects by Aurelia Estates' })
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Lakeview Heights – 3 BHK Apartment in Whitefield')
    ).toBeInTheDocument();

    // One counting call decides whether the section exists at all…
    expect(propertyService.list).toHaveBeenCalledWith(
      expect.objectContaining({ developerId: 1, perPage: 1 }),
      expect.anything()
    );
    // …and the engine asks for the page itself, the builder fixed.
    expect(propertyService.list).toHaveBeenCalledWith(
      expect.objectContaining({ developerId: '1', perPage: 12, sort: 'relevance' }),
      expect.anything()
    );
  });

  it('files the enquiry against the builder, with the page it came from', async () => {
    render();

    await screen.findByText('Lakeview Heights – 3 BHK Apartment in Whitefield');
    // The message opens on the builder's name; the visitor writes after it.
    expect(
      screen.getByDisplayValue('Interested in projects by Aurelia Estates')
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { name: 'name', value: 'Ravi Kumar' },
    });
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { name: 'phone', value: '9876543210' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send enquiry/i }));

    await waitFor(() => expect(leadService.create).toHaveBeenCalledTimes(1));
    expect(leadService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ravi Kumar',
        // Every form normalises the number before it is filed, so the CRM
        // stores one shape (§6.7).
        phone: '+919876543210',
        source: 'developer-page',
        pageSlug: 'aurelia-estates',
        pageUrl: 'http://localhost:3000/builders/aurelia-estates',
        message: 'Interested in projects by Aurelia Estates',
      })
    );
  });

  it('hides the sections a builder created from a name alone has nothing for', async () => {
    masterDataService.developers.bySlug.mockResolvedValue(
      envelope({
        id: 9,
        name: 'Test Builders',
        slug: 'test-builders',
        logoUrl: null,
        coverImageUrl: null,
        shortDescription: '',
        description: '',
        establishedYear: null,
        headquarters: null,
        website: null,
        totalProjects: null,
        ongoingProjects: null,
        completedProjects: null,
        reraIds: [],
        highlights: [],
        propertyCount: 0,
      })
    );
    propertyService.list.mockResolvedValue(
      envelope([], { page: 1, perPage: 12, total: 0, totalPages: 0 })
    );

    render();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Test Builders' })
    ).toBeInTheDocument();
    // The logo box keeps its place and carries the builder's own initials (§7).
    expect(screen.getByText('TB')).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Projects by Test Builders' })).toBeNull()
    );
    expect(screen.queryByRole('heading', { name: 'At a glance' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'About Test Builders' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Visit website/ })).toBeNull();

    // The enquiry form is never hidden: a lead must always be possible.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Interested in a project by Test Builders?' })
    ).toBeInTheDocument();
  });

  it('renders the 404 page for a slug the API does not know', async () => {
    masterDataService.developers.bySlug.mockRejectedValue(
      new ApiError({ status: 404, message: 'Developer not found.' })
    );

    render();

    expect(
      await screen.findByRole('heading', { level: 1, name: /Page Not Found/i })
    ).toBeInTheDocument();
    expect(screen.queryByText('Aurelia Estates')).toBeNull();
  });

  it('offers a retry when the API fails for another reason', async () => {
    masterDataService.developers.bySlug.mockRejectedValue(
      new ApiError({ status: 500, message: 'The server is having a bad day.' })
    );

    render();

    expect(await screen.findByText('We could not load this builder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
