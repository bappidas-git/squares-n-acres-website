import { useCallback, useEffect, useState } from 'react';

import seoService from '../../../services/seoService';
import storage from '../../../utils/storage';
import { AUTH_STORAGE_KEYS } from '../../../services/http';
import { EVENTS, on } from '../../../utils/events';
import { can } from '../../../config/rbac';
import { isCanceled } from '../../../services/apiError';

/**
 * Three of the engine's tests — "is this description unique?", "does anything
 * else target this keyword?", "does anything else use this title?" — need every
 * other record on the site, and §13.1 settles how they get it: the cached
 * `/admin/seo/overview` list, loaded once per admin session and refreshed after
 * a save.
 *
 * Once per session, not once per panel: an editor who opens six listings in a
 * row should pay for that list once. The cache is module-level rather than a
 * context because it is not state anything renders from — a panel that mounts
 * while the request is still in flight joins it instead of starting a second
 * one.
 */

let cache = null;
let inFlight = null;
let settingsCache = null;
let settingsInFlight = null;

/** Throws away what is cached. The `seo:changed` listener and the tests call it. */
export function invalidateSiteSeoIndex() {
  cache = null;
  inFlight = null;
}

/** Throws away the cached settings as well — for tests, which must not leak. */
export function resetSeoCaches() {
  invalidateSiteSeoIndex();
  settingsCache = null;
  settingsInFlight = null;
}

/**
 * Whether the signed-in role may read the overview at all. A sales user opens
 * a listing read-only and its SEO tab with it; the request was refused with a
 * 403 — a console error — every time the tab opened, because a refusal is
 * never cached (QA-62). Without the list the three tests skip, which is what
 * the refusal led to anyway.
 */
const mayReadIndex = () => {
  const role = storage.getItem(AUTH_STORAGE_KEYS.user, null)?.role;
  return !role || can(role, 'seo', 'view');
};

/** The rows, from the cache or from the API — one request however many callers ask. */
function loadIndex() {
  if (cache) return Promise.resolve(cache);
  if (inFlight) return inFlight;
  if (!mayReadIndex()) return Promise.resolve([]);

  inFlight = seoService
    .overview({ perPage: 'all' })
    .then(({ data }) => {
      cache = Array.isArray(data) ? data : [];
      return cache;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** `GET /seo/settings`, cached the same way — the templates change once a quarter. */
function loadSettings() {
  if (settingsCache) return Promise.resolve(settingsCache);
  if (settingsInFlight) return settingsInFlight;

  settingsInFlight = seoService
    .settings()
    .then(({ data }) => {
      settingsCache = data ?? {};
      return settingsCache;
    })
    .finally(() => {
      settingsInFlight = null;
    });

  return settingsInFlight;
}

/**
 * The site-wide SEO rows the uniqueness tests compare against.
 *
 * Without them those three tests `skip` rather than guess, so an empty answer
 * is a perfectly good one: the panel still works, it simply cannot say whether
 * a description is unique.
 *
 * @returns {{rows: Array<object>, loading: boolean, refresh: () => void}}
 */
export function useSiteSeoIndex() {
  const [rows, setRows] = useState(() => cache ?? []);
  const [loading, setLoading] = useState(() => cache === null);

  const load = useCallback((alive) => {
    setLoading(cache === null);
    loadIndex()
      .then((loaded) => {
        if (alive.current) {
          setRows(loaded);
          setLoading(false);
        }
      })
      .catch((thrown) => {
        // The list decides three tests out of fifty. A desk that cannot read it
        // — a 403 for a sales user — gets a panel that skips them, not an error.
        if (!isCanceled(thrown) && alive.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    const alive = { current: true };
    load(alive);

    const stop = on(EVENTS.seoChanged, () => {
      invalidateSiteSeoIndex();
      load(alive);
    });

    return () => {
      alive.current = false;
      stop();
    };
  }, [load]);

  const refresh = useCallback(() => {
    invalidateSiteSeoIndex();
    load({ current: true });
  }, [load]);

  return { rows, loading, refresh };
}

/**
 * `seoSettings` — the title templates, the separator, the defaults and the site
 * URL every preview in the panel resolves against.
 *
 * @returns {{settings: object, loading: boolean}}
 */
export function useSeoSettings() {
  const [settings, setSettings] = useState(() => settingsCache ?? null);
  const [loading, setLoading] = useState(() => settingsCache === null);

  useEffect(() => {
    let alive = true;

    loadSettings()
      .then((loaded) => {
        if (!alive) return;
        setSettings(loaded);
        setLoading(false);
      })
      .catch((thrown) => {
        if (!isCanceled(thrown) && alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return { settings: settings ?? EMPTY_SETTINGS, loading };
}

/** What the panel resolves against before the settings arrive (§9.5 defaults). */
const EMPTY_SETTINGS = { titleTemplates: {}, defaults: {}, separator: '|' };

export default useSiteSeoIndex;
