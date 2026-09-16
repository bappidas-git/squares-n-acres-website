import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import Popover from '@mui/material/Popover';

import Button from '../ui/Button';
import Chip from '../ui/Chip';
import IconButton from '../ui/IconButton';
import MultiSelect from './MultiSelect';
import useBreakpoint from '../../hooks/useBreakpoint';

import styles from './FilterBar.module.css';

/** How long the search box waits before it changes the view (§4.2). */
export const SEARCH_DEBOUNCE_MS = 400;

const isSet = (value) =>
  value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length);

/**
 * The filter row above an admin table.
 *
 * Search first and always visible; the rest sit beside it on a laptop and
 * behind a "More filters" popover below 900 px. Whatever is active is repeated
 * as a removable chip, so a filter can never be on without being visible
 * (NEW-05).
 *
 * The values live wherever the caller keeps them — `useApiList` with
 * `syncToUrl` in practice — and come back through `onChange(patch)`.
 *
 * @param {object} props
 * @param {Array<{key: string, type: 'search'|'select'|'multiselect'|'daterange'|'toggle'|'number-range',
 *   label: string, options?: Array<{value: string|number, label: string}>,
 *   placeholder?: string, width?: string}>} props.fields
 * @param {object} props.values
 * @param {(patch: object) => void} props.onChange
 * @param {() => void} [props.onReset]
 * @param {number} [props.activeCount] overrides the computed count
 * @param {React.ReactNode} [props.children] extra controls, right-aligned
 */
