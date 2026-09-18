import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

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

  // The SEO half, readable without subscribing to it: `updateLocal` rewrites
  // the session cache, which holds both, and must not drop the one it is not
  // changing.
  const seoRef = useRef(seoSettings);
  seoRef.current = seoSettings;

  const load = useCallback(async (signal) => {
    setError(null);
    try {
      const [site, seo] = await Promise.all([
        settingsService.public({ signal }),
        seoService.settings({ signal }),
      ]);
      if (signal?.aborted) return null;

      const next = { settings: site?.data ?? null, seoSettings: seo?.data ?? null };
      setSettings(next.settings);
      setSeoSettings(next.seoSettings);
      writeCache(next);
      setLoading(false);
      return next.settings;
    } catch (thrown) {
      if (isCanceled(thrown) || signal?.aborted) return null;
      setError(thrown);
      setLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /**
   * Re-reads both singletons from the API.
   *
   * @returns {Promise<object|null>} the new site settings, so a screen that
   *   saved them can act on the server's own copy rather than on its own
   */
  const refresh = useCallback(() => load(), [load]);

  /**
   * Puts a freshly saved record on screen without waiting for the round trip —
   * the admin settings form saves, and the header, the hero and the footer are
   * already showing the new name while `refresh()` is still in flight.
   *
   * The `leads` branch is dropped on the way in: this context holds the public
   * subset (§5.10), and what it holds is what the session cache keeps.
   *
   * @param {object} next the whole settings record, as `PUT /admin/settings` answers it
   */
  const updateLocal = useCallback((next) => {
    if (!next || typeof next !== 'object') return;
    const { leads: _admin, ...publicSubset } = next;
    setSettings(publicSubset);
    writeCache({ settings: publicSubset, seoSettings: seoRef.current });
  }, []);

  const value = useMemo(() => {
    const general = settings?.general ?? {};

    return {
      settings,
      seoSettings,
      loading,
      error,
      refresh,
      updateLocal,

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
  }, [settings, seoSettings, loading, error, refresh, updateLocal]);

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
  refresh: () => Promise.resolve(null),
  updateLocal: () => {},
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
