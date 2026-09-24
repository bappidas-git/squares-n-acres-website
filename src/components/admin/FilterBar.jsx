import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import Checkbox from '@mui/material/Checkbox';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';

import Button from '../ui/Button';
import Chip from '../ui/Chip';
import IconButton from '../ui/IconButton';
import useBreakpoint from '../../hooks/useBreakpoint';
import { formatDate } from '../../utils/format';

import styles from './FilterBar.module.css';

/** How long the search box waits before it changes the view (§4.2). */
export const SEARCH_DEBOUNCE_MS = 400;

const isSet = (value) =>
  value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length);

/** A `yyyy-mm-dd` a person finished typing — not a year still on its way. */
const isWholeDate = (value) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1900-01-01';

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
 * @param {Array<{key: string, type: 'search'|'select'|'multiselect'|'daterange'|'toggle'|'number-range'|'custom',
 *   label: string, options?: Array<{value: string|number, label: string}>,
 *   placeholder?: string, width?: string,
 *   render?: (api: {values: object, onChange: (patch: object) => void,
 *     labelClassName: string, fieldClassName: string}) => React.ReactNode,
 *   chipLabel?: (values: object) => string|null}>} props.fields `chipLabel` names a
 *   `custom` filter's value — only the caller knows what the chosen record is
 *   called — so it gets a chip and counts as active like every other filter
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

  // In the phone's popover every control takes the popover's width: a field's
  // own width is for the row it sits in on a laptop.
  const controls = rest.map((field) => (
    <FilterControl
      key={field.key}
      field={field}
      values={values}
      onChange={onChange}
      stacked={isMobile}
    />
  ));

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        {searchField ? (
          <SearchInput
            field={searchField}
            value={values[searchField.key] ?? ''}
            onChange={onChange}
            stacked={isMobile}
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
                  <div className={styles.popoverActions}>
                    {count > 0 && onReset ? (
                      <Button variant="ghost" size="sm" onClick={onReset}>
                        Reset
                      </Button>
                    ) : null}
                    <Button size="sm" onClick={() => setPopover(null)}>
                      Done
                    </Button>
                  </div>
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
function SearchInput({ field, value, onChange, stacked = false }) {
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

  // A laptop row of six filters has no room for the 300 px the box takes by
  // default; a phone gives it the whole row whatever it asks for.
  const style =
    field.width && !stacked ? { width: field.width, flexBasis: field.width } : undefined;

  return (
    <div className={[styles.control, styles.search].join(' ')} style={style}>
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
function FilterControl({ field, values, onChange, stacked = false }) {
  const id = useId();
  const style = field.width && !stacked ? { width: field.width } : undefined;

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
      <FilterMultiSelect
        field={field}
        style={style}
        value={values[field.key]}
        onChange={onChange}
      />
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

  // A filter whose control is the caller's — an `EntityPicker` over a
  // collection too long for a `<select>`. It sits in the row with the rest and
  // moves into the popover with them below 900 px; the chip is its own, since
  // only the caller knows what the chosen record is called.
  if (field.type === 'custom') {
    return (
      <div className={styles.control} style={style}>
        {field.render?.({
          values,
          onChange,
          labelClassName: styles.fieldLabel,
          fieldClassName: styles.fieldBox,
        })}
      </div>
    );
  }

  if (field.type === 'daterange' || field.type === 'number-range') {
    const isDate = field.type === 'daterange';
    const [fromKey, toKey] = field.keys ?? [`${field.key}From`, `${field.key}To`];
    const from = values[fromKey] ?? '';
    const to = values[toKey] ?? '';

    // A range that ends before it starts matches nothing and says nothing
    // about why. The picker greys out the days that would invert it, and a
    // date typed past the other end moves that end along with it, so the
    // range is always one the reader can see (QA-53). Only a finished date
    // does: typing a year digit by digit passes through `0002-…`, which must
    // not drag the other end back to the year 2.
    const write = (key, value) => {
      const patch = { [key]: value || undefined };
      if (isDate && isWholeDate(value)) {
        if (key === fromKey && isWholeDate(to) && value > to) patch[toKey] = value;
        if (key === toKey && isWholeDate(from) && value < from) patch[fromKey] = value;
      }
      onChange?.(patch);
    };

    return (
      <fieldset className={[styles.control, styles.range].filter(Boolean).join(' ')} style={style}>
        <legend className={styles.label}>{field.label}</legend>
        <span className={styles.rangeInputs}>
          <input
            type={isDate ? 'date' : 'number'}
            className={styles.input}
            aria-label={`${field.label} from`}
            value={from}
            max={isDate && to ? to : undefined}
            onChange={(event) => write(fromKey, event.target.value)}
          />
          <span aria-hidden="true">–</span>
          <input
            type={isDate ? 'date' : 'number'}
            className={styles.input}
            aria-label={`${field.label} to`}
            value={to}
            min={isDate && from ? from : undefined}
            onChange={(event) => write(toKey, event.target.value)}
          />
        </span>
      </fieldset>
    );
  }

  return null;
}

/**
 * A several-values filter, drawn like the selects beside it.
 *
 * It used to be the form's `MultiSelect` — an autocomplete that grew a chip
 * per pick. In a row of 40 px native selects that meant a 16 px placeholder in
 * a different grey, a control that widened with every status ticked until it
 * pushed the whole bar onto another line, and each pick shown twice: as a chip
 * inside it and as the removable chip under the bar. Here the face says what
 * is chosen in one line ("Under Construction +1"), the chips under the bar stay
 * the one place a pick is listed and removed, and the list opens as a menu of
 * checkboxes that stays open while several are ticked.
 */
function FilterMultiSelect({ field, style, value, onChange }) {
  const id = useId();
  const labelId = `${id}-label`;
  const [anchor, setAnchor] = useState(null);

  const options = field.options ?? [];
  const chosen = (Array.isArray(value) ? value : []).map(String);
  const labels = chosen.map(
    (entry) => options.find((option) => String(option.value) === entry)?.label ?? entry
  );

  const face =
    labels.length === 0
      ? (field.placeholder ?? `Any ${field.label.toLowerCase()}`)
      : labels.length === 1
        ? labels[0]
        : `${labels[0]} +${labels.length - 1}`;

  const write = (next) => onChange?.({ [field.key]: next.length ? next : undefined });

  const toggle = (optionValue) => {
    const key = String(optionValue);
    const next = new Set(
      chosen.includes(key) ? chosen.filter((entry) => entry !== key) : [...chosen, key]
    );
    // The options' own order, so the URL and the chips read the same way
    // whichever box was ticked first.
    write(options.filter((option) => next.has(String(option.value))).map((option) => option.value));
  };

  return (
    <div className={[styles.control, styles.multi].join(' ')} style={style}>
      <span className={styles.label} id={labelId}>
        {field.label}
      </span>
      <button
        type="button"
        id={id}
        className={[styles.input, styles.selectFace, labels.length ? '' : styles.faceEmpty]
          .filter(Boolean)
          .join(' ')}
        aria-haspopup="menu"
        aria-expanded={anchor ? true : undefined}
        aria-labelledby={`${labelId} ${id}`}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <span className={styles.faceText}>{face}</span>
        <Icon icon="mdi:chevron-down" width="18" height="18" aria-hidden="true" />
      </button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ list: { 'aria-labelledby': labelId, dense: true } }}
      >
        {options.map((option) => {
          const checked = chosen.includes(String(option.value));
          return (
            <MenuItem
              key={option.value}
              role="menuitemcheckbox"
              aria-checked={checked}
              className={styles.menuItem}
              onClick={() => toggle(option.value)}
            >
              <Checkbox
                size="small"
                disableRipple
                checked={checked}
                tabIndex={-1}
                slotProps={{ input: { 'aria-hidden': true, tabIndex: -1 } }}
              />
              {option.label}
            </MenuItem>
          );
        })}
        {chosen.length > 0 ? (
          <MenuItem className={styles.menuClear} onClick={() => write([])}>
            Clear {field.label.toLowerCase()}
          </MenuItem>
        ) : null}
      </Menu>
    </div>
  );
}

/** The chip list: one per active value, each knowing how to clear itself. */
function buildChips(fields, values) {
  const chips = [];

  for (const field of fields) {
    // A custom control's chip is the caller's to name. Without one, a lead
    // list filtered to one listing showed no chip, counted no filter — so no
    // Reset — and on a phone the filter was on and visible nowhere (QA-53).
    if (field.type === 'custom') {
      const label = isSet(values[field.key]) ? field.chipLabel?.(values) : null;
      if (label) {
        chips.push({
          key: field.key,
          value: values[field.key],
          label,
          clear: { [field.key]: undefined },
        });
      }
      continue;
    }

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
        // "Created from 10 Sep 2026", in the house format rather than the
        // `2026-09-10` the URL carries.
        const shown =
          field.type === 'daterange' && isWholeDate(values[key])
            ? formatDate(values[key])
            : values[key];
        chips.push({
          key,
          value: values[key],
          label: `${field.label} ${index === 0 ? 'from' : 'to'} ${shown}`,
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
