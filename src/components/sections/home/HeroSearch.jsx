import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import GlobalSearch from '../../common/GlobalSearch';
import PATHS from '../../../routes/paths';
import styles from './HeroSearch.module.css';
import {
  BEDROOM_OPTIONS,
  HERO_SEARCH_TABS,
  PRICE_BUCKETS_RENT,
  PRICE_BUCKETS_SALE,
} from '../../../config/enums';
import { EVENTS, track } from '../../../utils/analytics';
import { HERO, NAV } from '../../../config/copy';
import { serializeFilters } from '../../../utils/listingFilters';
import { usePropertyTypes } from '../../../hooks/useMasterData';

/**
 * The hero's tabbed search: Buy · Rent · Lease · Commercial · Plots.
 *
 * Each tab is a listing route, and the form is that route's first three
 * filters. Submitting goes to the route with the chosen filters in the query
 * string — `/rent?localityId=4&propertyTypeId=1&bedrooms=2` — which is the same
 * address the listing's own rail would have produced, so the results page, the
 * back button and a shared link all agree (prompt 26).
 *
 * Which tabs appear is `settings.hero.searchTabs`; a single configured tab
 * renders no tab strip at all, because a segmented control with one segment is
 * decoration. A search is **not** a lead, so nothing here writes to
 * `POST /leads` — it sends the `search` event and navigates (§4.1).
 */

/** What each tab searches, and where it goes. */
const TABS = {
  sale: { path: PATHS.buy, segment: 'residential', buckets: PRICE_BUCKETS_SALE, bedrooms: true },
  rent: { path: PATHS.rent, segment: 'residential', buckets: PRICE_BUCKETS_RENT, bedrooms: true },
  lease: { path: PATHS.lease, segment: null, buckets: PRICE_BUCKETS_RENT, bedrooms: false },
  commercial: {
    path: PATHS.commercial,
    segment: 'commercial',
    buckets: PRICE_BUCKETS_SALE,
    bedrooms: false,
    // Commercial space is bought as often as it is leased, and the two are
    // different routes; the toggle picks which one the form submits to.
    intents: [
      { value: 'buy', label: NAV.buy, path: PATHS.commercial, buckets: PRICE_BUCKETS_SALE },
      { value: 'lease', label: NAV.lease, path: PATHS.lease, buckets: PRICE_BUCKETS_RENT },
    ],
  },
  plots: { path: PATHS.plots, segment: 'land', buckets: PRICE_BUCKETS_SALE, bedrooms: false },
};

/** The five tabs, in the enum's order, unless settings names fewer. */
export function resolveTabs(configured) {
  const wanted = Array.isArray(configured) ? configured.filter((tab) => TABS[tab]) : [];
  const values = wanted.length > 0 ? wanted : HERO_SEARCH_TABS.values;
  return values
    .filter((value) => TABS[value])
    .map((value) => ({ value, label: HERO_SEARCH_TABS.labelOf(value) }));
}

/** `"5000000-10000000"` → `{ minPrice, maxPrice }`; an empty value clears both. */
export function budgetToFilters(value) {
  if (!value) return { minPrice: undefined, maxPrice: undefined };
  const [min, max] = String(value).split('-');
  return {
    minPrice: min === '' ? undefined : Number(min),
    maxPrice: max === '' || max === undefined ? undefined : Number(max),
  };
}

/** A bucket list as `<option>`s; the open-ended bucket's value ends in `-`. */
const bucketOptions = (buckets) =>
  buckets.map((bucket) => ({
    value: `${bucket.min}-${bucket.max ?? ''}`,
    label: bucket.label,
  }));

/**
 * The URL one submission produces.
 *
 * Exported because it is the whole contract of this component: the tests
 * assert the address, not the markup.
 *
 * @param {string} tab a `HERO_SEARCH_TABS` value
 * @param {object} draft `{ q, localityId, propertyTypeId, budget, bedrooms, intent }`
 * @returns {string} a path, with a query string when anything was chosen
 */
export function buildSearchUrl(tab, draft = {}) {
  const config = TABS[tab] ?? TABS.sale;
  const intent = config.intents?.find((entry) => entry.value === draft.intent);
  const path = intent?.path ?? config.path;

  const filters = {
    q: draft.q || undefined,
    localityId: draft.localityId ? [String(draft.localityId)] : undefined,
    propertyTypeId: draft.propertyTypeId ? [String(draft.propertyTypeId)] : undefined,
    bedrooms: config.bedrooms && draft.bedrooms?.length > 0 ? draft.bedrooms : undefined,
    ...budgetToFilters(draft.budget),
  };

  const query = new URLSearchParams(serializeFilters(filters)).toString();
  return query ? `${path}?${query}` : path;
}

const EMPTY_DRAFT = {
  q: '',
  localityId: null,
  localityName: '',
  propertyTypeId: '',
  budget: '',
  bedrooms: [],
  intent: 'buy',
};

/**
 * @param {object} props
 * @param {Array<string>} [props.tabs] `settings.hero.searchTabs`
 */