export default function FilterBar({
  fields = [],
  values = {},
  onChange,
  onReset,
  activeCount,
  children,
}) {
  const { isMobile } = useBreakpoint();
  const [popover, setPopover] = useState(null);

  const searchField = fields.find((field) => field.type === 'search');
  const rest = useMemo(() => fields.filter((field) => field.type !== 'search'), [fields]);

  const chips = useMemo(() => buildChips(fields, values), [fields, values]);
  const count = activeCount ?? chips.length;

  const controls = rest.map((field) => (
    <FilterControl key={field.key} field={field} values={values} onChange={onChange} />
  ));

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        {searchField ? (
          <SearchInput
            field={searchField}
            value={values[searchField.key] ?? ''}
            onChange={onChange}
          />
        ) : null}

        {isMobile ? (
          rest.length > 0 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={<Icon icon="mdi:filter-variant" width="18" height="18" />}
                onClick={(event) => setPopover(event.currentTarget)}
                aria-haspopup="dialog"
              >
                More filters{count > 0 ? ` (${count})` : ''}
              </Button>
              <Popover
                open={Boolean(popover)}
                anchorEl={popover}
                onClose={() => setPopover(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                slotProps={{ paper: { className: styles.popover } }}
              >
                <div className={styles.popoverBody} role="dialog" aria-label="Filters">
                  {controls}
                </div>
              </Popover>
            </>
          ) : null
        ) : (
          controls
        )}

        {children ? <div className={styles.extra}>{children}</div> : null}

        {count > 0 && onReset ? (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset
          </Button>
        ) : null}
      </div>

      {chips.length > 0 ? (
        <div className={styles.chips}>
          {chips.map((chip) => (
            <Chip
              key={`${chip.key}:${chip.value}`}
              tone="primary"
              onDelete={() => onChange?.(chip.clear)}
              deleteLabel={`Remove filter ${chip.label}`}
            >
              {chip.label}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The search box.
 *
 * It types locally and reports after {@link SEARCH_DEBOUNCE_MS}: with the
 * filters synced to the URL, propagating a keystroke at a time would leave one
 * history entry — and one request — per letter.
 */
function SearchInput({ field, value, onChange }) {
  const id = useId();
  const [text, setText] = useState(value);
  const committed = useRef(value);

  // A reset, a back button or a shared link changes the value from outside.
  useEffect(() => {
    if (value === committed.current) return;
    committed.current = value;
    setText(value);
  }, [value]);

  useEffect(() => {
    if (text === committed.current) return undefined;
    const timer = setTimeout(() => {
      committed.current = text;
      onChange?.({ [field.key]: text || undefined });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, field.key, onChange]);

  return (
    <div className={[styles.control, styles.search].join(' ')}>
      <label className={styles.label} htmlFor={id}>
        {field.label}
      </label>
      <span className={styles.searchBox}>
        <Icon icon="mdi:magnify" width="18" height="18" className={styles.searchIcon} />
        <input
          id={id}
          type="search"
          className={styles.input}
          placeholder={field.placeholder}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        {text ? (
          <IconButton label="Clear search" size="sm" onClick={() => setText('')}>
            <Icon icon="mdi:close" width="16" height="16" />
          </IconButton>
        ) : null}
      </span>
    </div>
  );
}

/** One non-search filter, by type. */
function FilterControl({ field, values, onChange }) {
  const id = useId();
  const style = field.width ? { width: field.width } : undefined;

  if (field.type === 'select') {
    return (
      <div className={styles.control} style={style}>
        <label className={styles.label} htmlFor={id}>
          {field.label}
        </label>
        <select
          id={id}
          className={styles.input}
          value={values[field.key] ?? ''}
          onChange={(event) => onChange?.({ [field.key]: event.target.value || undefined })}
        >
          <option value="">{field.placeholder ?? `All ${field.label.toLowerCase()}`}</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'multiselect') {
    return (
      <div className={styles.control} style={style}>
        <MultiSelect
          label={field.label}
          options={field.options ?? []}
          value={values[field.key] ?? []}
          placeholder={field.placeholder}
          onChange={(next) => onChange?.({ [field.key]: next.length ? next : undefined })}
        />
      </div>
    );
  }

  if (field.type === 'toggle') {
    const current = values[field.key];
    return (
      <div className={styles.control} style={style}>
        <label className={styles.label} htmlFor={id}>
          {field.label}
        </label>
        <select
          id={id}
          className={styles.input}
          value={current === undefined || current === '' ? '' : String(current)}
          onChange={(event) =>
            onChange?.({ [field.key]: event.target.value === '' ? undefined : event.target.value })
          }
        >
          <option value="">{field.placeholder ?? 'Any'}</option>
          <option value="true">{field.trueLabel ?? 'Yes'}</option>
          <option value="false">{field.falseLabel ?? 'No'}</option>
        </select>
      </div>
    );
  }

  if (field.type === 'daterange' || field.type === 'number-range') {
    const isDate = field.type === 'daterange';
    const [fromKey, toKey] = field.keys ?? [`${field.key}From`, `${field.key}To`];
    return (
      <fieldset className={[styles.control, styles.range].filter(Boolean).join(' ')} style={style}>
        <legend className={styles.label}>{field.label}</legend>
        <span className={styles.rangeInputs}>
          <input
            type={isDate ? 'date' : 'number'}
            className={styles.input}
            aria-label={`${field.label} from`}
            value={values[fromKey] ?? ''}
            onChange={(event) => onChange?.({ [fromKey]: event.target.value || undefined })}
          />
          <span aria-hidden="true">–</span>
          <input
            type={isDate ? 'date' : 'number'}
            className={styles.input}
            aria-label={`${field.label} to`}
            value={values[toKey] ?? ''}
            onChange={(event) => onChange?.({ [toKey]: event.target.value || undefined })}
          />
        </span>
      </fieldset>
    );
  }

  return null;
}

/** The chip list: one per active value, each knowing how to clear itself. */
function buildChips(fields, values) {
  const chips = [];

  for (const field of fields) {
    if (field.type === 'search') {
      if (isSet(values[field.key])) {
        chips.push({
          key: field.key,
          value: values[field.key],
          label: `${field.label}: ${values[field.key]}`,
          clear: { [field.key]: undefined },
        });
      }
      continue;
    }

    if (field.type === 'daterange' || field.type === 'number-range') {
      const [fromKey, toKey] = field.keys ?? [`${field.key}From`, `${field.key}To`];
      [fromKey, toKey].forEach((key, index) => {
        if (!isSet(values[key])) return;
        chips.push({
          key,
          value: values[key],
          label: `${field.label} ${index === 0 ? 'from' : 'to'} ${values[key]}`,
          clear: { [key]: undefined },
        });
      });
      continue;
    }

    if (field.type === 'multiselect') {
      const selected = values[field.key] ?? [];
      selected.forEach((value) => {
        const option = (field.options ?? []).find((entry) => String(entry.value) === String(value));
        chips.push({
          key: field.key,
          value,
          label: `${field.label}: ${option?.label ?? value}`,
          clear: {
            [field.key]: selected.filter((entry) => String(entry) !== String(value)),
          },
        });
      });
      continue;
    }

    if (!isSet(values[field.key])) continue;

    const option = (field.options ?? []).find(
      (entry) => String(entry.value) === String(values[field.key])
    );
    const label =
      field.type === 'toggle'
        ? String(values[field.key]) === 'true'
          ? (field.trueLabel ?? 'Yes')
          : (field.falseLabel ?? 'No')
        : (option?.label ?? values[field.key]);

    chips.push({
      key: field.key,
      value: values[field.key],
      label: `${field.label}: ${label}`,
      clear: { [field.key]: undefined },
    });
  }

  return chips;
}
