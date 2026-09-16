/**
 * `SiteSettingsContext` — the session cache seed and the refresh after load.
 *
 * The cache is what lets the first paint carry the real brand name and contact
 * details; the load that follows must update both the screen and the cache
 * without a flicker back to the defaults (§6.13, D93).
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import seoService from '../../services/seoService';
import settingsService from '../../services/settingsService';
import storage from '../../utils/storage';
import { CACHE_KEY, SiteSettingsProvider, useSiteSettings } from '../SiteSettingsContext';
import { SITE } from '../../config/site';

jest.mock('../../services/settingsService');
jest.mock('../../services/seoService');

const settingsOf = (siteName, extra = {}) => ({
  general: {
    siteName,
    contactPhone: '+91 98000 00001',
    contactEmail: 'info@example.com',
    whatsappNumber: '+91 98000 00000',
    whatsappDefaultMessage: 'Hi there',
    logoUrl: 'https://example.test/logo.png',
    ...extra,
  },
});

const Probe = ({ onState }) => {
  const value = useSiteSettings();
  onState?.(value);
  return (
    <div>
      <span data-testid="name">{value.siteName}</span>
      <span data-testid="loading">{String(value.loading)}</span>
      <span data-testid="error">{value.error?.message ?? ''}</span>
    </div>
  );
};

const renderProvider = () => {
  let value;
  const utils = render(
    <SiteSettingsProvider>
      <Probe onState={(next) => (value = next)} />
    </SiteSettingsProvider>
  );
  return { ...utils, getValue: () => value };
};

describe('SiteSettingsContext', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    settingsService.public.mockResolvedValue({ data: settingsOf('From the API') });
    seoService.settings.mockResolvedValue({ data: { siteUrl: 'https://example.test' } });
  });

  it('asks for the settings and the SEO settings exactly once', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    expect(settingsService.public).toHaveBeenCalledTimes(1);
    expect(seoService.settings).toHaveBeenCalledTimes(1);
  });

  it('writes the answer into the session cache', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('From the API'));

    const cached = storage.getItem(CACHE_KEY, null, { session: true });
    expect(cached.settings.general.siteName).toBe('From the API');
    expect(cached.seoSettings.siteUrl).toBe('https://example.test');
  });

  it('paints from the cache before the request lands, then updates', async () => {
    storage.setItem(
      CACHE_KEY,
      { settings: settingsOf('From the cache'), seoSettings: null },
      { session: true }
    );

    renderProvider();
    // First paint: the cached name, and not a loading state.
    expect(screen.getByTestId('name')).toHaveTextContent('From the cache');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');

    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('From the API'));
  });

  it('falls back to the brand name when the settings cannot be loaded', async () => {
    settingsService.public.mockRejectedValue(new Error('Server is down'));
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Server is down'));
    expect(screen.getByTestId('name')).toHaveTextContent(SITE.name);
  });

  it('refresh() asks again and keeps the cache current', async () => {
    const { getValue } = renderProvider();
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('From the API'));

    settingsService.public.mockResolvedValue({ data: settingsOf('Renamed') });
    await act(async () => {
      await getValue().refresh();
    });

    expect(screen.getByTestId('name')).toHaveTextContent('Renamed');
    expect(storage.getItem(CACHE_KEY, null, { session: true }).settings.general.siteName).toBe(
      'Renamed'
    );
  });

  it('builds the contact helpers from the settings', async () => {
    const { getValue } = renderProvider();
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('From the API'));

    const contact = getValue().getContact();
    expect(contact.email).toBe('info@example.com');
    expect(contact.phoneHref).toBe('tel:+919800000001');
    expect(getValue().getLogoUrl()).toBe('https://example.test/logo.png');
    expect(getValue().getWhatsappLink()).toBe('https://wa.me/919800000000?text=Hi%20there');
    expect(getValue().getWhatsappLink('Custom')).toBe('https://wa.me/919800000000?text=Custom');
  });
});
