import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import Chip from '../ui/Chip';
import SortableList from './SortableList';
import { isCanceled } from '../../services/apiError';

import styles from './EntityPicker.module.css';

/** How many rows the search asks the API for (§5.6). */
const SUGGESTION_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const sameId = (left, right) => String(left) === String(right);

/**
 * Picks related records by searching for them — similar properties, the
 * testimonials of a page, the team members of a block.
 *
 * It searches the API rather than a preloaded list, because the lists it picks
 * from are the ones too long to preload; what it stores is ids, which is what a
 * write sends (§5.5). `orderable` keeps the order the admin drags them into —
 * `similarPropertyIds` is an ordered field (BUG-07).
 *
 * @param {object} props
 * @param {(params: {q: string, perPage: number}, opts: {signal: AbortSignal}) =>
 *   Promise<{data: Array<object>}>} props.fetcher a service `list`
 * @param {string} [props.labelKey] the field to show, default `name`
 * @param {Array<string|number>|string|number|null} props.value
 * @param {(value: Array<string|number>|string|number|null) => void} props.onChange
 * @param {boolean} [props.multiple]
 * @param {number} [props.max]
 * @param {(record: object) => React.ReactNode} [props.renderOption]
 * @param {(record: object, index: number) => React.ReactNode} [props.renderSelected] a chosen row,
 *   for the pickers whose choices are cards rather than a name (similar properties)
 * @param {boolean} [props.orderable] drag the chosen records into order
 * @param {Array<object>} [props.selectedRecords] known records for the current ids
 * @param {React.ReactNode} [props.action] rendered beside the search box
 * @param {boolean} [props.showChosen] `false` for a filter: the choice is not
 *   repeated as a chip under the box — the filter bar already lists it among its
 *   own chips, and one more line under one control put the row out of line — and
 *   a single choice reads in the empty box instead (QA-53)
 */
export default function EntityPicker({
  label = 'Records',
  labelClassName = '',
  fieldClassName = '',
  fetcher,
  labelKey = 'name',
  value,
  onChange,
  multiple = true,
  max,
  renderOption,
  renderSelected,
  orderable = false,
  selectedRecords = [],
  placeholder = 'Search…',
  hint,
  error,
  action,
  disabled = false,
  showChosen = true,
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  // Every record this picker has ever shown, so a chosen id keeps its label
  // after the search box is cleared and the results are gone.
  const knownRef = useRef(new Map());
  selectedRecords.forEach((record) => knownRef.current.set(String(record.id), record));
  results.forEach((record) => knownRef.current.set(String(record.id), record));

  const ids = useMemo(() => {
    const raw = multiple
      ? Array.isArray(value)
        ? value
        : []
      : value === null || value === undefined
        ? []
        : [value];

    // A repeated id is never what an editor meant, and it is not something the
    // list below can draw: `SortableList` and the chip row both key on the id,
    // so two of them collide and React keeps only the first — a row that
    // disappears on the next reorder (NEW-38). `add()` refuses a duplicate it
    // is asked for, but a value that arrives from outside — a record saved by
    // an older build, a paste into the form state — has never been through it.
    // First occurrence wins, so the editor's order survives.
    const seen = new Set();
    return raw.filter((entry) => {
      const key = String(entry);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [multiple, value]);

  const full = typeof max === 'number' && ids.length >= max;

  useEffect(() => {
    if (!fetcher || query.trim().length === 0) {
      setResults([]);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      fetcher({ q: query.trim(), perPage: SUGGESTION_PER_PAGE }, { signal: controller.signal })
        .then((envelope) => {
          setResults(Array.isArray(envelope?.data) ? envelope.data : []);
          setSearching(false);
        })
        .catch((thrown) => {
          if (isCanceled(thrown)) return;
          setResults([]);
          setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, fetcher]);

  const emit = useCallback(
    (next) => onChange?.(multiple ? next : (next[0] ?? null)),
    [multiple, onChange]
  );

  const add = (record) => {
    if (ids.some((entry) => sameId(entry, record.id))) return;
    emit(multiple ? (full ? ids : [...ids, record.id]) : [record.id]);
    setQuery('');
    setOpen(false);
  };

  const remove = (recordId) => emit(ids.filter((entry) => !sameId(entry, recordId)));

  const labelOf = (recordId) => {
    const record = knownRef.current.get(String(recordId));
    return record?.[labelKey] ?? record?.title ?? record?.name ?? `#${recordId}`;
  };

  const chosen = ids.map((entry) => ({
    id: entry,
    label: labelOf(entry),
    record: knownRef.current.get(String(entry)) ?? null,
  }));

  // Without its chips, a single choice is what the empty box says.
  const shownPlaceholder =
    !showChosen && !multiple && chosen.length > 0 ? chosen[0].label : placeholder;

  return (
    <div className={[styles.field, fieldClassName].filter(Boolean).join(' ')}>
      <label className={[styles.label, labelClassName].filter(Boolean).join(' ')} htmlFor={id}>
        {label}
        {typeof max === 'number' ? (
          <span className={styles.counter}>
            {ids.length}/{max}
          </span>
        ) : null}
      </label>

      <div className={styles.searchBox}>
        <Icon
          icon="mdi:magnify"
          width="18"
          height="18"
          className={styles.searchIcon}
          aria-hidden="true"
        />
        <input
          id={id}
          type="search"
          role="combobox"
          className={styles.input}
          value={query}
          placeholder={shownPlaceholder}
          disabled={disabled || (full && !multiple)}
          aria-expanded={open && results.length > 0}
          aria-controls={`${id}-results`}
          aria-autocomplete="list"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        />
        {searching ? <span className={styles.searching}>Searching…</span> : null}
      </div>

      {action ? <div className={styles.action}>{action}</div> : null}

      {open && query.trim() && !searching ? (
        <ul className={styles.results} id={`${id}-results`} role="listbox">
          {results.length === 0 ? (
            <li className={styles.noResults}>No matches for “{query.trim()}”.</li>
          ) : (
            results.map((record) => {
              const already = ids.some((entry) => sameId(entry, record.id));
              return (
                <li key={record.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={already}
                    className={styles.result}
                    disabled={already || (full && multiple)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => add(record)}
                  >
                    {renderOption ? renderOption(record) : (record[labelKey] ?? record.title)}
                    {already ? <span className={styles.already}>Added</span> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}

      {showChosen && chosen.length > 0 ? (
        orderable ? (
          <SortableList
            items={chosen}
            getId={(item) => item.id}
            getLabel={(item) => item.label}
            label={`${label}, in order`}
            disabled={disabled}
            onReorder={(next) => emit(next.map((item) => item.id))}
            renderItem={(item, index) => (
              <span className={styles.orderedRow}>
                {renderSelected ? (
                  renderSelected(item.record ?? { id: item.id }, index)
                ) : (
                  <span>{item.label}</span>
                )}
                <button
                  type="button"
                  className={styles.remove}
                  disabled={disabled}
                  aria-label={`Remove ${item.label}`}
                  onClick={() => remove(item.id)}
                >
                  Remove
                </button>
              </span>
            )}
          />
        ) : (
          <div className={styles.chips}>
            {chosen.map((item) => (
              <Chip
                key={item.id}
                tone="primary"
                onDelete={disabled ? undefined : () => remove(item.id)}
                deleteLabel={`Remove ${item.label}`}
              >
                {item.label}
              </Chip>
            ))}
          </div>
        )
      ) : null}

      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className={styles.hint}>{hint}</span>
      ) : null}
    </div>
  );
}
