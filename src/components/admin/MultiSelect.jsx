import { useId } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

import Chip from '../ui/Chip';

import styles from './MultiSelect.module.css';

const sameValue = (left, right) => String(left) === String(right);

/**
 * Several values out of a list, as chips.
 *
 * It speaks in **values**, not option objects: `value` is an array of ids and
 * `onChange` gives back an array of ids, so a form can hand what it holds
 * straight to the API (`amenityIds`, `badgeIds`, `tagIds`; §5.5).
 *
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.labelClassName] a caller's own label style — the
 *   filter bar's small muted one, rather than the form label used everywhere else
 * @param {Array<{value: string|number, label: string}>} props.options
 * @param {Array<string|number>} props.value
 * @param {(value: Array<string|number>) => void} props.onChange
 * @param {boolean} [props.searchable]
 * @param {boolean} [props.creatable] offers "Add …" for an unknown entry
 * @param {(label: string) => Promise<{value: string|number, label: string}>|void} [props.onCreate]
 * @param {number} [props.max] refuses further picks once reached
 * @param {string} [props.error]
 */
export default function MultiSelect({
  label,
  labelClassName = '',
  options = [],
  value = [],
  onChange,
  searchable = true,
  creatable = false,
  onCreate,
  max,
  placeholder,
  hint,
  error,
  required = false,
  disabled = false,
}) {
  const id = useId();
  const full = typeof max === 'number' && value.length >= max;

  const selected = value.map(
    (entry) =>
      options.find((option) => sameValue(option.value, entry)) ?? {
        value: entry,
        label: String(entry),
      }
  );

  const handleChange = async (_event, next) => {
    const created = next.find((option) => option?.isNew);
    if (created && onCreate) {
      const made = await onCreate(created.inputValue);
      if (!made) return;
      onChange?.([...value, made.value]);
      return;
    }

    const ids = next.filter((option) => !option?.isNew).map((option) => option.value);
    onChange?.(typeof max === 'number' ? ids.slice(0, max) : ids);
  };

  return (
    <div className={styles.field}>
      {label ? (
        <label
          className={[styles.label, labelClassName].filter(Boolean).join(' ')}
          htmlFor={id}
        >
          {label}
          {required ? (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          ) : null}
          {typeof max === 'number' ? (
            <span className={styles.counter}>
              {value.length}/{max}
            </span>
          ) : null}
        </label>
      ) : null}

      <Autocomplete
        id={id}
        multiple
        disableCloseOnSelect
        disabled={disabled}
        // MUI sets `outline: none` on its own input and shows focus by
        // thickening the notched fieldset in the primary colour. That is a
        // visible marker, but it is not the one the rest of the admin uses:
        // the native `<select>`s either side of this control in a filter bar
        // light up the 2px `--color-focus` ring of `global.css`, and a
        // keyboard user moving along the row should not watch the marker
        // change shape and colour halfway. Written as `sx` rather than in the
        // module's stylesheet because a `:global(.MuiOutlinedInput-root)` rule
        // there reorders the admin CSS chunk and `build:ci` refuses it
        // (mini-css-extract "Conflicting order"). Prompt 46.
        sx={{
          '& .MuiOutlinedInput-root:focus-within': {
            outline: '2px solid var(--color-focus)',
            outlineOffset: '2px',
          },
        }}
        options={options}
        value={selected}
        onChange={handleChange}
        getOptionLabel={(option) => option?.label ?? ''}
        isOptionEqualToValue={(option, current) => sameValue(option.value, current.value)}
        getOptionDisabled={(option) =>
          full && !value.some((entry) => sameValue(entry, option.value))
        }
        filterOptions={(list, state) => {
          const query = state.inputValue.trim();
          const filtered = searchable
            ? list.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
            : list;

          const exists = list.some((option) => option.label.toLowerCase() === query.toLowerCase());
          if (creatable && query && !exists) {
            return [
              ...filtered,
              { value: `new:${query}`, label: `Add "${query}"`, isNew: true, inputValue: query },
            ];
          }
          return filtered;
        }}
        renderTags={(tags, getTagProps) =>
          tags.map((option, index) => {
            const { key, onDelete, ...rest } = getTagProps({ index });
            return (
              <Chip
                key={key}
                tone="primary"
                // A read-only form still renders the chips; MUI's `getTagProps`
                // hands back its remove handler either way, so the × is dropped
                // here rather than left as the one live control on the screen.
                onDelete={disabled ? undefined : onDelete}
                deleteLabel={`Remove ${option.label}`}
                {...rest}
              >
                {option.label}
              </Chip>
            );
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            placeholder={value.length === 0 ? placeholder : undefined}
            error={Boolean(error)}
            helperText={error || hint}
          />
        )}
      />
    </div>
  );
}
