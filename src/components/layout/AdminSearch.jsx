import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';

import IconButton from '../ui/IconButton';
import PATHS from '../../routes/paths';
import articleService from '../../services/articleService';
import leadService from '../../services/leadService';
import propertyService from '../../services/propertyService';
import useDebounce from '../../hooks/useDebounce';
import useListboxNavigation from '../../hooks/useListboxNavigation';
import { ARTICLE_STATUS, LEAD_STATUS } from '../../config/enums';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

import styles from './AdminSearch.module.css';

/** What a query must be before it is sent. */
const MIN_LENGTH = 2;

/** Records per list — the lists' own "See all" has the rest. */
const PER_GROUP = 5;

/**
 * A query that is a telephone number, however it was typed — "+91 98765
 * 00100", "98765-00100" — as the digits a lead stores: the last ten.
 *
 * @param {string} q
 * @returns {string} the digits, or `q` as it was when it is not a number
 */
export function phoneQuery(q) {
  if (!/^[\d\s+\-().]+$/.test(q)) return q;
  const digits = q.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/** Where each list is searched, and how a record of it reads in the results. */
const SOURCES = [
  {
    key: 'leads',
    label: 'Leads',
    area: 'leads',
    search: (q, signal) =>
      leadService.adminList({ q: phoneQuery(q), perPage: PER_GROUP }, { signal }),
    option: (lead) => ({
      label: lead.name || 'Unnamed lead',
      detail: [
        lead.phone,
        lead.property?.title ?? lead.propertySnapshot?.title,
        LEAD_STATUS.labelOf(lead.status),
      ]
        .filter(Boolean)
        .join(' · '),
      to: PATHS.adminLead(lead.id),
    }),
    all: (q) => `${PATHS.adminLeads}?q=${encodeURIComponent(phoneQuery(q))}`,
  },
  {
    key: 'properties',
    label: 'Properties',
    area: 'properties',
    search: (q, signal) => propertyService.adminList({ q, perPage: PER_GROUP }, { signal }),
    option: (property) => ({
      label: property.title || 'Untitled listing',
      detail: [property.location?.locality?.name, property.isActive ? 'Live' : 'Not live']
        .filter(Boolean)
        .join(' · '),
      to: PATHS.adminPropertyEdit(property.id),
    }),
    all: (q) => `${PATHS.adminProperties}?q=${encodeURIComponent(q)}`,
  },
  {
    key: 'articles',
    label: 'Articles',
    area: 'articles',
    search: (q, signal) => articleService.adminList({ q, perPage: PER_GROUP }, { signal }),
    option: (article) => ({
      label: article.title || 'Untitled article',
      detail: ARTICLE_STATUS.labelOf(article.status),
      to: PATHS.adminArticleEdit(article.id),
    }),
    all: (q) => `${PATHS.adminArticles}?q=${encodeURIComponent(q)}`,
  },
];

/** Whether a key press belongs to a field — `/` typed into a box is a slash. */
const isTyping = (target) =>
  Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"], [role="textbox"]'));

/**
 * The admin's quick search (prompt 51): one box in the top bar, `/` from
 * anywhere to reach it. What is typed is looked for in the leads, the
 * properties and the articles the user may see — five of each, through the
 * lists' own endpoints, so a sales user's search finds only their own leads
 * and the unassigned ones, as their list does. A telephone number finds its
 * lead however it was typed.
 *
 * The keyboard is every combobox's (`useListboxNavigation`): arrows move
 * through the records and the lists' "See all" rows, Enter opens, Escape
 * closes. Enter with nothing highlighted opens the first record.
 *
 * @param {object} props
 * @param {boolean} [props.compact] a phone's top bar: an icon that opens the box
 */
export default function AdminSearch({ compact = false }) {
  const navigate = useNavigate();
  const { can } = useAdminAuth();
  const id = useId();
  const listboxId = `${id}-results`;
  const inputRef = useRef(null);
  const rootRef = useRef(null);

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const [state, setState] = useState({ status: 'idle', query: '', groups: [] });

  const query = useDebounce(q.trim(), 250);
  // Which lists this user may see, as a word: `can` is a new function whenever
  // the session changes, and the search must not run again for that alone.
  const allowed = SOURCES.filter((source) => typeof can === 'function' && can(source.area, 'view'))
    .map((source) => source.key)
    .join(',');
  const sources = useMemo(
    () => SOURCES.filter((source) => allowed.split(',').includes(source.key)),
    [allowed]
  );

  // `/` from anywhere but a field puts the cursor in the box.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(event.target)) return;
      event.preventDefault();
      setExpanded(true);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // On a phone the box opens from its icon, with the cursor in it.
  useEffect(() => {
    if (compact && expanded) inputRef.current?.focus();
  }, [compact, expanded]);

  // One query, three lists at once; the answer to an older query is dropped.
  useEffect(() => {
    if (query.length < MIN_LENGTH || sources.length === 0) {
      setState((previous) =>
        previous.status === 'idle' && previous.query === query
          ? previous
          : { status: 'idle', query, groups: [] }
      );
      return undefined;
    }
    const controller = new AbortController();
    setState((previous) => ({ ...previous, status: 'loading', query }));
    Promise.allSettled(sources.map((source) => source.search(query, controller.signal))).then(
      (answers) => {
        if (controller.signal.aborted) return;
        const groups = sources.map((source, index) => {
          const answer = answers[index];
          if (answer.status !== 'fulfilled') return { source, failed: true, rows: [], total: 0 };
          const rows = Array.isArray(answer.value?.data) ? answer.value.data : [];
          return {
            source,
            failed: false,
            rows: rows.map(source.option),
            total: answer.value?.meta?.total ?? rows.length,
          };
        });
        setState({
          status: groups.every((group) => group.failed) ? 'error' : 'done',
          query,
          groups,
        });
      }
    );
    return () => controller.abort();
  }, [query, sources]);

  // The keyboard walks one flat list: each group's records, then its "See all".
  // Each entry keeps its place in it, which is what its option id is made of.
  const { sections, options } = useMemo(() => {
    const flat = [];
    const drawn = state.groups
      .filter((group) => group.rows.length > 0)
      .map((group) => {
        const entries = [
          ...group.rows,
          {
            label: `See all ${group.total} ${group.source.label.toLowerCase()}`,
            to: group.source.all(state.query),
            seeAll: true,
          },
        ].map((entry) => {
          const option = { ...entry, index: flat.length };
          flat.push(option);
          return option;
        });
        return { key: group.source.key, label: group.source.label, entries };
      });
    return { sections: drawn, options: flat };
  }, [state.groups, state.query]);

  const close = useCallback(() => {
    setOpen(false);
    if (compact) setExpanded(false);
  }, [compact]);

  const go = useCallback(
    (option) => {
      if (!option) return;
      setQ('');
      close();
      inputRef.current?.blur();
      navigate(option.to);
    },
    [close, navigate]
  );

  const showing = open && q.trim().length >= MIN_LENGTH;
  const nav = useListboxNavigation({
    id: listboxId,
    options,
    open: showing,
    onPick: go,
    onClose: close,
    resetKey: state.query,
  });

  const onKeyDown = (event) => {
    // Enter with nothing highlighted opens the first record found.
    if (event.key === 'Enter' && showing && nav.activeIndex === -1 && options.length > 0) {
      event.preventDefault();
      go(options[0]);
      return;
    }
    nav.onKeyDown(event);
  };

  // Leaving the search — a click anywhere else, or Tab — closes the results.
  const onBlur = (event) => {
    if (rootRef.current?.contains(event.relatedTarget)) return;
    close();
  };

  if (sources.length === 0) return null;

  if (!expanded) {
    return (
      <IconButton label="Search leads, properties and articles" onClick={() => setExpanded(true)}>
        <Icon icon="mdi:magnify" width={22} height={22} />
      </IconButton>
    );
  }

  return (
    <div
      ref={rootRef}
      className={[styles.search, compact ? styles.compact : ''].filter(Boolean).join(' ')}
      onBlur={onBlur}
    >
      <Icon icon="mdi:magnify" width={18} height={18} aria-hidden="true" className={styles.icon} />
      <input
        ref={inputRef}
        type="search"
        className={styles.input}
        placeholder="Search leads, listings, articles"
        aria-label="Search leads, properties and articles"
        aria-keyshortcuts="/"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showing}
        aria-controls={listboxId}
        aria-activedescendant={nav.activeDescendant}
        autoComplete="off"
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {compact ? null : (
        <kbd className={styles.hint} aria-hidden="true">
          /
        </kbd>
      )}

      <div
        id={listboxId}
        role="listbox"
        aria-label="Search results"
        className={styles.results}
        hidden={!showing}
      >
        {state.status === 'loading' && options.length === 0 ? (
          <p className={styles.note} role="status">
            Searching…
          </p>
        ) : null}
        {state.status === 'error' ? (
          <p className={styles.note} role="status">
            The search could not be run. Try again in a moment.
          </p>
        ) : null}
        {state.status === 'done' && options.length === 0 ? (
          <p className={styles.note} role="status">
            Nothing matches “{state.query}”.
          </p>
        ) : null}
        {sections.map((section) => (
          <div key={section.key} role="group" aria-label={section.label}>
            <p className={styles.groupLabel} aria-hidden="true">
              {section.label}
            </p>
            {section.entries.map((entry) => (
              <Link
                key={entry.to}
                id={nav.optionId(entry.index)}
                to={entry.to}
                role="option"
                aria-selected={entry.index === nav.activeIndex}
                tabIndex={-1}
                className={[styles.option, entry.seeAll ? styles.seeAll : '']
                  .filter(Boolean)
                  .join(' ')}
                data-active={entry.index === nav.activeIndex || undefined}
                // The box keeps the focus: a click is a pick, not a blur.
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.preventDefault();
                  go(entry);
                }}
              >
                <span className={styles.optionLabel}>{entry.label}</span>
                {entry.detail ? <span className={styles.optionDetail}>{entry.detail}</span> : null}
              </Link>
            ))}
          </div>
        ))}
        {state.groups.some((group) => group.failed) && state.status === 'done' ? (
          <p className={styles.note}>
            {state.groups
              .filter((group) => group.failed)
              .map((group) => group.source.label)
              .join(' and ')}{' '}
            could not be searched just now.
          </p>
        ) : null}
      </div>
    </div>
  );
}
