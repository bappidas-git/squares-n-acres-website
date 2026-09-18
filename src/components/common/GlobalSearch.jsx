import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useLocation, useNavigate } from 'react-router-dom';

import PATHS from '../../routes/paths';
import propertyService from '../../services/propertyService';
import storage from '../../utils/storage';
import styles from './GlobalSearch.module.css';
import useDebounce from '../../hooks/useDebounce';
import { EVENTS, track } from '../../utils/analytics';
import { LISTING, fill } from '../../config/copy';
import { formatPrice } from '../../utils/format';
import { isCanceled } from '../../services/apiError';

/**
 * The one search box of the site: the hero's, the header's and the listing's.
 *
 * It asks `GET /properties/suggestions` (§5.14), which answers four groups, so
 * typing "hebbal" offers the **locality page** before it offers a listing in
 * it — the boilerplate's box only ever offered individual properties, which is
 * why a visitor looking for a neighbourhood had to guess a URL (BUG-18).
 *
 * The last five searches are kept in `sna_recent_searches` and shown while the
 * box is empty, so returning to the site costs no typing.
 */

/** Where the last searches are remembered (§4.2). */
export const RECENT_KEY = 'sna_recent_searches';

const RECENT_LIMIT = 5;
const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;

/** The groups, in the order the popover shows them. */
const GROUPS = [
  {
    key: 'localities',
    label: LISTING.groups.localities,
    icon: 'mdi:map-marker-outline',
    to: (row) => PATHS.locality(row.slug),
    primary: (row) => row.name,
    secondary: (row) =>
      row.propertyCount
        ? `${row.propertyCount} propert${row.propertyCount === 1 ? 'y' : 'ies'}`
        : '',
  },
  {
    key: 'properties',
    label: LISTING.groups.properties,
    icon: 'mdi:home-outline',
    to: (row) => PATHS.propertyDetails(row.slug),
    primary: (row) => row.title,
    secondary: (row) => row.localityName || '',
    trailing: (row) => (row.price ? formatPrice(row.price) : ''),
  },
  {
    key: 'propertyTypes',
    label: LISTING.groups.propertyTypes,
    icon: 'mdi:home-city-outline',
    to: (row, { rentContext }) =>
      rentContext ? PATHS.rentType(row.slug) : PATHS.buyType(row.slug),
    primary: (row) => row.name,
    secondary: () => '',
  },
  {
    key: 'developers',
    label: LISTING.groups.developers,
    icon: 'mdi:domain',
    to: (row) => PATHS.builder(row.slug),
    primary: (row) => row.name,
    secondary: () => '',
  },
];

/** The five most recent searches, newest first. */
export function readRecentSearches() {
  const stored = storage.getItem(RECENT_KEY, []);
  return Array.isArray(stored)
    ? stored.filter((entry) => typeof entry === 'string' && entry.trim()).slice(0, RECENT_LIMIT)
    : [];
}

/** Remembers one search, moving a repeat back to the top. */
export function rememberSearch(term) {
  const value = String(term ?? '').trim();
  if (value.length < MIN_QUERY) return readRecentSearches();

  const next = [value, ...readRecentSearches().filter((entry) => entry !== value)].slice(
    0,
    RECENT_LIMIT
  );
  storage.setItem(RECENT_KEY, next);
  return next;
}

/**
 * @param {object} props
 * @param {'default'|'hero'|'compact'|'inline'} [props.variant] `inline` is the
 *   hero form's field: no wrapper `<form>` (a form inside a form is invalid
 *   markup) and no submit button, because the host owns both
 * @param {string} [props.value] the term the page is already showing
 * @param {string} [props.inputId] ties the box to the host's visible `<label>`
 * @param {(q: string) => void} [props.onSearch] handled in place of navigating
 * @param {(q: string) => void} [props.onChange] every keystroke, for a host
 *   that keeps the term in its own state
 * @param {(option: {group: object, row: object, to: string}) => boolean|void}
 *   [props.onSelect] offered a suggestion before it is followed; returning
 *   `true` means the host consumed it — the hero turns a locality into
 *   `localityId` rather than navigating to its page
 * @param {boolean} [props.autoFocus]
 * @param {() => void} [props.onNavigate] called after a suggestion is followed
 */
