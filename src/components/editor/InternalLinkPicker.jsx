import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import PATHS from '../../routes/paths';
import Tabs from '../ui/Tabs';
import articleService from '../../services/articleService';
import masterDataService from '../../services/masterDataService';
import pageService from '../../services/pageService';
import propertyService from '../../services/propertyService';
import useDebounce from '../../hooks/useDebounce';
import { TextField } from '../ui/FormField';
import { isCanceled } from '../../services/apiError';

import styles from './RichTextEditor.module.css';

/** How many suggestions one search asks for. */
const PER_PAGE = 8;

/**
 * The four things a body of prose links to, and where each one lives.
 *
 * The path comes from `paths.js` rather than from the record, so a link written
 * today still points at the right URL after a route is renamed (§4.2).
 */
const SOURCES = [
  {
    value: 'properties',
    label: 'Listings',
    icon: 'mdi:home-city-outline',
    search: (params, options) => propertyService.adminList(params, options),
    title: (record) => record.title,
    path: (record) => PATHS.propertyDetails(record.slug),
  },
  {
    value: 'localities',
    label: 'Localities',
    icon: 'mdi:map-marker-outline',
    search: (params, options) => masterDataService.localities.adminList(params, options),
    title: (record) => record.name,
    path: (record) => PATHS.locality(record.slug),
  },
  {
    value: 'articles',
    label: 'Articles',
    icon: 'mdi:newspaper-variant-outline',
    search: (params, options) => articleService.adminList(params, options),
    title: (record) => record.title,
    path: (record) => PATHS.article(record.slug),
  },
  {
    value: 'pages',
    label: 'Pages',
    icon: 'mdi:file-document-outline',
    search: (params, options) => pageService.adminList(params, options),
    title: (record) => record.title,
    path: (record) => PATHS.page(record.slug),
  },
];

/**
 * Searches the panel for something to link to and answers with its public URL.
 *
 * A writer linking to a locality guide should not have to leave the editor,
 * open the panel in another tab and copy a path out of the address bar — that
 * is how `/localites/whitefield` gets published.
 *
 * @param {object} props
 * @param {(link: {href: string, text: string}) => void} props.onPick
 */
export default function InternalLinkPicker({ onPick }) {
  const [tab, setTab] = useState(SOURCES[0].value);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [state, setState] = useState('idle');

  const debounced = useDebounce(query, 300);
  const source = useMemo(() => SOURCES.find((entry) => entry.value === tab) ?? SOURCES[0], [tab]);

  useEffect(() => {
    const term = debounced.trim();
    if (term.length === 0) {
      setResults([]);
      setState('idle');
      return undefined;
    }

    const controller = new AbortController();
    setState('loading');

    source
      .search({ q: term, perPage: PER_PAGE }, { signal: controller.signal })
      .then((envelope) => {
        setResults(Array.isArray(envelope?.data) ? envelope.data : []);
        setState('ready');
      })
      .catch((thrown) => {
        if (isCanceled(thrown)) return;
        setResults([]);
        setState('error');
      });

    return () => controller.abort();
  }, [debounced, source]);

  return (
    <div className={styles.picker}>
      <Tabs
        items={SOURCES.map((entry) => ({ value: entry.value, label: entry.label }))}
        value={tab}
        variant="pills"
        label="What to link to"
        onChange={(next) => {
          setTab(next);
          setResults([]);
          setState('idle');
        }}
      />

      <TextField
        label={`Search ${source.label.toLowerCase()}`}
        value={query}
        placeholder="Type at least a word…"
        onChange={(event) => setQuery(event.target.value)}
      />

      {state === 'error' ? (
        <p className={styles.pickerNote} role="alert">
          The search did not answer. Try again.
        </p>
      ) : null}

      {state === 'loading' ? <p className={styles.pickerNote}>Searching…</p> : null}

      {state === 'ready' && results.length === 0 ? (
        <p className={styles.pickerNote}>Nothing matches “{debounced.trim()}”.</p>
      ) : null}

      {results.length > 0 ? (
        <ul className={styles.pickerList}>
          {results.map((record) => {
            const href = source.path(record);
            return (
              <li key={record.id}>
                <button
                  type="button"
                  className={styles.pickerItem}
                  onClick={() => onPick({ href, text: source.title(record) ?? href })}
                >
                  <Icon icon={source.icon} width="18" height="18" aria-hidden="true" />
                  <span className={styles.pickerItemText}>
                    <span className={styles.pickerItemTitle}>{source.title(record)}</span>
                    <span className={styles.pickerItemPath}>{href}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