export default function HeroSearch({ tabs }) {
  const navigate = useNavigate();
  const available = useMemo(() => resolveTabs(tabs), [tabs]);
  const [tab, setTab] = useState(available[0]?.value ?? 'sale');
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  // Settings arrive after the first paint; if they drop the tab that is
  // showing, fall back to the first one that survived.
  useEffect(() => {
    if (!available.some((entry) => entry.value === tab)) {
      setTab(available[0]?.value ?? 'sale');
    }
  }, [available, tab]);

  const config = TABS[tab] ?? TABS.sale;
  const intent = config.intents?.find((entry) => entry.value === draft.intent);
  const buckets = intent?.buckets ?? config.buckets;

  const propertyTypes = usePropertyTypes(config.segment ? { segment: config.segment } : undefined);

  const patch = useCallback((changes) => setDraft((previous) => ({ ...previous, ...changes })), []);

  /** Switching tab keeps the words and the place, drops what cannot travel. */
  const chooseTab = (value) => {
    setTab(value);
    setDraft((previous) => ({
      ...previous,
      propertyTypeId: '',
      // The sale and rent scales are two orders of magnitude apart (D90), so a
      // budget never survives a change of tab.
      budget: '',
      bedrooms: TABS[value]?.bedrooms ? previous.bedrooms : [],
      intent: 'buy',
    }));
  };

  const toggleBedroom = (value) =>
    setDraft((previous) => {
      const current = previous.bedrooms;
      const next = current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value];
      return { ...previous, bedrooms: next.sort((left, right) => left - right) };
    });

  /** Track it, then go — a search is a search, never a lead (§4.1). */
  const runSearch = useCallback(
    (values) => {
      track(EVENTS.search, {
        tab,
        q: values.q || undefined,
        localityId: values.localityId ?? undefined,
        propertyTypeId: values.propertyTypeId || undefined,
        bedrooms: values.bedrooms.length > 0 ? values.bedrooms.join(',') : undefined,
      });
      navigate(buildSearchUrl(tab, values));
    },
    [navigate, tab]
  );

  const submit = (event) => {
    event.preventDefault();
    runSearch(draft);
  };

  const tabId = (value) => `hero-tab-${value}`;

  return (
    <div className={styles.card}>
      {available.length > 1 ? (
        <div className={styles.tabs} role="tablist" aria-label={HERO.tabsLabel}>
          {available.map((entry) => (
            <button
              key={entry.value}
              id={tabId(entry.value)}
              type="button"
              role="tab"
              aria-selected={tab === entry.value}
              aria-controls="hero-search-panel"
              className={[styles.tab, tab === entry.value ? styles.tabOn : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => chooseTab(entry.value)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className={styles.form}
        id="hero-search-panel"
        role={available.length > 1 ? 'tabpanel' : undefined}
        aria-labelledby={available.length > 1 ? tabId(tab) : undefined}
        onSubmit={submit}
      >
        <div className={styles.row}>
          <div className={styles.place}>
            <label className={styles.label} htmlFor="hero-search-place">
              Locality or keyword
            </label>
            <GlobalSearch
              variant="inline"
              inputId="hero-search-place"
              placeholder={HERO.searchPlaceholder}
              value={draft.localityName || draft.q}
              // A suggestion picked from the list is a filter, not a search:
              // "Whitefield" becomes `localityId=4` rather than `q=Whitefield`.
              onSelect={(option) => {
                if (option.group?.key !== 'localities') return false;
                patch({ localityId: option.row.id, localityName: option.row.name, q: '' });
                return true;
              }}
              // Enter, a recent search or "Search for …" searches straight away.
              onSearch={(value) => {
                const next = { ...draft, q: value, localityId: null, localityName: '' };
                setDraft(next);
                runSearch(next);
              }}
              onChange={(value) => patch({ q: value, localityId: null, localityName: '' })}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="hero-search-type">
              Property type
            </label>
            <select
              id="hero-search-type"
              className={styles.select}
              value={draft.propertyTypeId}
              onChange={(event) => patch({ propertyTypeId: event.target.value })}
            >
              <option value="">{HERO.anyType}</option>
              {propertyTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="hero-search-budget">
              Budget
            </label>
            <select
              id="hero-search-budget"
              className={styles.select}
              value={draft.budget}
              onChange={(event) => patch({ budget: event.target.value })}
            >
              <option value="">{HERO.anyBudget}</option>
              {bucketOptions(buckets).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className={styles.submit}>
            Search
          </button>
        </div>

        {config.intents ? (
          <div className={styles.extras}>
            <span className={styles.extrasLabel}>I want to</span>
            <div className={styles.intents} role="group" aria-label={HERO.intentLabel}>
              {config.intents.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  className={[styles.pill, draft.intent === entry.value ? styles.pillOn : '']
                    .filter(Boolean)
                    .join(' ')}
                  aria-pressed={draft.intent === entry.value}
                  onClick={() => patch({ intent: entry.value, budget: '' })}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {config.bedrooms ? (
          <div className={styles.extras}>
            <span className={styles.extrasLabel} id="hero-bhk-label">
              Bedrooms
            </span>
            <div className={styles.chips} role="group" aria-labelledby="hero-bhk-label">
              {BEDROOM_OPTIONS.entries.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  className={[
                    styles.pill,
                    draft.bedrooms.includes(entry.value) ? styles.pillOn : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-pressed={draft.bedrooms.includes(entry.value)}
                  onClick={() => toggleBedroom(entry.value)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
