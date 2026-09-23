/**
 * Every active seed property renders its detail page (prompt 44).
 *
 * The per-section suites of prompts 23–25 each prove one band against one
 * fixture. This one proves the *page*, against all thirty-eight listings the
 * seed publishes — the plot with no bedrooms, the pre-launch project with a
 * timeline and no possession, the commercial floor with specifications and no
 * BHK, the rental with a deposit instead of a price. A rule that only holds for
 * a three-bedroom apartment in Whitefield is the kind of defect a bug bash
 * exists to find, and it is not one a hand-written fixture can show.
 *
 * The records come from `db.json` through `fs`, put through the **API's own**
 * presentation (`mock-server/lib/embed.js` + `lib/scope.js`), so what each test
 * renders is byte-for-byte what `GET /properties/slug/:slug` answers with. A
 * change to either half is caught here rather than in a browser.
 *
 * Each listing is asserted on three things:
 *
 *   - it renders without throwing, and with nothing on `console.error` or
 *     `console.warn` — React's key/prop warnings included (§12.1);
 *   - it has exactly one `<h1>`, carrying the listing's title;
 *   - every chip of the section navigation names a section the page printed,
 *     which is BUG-06 restated over the whole seed.
 */

import fs from 'fs';
import path from 'path';

import { Route, Routes } from 'react-router-dom';
import { screen, waitFor, within } from '@testing-library/react';

import { AdminAuthProvider } from '../contexts/AdminAuthContext';
import { LeadCaptureProvider } from '../contexts/LeadCaptureContext';
import { MasterDataProvider } from '../contexts/MasterDataContext';
import { getVisibleSections } from '../utils/propertySections';
import { sectionElementId } from '../components/sections/property/SectionNav';
import PropertyDetails from '../pages/public/PropertyDetails';
import propertyService from '../services/propertyService';
import renderWith from '../test-utils';
import storage from '../utils/storage';

const { embedProperty } = require('../../mock-server/lib/embed');
const { publicProperty } = require('../../mock-server/lib/scope');

jest.mock('../services/propertyService', () => ({
  __esModule: true,
  default: {
    getBySlug: jest.fn(),
    adminGetBySlug: jest.fn(),
    similar: jest.fn(),
    view: jest.fn(),
  },
}));

jest.mock('../services/authService', () => ({
  __esModule: true,
  default: { profile: jest.fn(() => Promise.resolve({ data: null })), logout: jest.fn() },
}));

/** The committed seed, read the way `scripts/validate-seed.js` reads it. */
const seed = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'db.json'), { encoding: 'utf-8' })
);

/** The collections `embedProperty` resolves the read-only objects against. */
const source = {
  properties: seed.properties,
  propertyTypes: seed.propertyTypes,
  amenities: seed.amenities,
  badges: seed.badges,
  localities: seed.localities,
  cities: seed.cities,
  developers: seed.developers,
  teamMembers: seed.teamMembers,
};

/** `MasterDataContext`'s session cache, primed so the provider never fetches. */
const MASTER_DATA_CACHE_KEY = 'sna_master_data_cache';

const masterData = {
  localities: seed.localities,
  cities: seed.cities,
  segments: seed.segments,
  propertyTypes: seed.propertyTypes,
  amenities: seed.amenities,
  badges: seed.badges,
  developers: seed.developers,
  banks: seed.banks,
};

/** One listing exactly as `GET /properties/slug/:slug` presents it (§5.5, §5.10). */
const asPublicRecord = (property) => publicProperty(embedProperty(property, source));

const published = seed.properties.filter((property) => property.isActive);

const envelope = (data, meta = null) => ({ data, meta });

/**
 * The calls the page makes while it renders one listing.
 *
 * `similar` answers with the same fill rule the endpoint applies — the editor's
 * picks, active only — so the "Similar properties" band is offered exactly when
 * the API would offer it.
 */
function stubServices(record) {
  propertyService.getBySlug.mockResolvedValue(envelope(record));
  propertyService.adminGetBySlug.mockResolvedValue(envelope(record));
  propertyService.view.mockResolvedValue(envelope({ viewCount: record.viewCount ?? 0 }));

  const picks = (record.similarPropertyIds ?? [])
    .map((id) => seed.properties.find((row) => row.id === id))
    .filter((row) => row?.isActive)
    .map(asPublicRecord);

  propertyService.similar.mockResolvedValue(envelope(picks));

  return picks;
}

const renderProperty = (record) =>
  renderWith(
    <AdminAuthProvider>
      <MasterDataProvider>
        <LeadCaptureProvider>
          <Routes>
            <Route path="/properties/:slug" element={<PropertyDetails />} />
          </Routes>
        </LeadCaptureProvider>
      </MasterDataProvider>
    </AdminAuthProvider>,
    { initialEntries: [`/properties/${record.slug}`] }
  );

describe('every active seed property renders its detail page', () => {
  let errorSpy;
  let warnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    // The eight master-data lists arrive from the seed through the context's own
    // session cache, so the provider serves them synchronously and the sections
    // that resolve a developer or an amenity see what the site would see.
    storage.setItem(
      MASTER_DATA_CACHE_KEY,
      { savedAt: Date.now(), data: masterData },
      { session: true }
    );
    // jsdom has no layout, so the page's observers never fire; stubbing them
    // keeps the sticky navigation from reaching for an API that is not there.
    window.IntersectionObserver = undefined;
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('publishes enough listings for this to be a contract test', () => {
    expect(published.length).toBeGreaterThanOrEqual(30);
  });

  it.each(published.map((property) => [property.slug, property.id]))(
    'renders %s (#%i) with one h1, no console output and a truthful section nav',
    async (slug) => {
      const record = asPublicRecord(seed.properties.find((row) => row.slug === slug));
      const similar = stubServices(record);

      renderProperty(record);

      const heading = await screen.findByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent(record.title);
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);

      // The chip strip is exactly the sections this listing shows, and every
      // chip scrolls to the anchor that section was given (BUG-06). `enquiry`
      // always has data, so the strip is never empty and this can never pass
      // by finding nothing.
      const expected = getVisibleSections(record, {
        banksAvailable: masterData.banks.some((bank) => bank.isActive !== false),
        similarAvailable: similar.length > 0,
      });

      const chipsNow = () =>
        within(screen.getByRole('navigation', { name: /sections of this property/i })).getAllByRole(
          'link'
        );

      // The similar row is fetched after the record, and the strip gains its
      // chip when that answer arrives — so the strip is compared once it has
      // settled rather than at the first paint.
      await waitFor(() =>
        expect(chipsNow().map((chip) => chip.textContent)).toEqual(
          expected.map((section) => section.label)
        )
      );

      const chips = chipsNow();
      expect(chips.length).toBeGreaterThan(0);
      expect(chips.map((chip) => chip.getAttribute('href'))).toEqual(
        expected.map((section) => `#${sectionElementId(section.key)}`)
      );

      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    }
  );
});
