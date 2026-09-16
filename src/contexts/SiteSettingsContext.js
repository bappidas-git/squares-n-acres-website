import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { BRAND, SITE } from '../config/site';
import { formatPhoneForTel, whatsappLink } from '../utils/format';
import { isCanceled } from '../services/apiError';
import seoService from '../services/seoService';
import settingsService from '../services/settingsService';
import storage from '../utils/storage';

/**
 * The site settings and the SEO settings, loaded once per page load (D93).
 *
 * Before this context existed, `Footer` and `NewsletterSection` each fetched
 * `GET /settings` on every public page (ADD-08). Now one provider asks once,
 * seeds itself from a session cache so the first paint already has the brand
 * name and the contact details, and refreshes the cache after every load.
 */

const CACHE_KEY = 'sna_site_settings_cache';

const SiteSettingsContext = createContext(null);

const readCache = () => storage.getItem(CACHE_KEY, null, { session: true });
const writeCache = (value) => storage.setItem(CACHE_KEY, value, { session: true });

export const SiteSettingsProvider = ({ children }) => {
  const cached = useMemo(readCache, []);
  const [settings, setSettings] = useState(cached?.settings ?? null);
  const [seoSettings, setSeoSettings] = useState(cached?.seoSettings ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    setError(null);
    try {
      const [site, seo] = await Promise.all([
        settingsService.public({ signal }),
        seoService.settings({ signal }),
      ]);
      if (signal?.aborted) return;

      const next = { settings: site?.data ?? null, seoSettings: seo?.data ?? null };
      setSettings(next.settings);
      setSeoSettings(next.seoSettings);
      writeCache(next);
      setLoading(false);
    } catch (thrown) {
      if (isCanceled(thrown) || signal?.aborted) return;
      setError(thrown);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  const value = useMemo(() => {
    const general = settings?.general ?? {};

    return {
      settings,
      seoSettings,
      loading,
      error,
      refresh,

      /** The brand name, always something printable. */
      siteName: general.siteName || SITE.name,
      tagline: general.tagline || '',

      /** Phone, e-mail, WhatsApp and address, with `tel:` ready to use. */
      getContact: () => ({
        email: general.contactEmail || '',
        phone: general.contactPhone || '',
        phoneHref: general.contactPhone ? `tel:${formatPhoneForTel(general.contactPhone)}` : '',
        alternatePhone: general.alternatePhone || '',
        whatsappNumber: general.whatsappNumber || '',
        address: general.address ?? null,
        workingHours: general.workingHours ?? [],
      }),

      /** The configured logo, or the brand asset when settings are unreachable. */
      getLogoUrl: () => general.logoUrl || BRAND.logoUrl,

      /** A `wa.me` link carrying the configured default message unless told otherwise. */
      getWhatsappLink: (message) =>
        whatsappLink(general.whatsappNumber, message ?? general.whatsappDefaultMessage),
    };
  }, [settings, seoSettings, loading, error, refresh]);

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
};

/**
 * The settings, the SEO settings and the small getters screens need.
 * Safe outside a provider: everything falls back to the brand constants.
 */
export function useSiteSettings() {
  return useContext(SiteSettingsContext) ?? FALLBACK;
}

/** What a component sees when no provider is mounted (tests, Storybook). */
const FALLBACK = {
  settings: null,
  seoSettings: null,
  loading: false,
  error: null,
  refresh: () => {},
  siteName: SITE.name,
  tagline: '',
  getContact: () => ({
    email: '',
    phone: '',
    phoneHref: '',
    alternatePhone: '',
    whatsappNumber: '',
    address: null,
    workingHours: [],
  }),
  getLogoUrl: () => BRAND.logoUrl,
  getWhatsappLink: () => '',
};

export { SiteSettingsContext, CACHE_KEY };
export default SiteSettingsContext;