export default function GlobalSearch({
  variant = 'default',
  value = '',
  inputId,
  onSearch,
  onChange,
  onSelect,
  autoFocus = false,
  placeholder = LISTING.searchPlaceholder,
  onNavigate,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const listId = useId();

  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState(null);
  const [recent, setRecent] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const inline = variant === 'inline';
  const term = query.trim();
  const debounced = useDebounce(term, DEBOUNCE_MS);

  // The page owns the term on a listing route: removing the search chip has to
  // empty the box as well.
  useEffect(() => setQuery(value), [value]);

  useEffect(() => setRecent(readRecentSearches()), []);

  // Focused from code rather than with `autoFocus`, so the header's modal can
  // hand the caret over without the attribute stealing it on every re-render.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (debounced.length < MIN_QUERY) {
      setSuggestions(null);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);

    propertyService
      .suggestions(debounced, { signal: controller.signal })
      .then(({ data }) => {
        setSuggestions(data ?? null);
        setHighlight(-1);
        setLoading(false);
      })
      .catch((error) => {
        if (isCanceled(error)) return;
        setSuggestions(null);
        setLoading(false);
      });

    return () => controller.abort();
  }, [debounced]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const rentContext = location.pathname.startsWith(PATHS.rent);

  /** Every row the popover can reach, flattened for the arrow keys. */
  const options = useMemo(() => {
    if (term.length < MIN_QUERY) {
      return recent.map((entry) => ({ kind: 'recent', term: entry }));
    }

    const rows = GROUPS.flatMap((group) =>
      (suggestions?.[group.key] ?? []).map((row) => ({
        kind: 'suggestion',
        group,
        row,
        to: group.to(row, { rentContext }),
      }))
    );

    return [...rows, { kind: 'query', term }];
  }, [term, recent, suggestions, rentContext]);

  const runSearch = useCallback(
    (text) => {
      const wanted = String(text ?? '').trim();
      setOpen(false);
      if (wanted) {
        setRecent(rememberSearch(wanted));
        track(EVENTS.search, { q: wanted });
      }
      setQuery(wanted);

      if (onSearch) onSearch(wanted);
      else
        navigate(wanted ? `${PATHS.properties}?q=${encodeURIComponent(wanted)}` : PATHS.properties);
    },
    [navigate, onSearch]
  );

  const choose = useCallback(
    (option) => {
      if (!option) return;
      if (option.kind === 'recent' || option.kind === 'query') {
        runSearch(option.term);
        return;
      }

      setOpen(false);
      setRecent(rememberSearch(term));
      track(EVENTS.search, { q: term, target: option.group.key });

      // A host may keep the suggestion instead of following it.
      if (onSelect?.(option) === true) return;

      navigate(option.to);
      onNavigate?.();
    },
    [navigate, onNavigate, onSelect, runSearch, term]
  );

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!open) setOpen(true);
      if (options.length === 0) return;
      event.preventDefault();
      setHighlight((index) => {
        if (event.key === 'ArrowDown') return index < options.length - 1 ? index + 1 : 0;
        return index > 0 ? index - 1 : options.length - 1;
      });
      return;
    }
    if (event.key === 'Enter') {
      if (open && highlight >= 0) {
        event.preventDefault();
        choose(options[highlight]);
        return;
      }
      // Without a wrapping `<form>` there is nothing to submit, so the inline
      // variant runs the search itself.
      if (inline) {
        event.preventDefault();
        runSearch(query);
      }
    }
  };

  const showPopover = open && options.length > 0;
  /** How many real suggestions the popover has, the query row aside. */
  const suggestionCount = options.filter((option) => option.kind === 'suggestion').length;
  const optionId = (position) => `${listId}-option-${position}`;
  const Field = inline ? 'div' : 'form';

  // The rows are numbered in the order `options` holds them, so the arrow keys
  // and the mouse address exactly the same list.
  const queryIndex = options.length - 1;
  let index = -1;

  return (
    <div className={[styles.search, styles[variant]].filter(Boolean).join(' ')} ref={wrapperRef}>
      <Field
        className={styles.form}
        role="search"
        onSubmit={
          inline
            ? undefined
            : (event) => {
                event.preventDefault();
                runSearch(query);
              }
        }
      >
        <Icon icon="mdi:magnify" className={styles.icon} aria-hidden="true" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className={styles.input}
          value={query}
          placeholder={placeholder}
          // A host that renders a visible `<label>` owns the accessible name.
          aria-label={inputId ? undefined : LISTING.searchLabel}
          autoComplete="off"
          role="combobox"
          aria-expanded={showPopover}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={highlight >= 0 ? optionId(highlight) : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlight(-1);
            onChange?.(event.target.value);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
        {variant === 'compact' || inline ? null : (
          <button type="submit" className={styles.submit}>
            {LISTING.search}
          </button>
        )}
      </Field>

      {showPopover ? (
        <ul
          className={styles.popover}
          id={listId}
          role="listbox"
          aria-label={LISTING.suggestionsLabel}
        >
          {term.length < MIN_QUERY ? (
            <>
              <li className={styles.groupLabel} role="presentation">
                {LISTING.recentSearches}
              </li>
              {recent.map((entry) => {
                index += 1;
                const current = index;
                return (
                  <li
                    key={entry}
                    id={optionId(current)}
                    className={[styles.row, highlight === current ? styles.rowOn : '']
                      .filter(Boolean)
                      .join(' ')}
                    role="option"
                    aria-selected={highlight === current}
                    onMouseEnter={() => setHighlight(current)}
                    onClick={() => runSearch(entry)}
                  >
                    <Icon icon="mdi:history" className={styles.rowIcon} aria-hidden="true" />
                    <span className={styles.rowMain}>{entry}</span>
                  </li>
                );
              })}
            </>
          ) : (
            <>
              {/* Nothing came back, so the popover says so rather than
                  offering the raw search as if it were a result (§4.1). */}
              {suggestionCount === 0 && !loading ? (
                <li className={styles.groupLabel} role="presentation">
                  {LISTING.noMatches}
                </li>
              ) : null}

              {GROUPS.map((group) => {
                const rows = suggestions?.[group.key] ?? [];
                if (rows.length === 0) return null;

                return (
                  <Fragment key={group.key}>
                    <li className={styles.groupLabel} role="presentation">
                      {group.label}
                    </li>
                    {rows.map((row) => {
                      index += 1;
                      const current = index;
                      const secondary = group.secondary(row);
                      const trailing = group.trailing?.(row);

                      return (
                        <li
                          key={`${group.key}-${row.id}`}
                          id={optionId(current)}
                          className={[styles.row, highlight === current ? styles.rowOn : '']
                            .filter(Boolean)
                            .join(' ')}
                          role="option"
                          aria-selected={highlight === current}
                          onMouseEnter={() => setHighlight(current)}
                          onClick={() => choose(options[current])}
                        >
                          <Icon icon={group.icon} className={styles.rowIcon} aria-hidden="true" />
                          <span className={styles.rowMain}>
                            <span className={styles.rowTitle}>{group.primary(row)}</span>
                            {secondary ? <span className={styles.rowMeta}>{secondary}</span> : null}
                          </span>
                          {trailing ? <span className={styles.rowTrailing}>{trailing}</span> : null}
                        </li>
                      );
                    })}
                  </Fragment>
                );
              })}

              <li
                id={optionId(queryIndex)}
                className={[
                  styles.row,
                  styles.rowQuery,
                  highlight === queryIndex ? styles.rowOn : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="option"
                aria-selected={highlight === queryIndex}
                onMouseEnter={() => setHighlight(queryIndex)}
                onClick={() => runSearch(term)}
              >
                <Icon icon="mdi:magnify" className={styles.rowIcon} aria-hidden="true" />
                <span className={styles.rowMain}>{fill(LISTING.searchFor, { term })}</span>
              </li>
            </>
          )}
        </ul>
      ) : null}
    </div>
  );
}
