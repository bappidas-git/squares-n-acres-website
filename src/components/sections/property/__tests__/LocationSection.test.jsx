import { screen } from '@testing-library/react';

import LocationSection from '../LocationSection';
import renderWith from '../../../../test-utils';
import { isMapEmbedUrl } from '../../../../utils/mapEmbed';

const EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887';

const property = (location) => ({
  id: 3,
  title: 'Lakeview Heights',
  location: {
    locality: { id: 4, name: 'Whitefield' },
    city: { id: 1, name: 'Bengaluru' },
    address: '14 Lake Road',
    latitude: 12.97,
    longitude: 77.75,
    ...location,
  },
});

const map = () => screen.getByTitle(/^Map of/);

describe('LocationSection', () => {
  it('shows the editor’s own map where the exact location may be shown', () => {
    renderWith(
      <LocationSection property={property({ showExactLocation: true, mapEmbedUrl: EMBED })} />
    );
    // The form promised it replaces the generated map; the page used to ignore it.
    expect(map()).toHaveAttribute('src', EMBED);
  });

  it('keeps it off the page while the exact location is private', () => {
    renderWith(
      <LocationSection property={property({ showExactLocation: false, mapEmbedUrl: EMBED })} />
    );
    expect(screen.queryByTitle(/^Map of/)?.getAttribute('src') ?? '').not.toBe(EMBED);
  });

  it('never embeds an address that is not a Google map', () => {
    renderWith(
      <LocationSection
        property={property({
          showExactLocation: true,
          mapEmbedUrl: 'https://example.test/not-a-map',
        })}
      />
    );
    expect(map().getAttribute('src')).toMatch(/^https:\/\/www\.google\.com\/maps\?q=12\.97,77\.75/);
  });
});

describe('isMapEmbedUrl', () => {
  it('takes Google’s embed and a shared My Map, and nothing else', () => {
    expect(isMapEmbedUrl(EMBED)).toBe(true);
    expect(isMapEmbedUrl('https://www.google.com/maps/d/embed?mid=1abc')).toBe(true);
    expect(isMapEmbedUrl('https://maps.app.goo.gl/xyz')).toBe(false);
    expect(isMapEmbedUrl('https://example.test/maps/embed')).toBe(false);
    expect(isMapEmbedUrl('')).toBe(false);
  });
});
