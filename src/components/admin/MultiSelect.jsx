import { useId, useRef, useState } from 'react';
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
 * **The keyboard (QA-55).** Once something is typed, Enter takes the first
 * option — the exact match when there is one, "Add …" when a creatable field
 * has none — so "khata" + Enter picks Khata and "stamp act" + Enter creates
 * it. Before, nothing was highlighted until an arrow key moved, so Enter did
 * nothing; and a chosen option stayed in the list, where an Enter that landed
 * on it took it back out. The list now offers only what is not chosen yet.
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
 * @param {(label: string) => string|null|undefined} [props.checkNew] why a typed
 *   entry cannot be added — "“x” is not an e-mail address" — shown in the list
 *   in place of "Add …", which it cannot then be picked as (QA-64). An address
 *   refused by `onCreate` alone vanished from the box with no word of why.
 * @param {boolean} [props.commitOnBlur] a creatable field adds what was typed
 *   when it loses focus, as Enter would (QA-64): an address typed and followed
 *   by a click on Save was dropped without a word, and saved without it. What
 *   cannot be added stays in the box instead of being cleared.
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
  checkNew,
  commitOnBlur = false,
  max,
  placeholder,
  hint,
  error,
  required = false,
  disabled = false,
}) {
  const id = useId();
  const full = typeof max === 'number' && value.length >= max;

  // `onCreate` answers after a request: what it adds joins the value as it is
  // then, not as it was when the option was picked — a chip chosen in the
  // meantime used to disappear when the new tag arrived. One create at a time.
  const valueRef = useRef(value);
  valueRef.current = value;
  const creating = useRef(false);

  // Enter takes the first option only once something has been typed: an
  // empty box opened by a click is not a choice of whatever happens to be
  // first in the list.
  const [typed, setTyped] = useState('');

  // The chosen options, as the same array for as long as they are the same
  // options. MUI's Autocomplete clears what has been typed whenever its
  // `value` changes identity, and a list built afresh on every render changed
  // it on every render: each keystroke re-renders this field (`typed`), and
  // the article form re-renders around it on its own — the ten-second draft
  // — so the box emptied itself under the editor's fingers (QA-55).
  const selectedRef = useRef([]);
  const nextSelected = value.map(
    (entry) =>
      options.find((option) => sameValue(option.value, entry)) ?? {
        value: entry,
        label: String(entry),
      }
  );
  const unchanged =
    nextSelected.length === selectedRef.current.length &&
    nextSelected.every(
      (option, index) =>
        sameValue(option.value, selectedRef.current[index].value) &&
        option.label === selectedRef.current[index].label
    );
  if (!unchanged) selectedRef.current = nextSelected;
  const selected = selectedRef.current;

  const handleChange = async (_event, next) => {
    // A line that only explains why nothing can be added is not a choice.
    if (next.some((option) => option?.refused)) return;
    const created = next.find((option) => option?.isNew);
    if (created && onCreate) {
      if (creating.current) return;
      const add = (made) => {
        if (!made) return;
        const current = valueRef.current;
        if (current.some((entry) => sameValue(entry, made.value))) return;
        onChange?.([...current, made.value]);
      };
      const answer = onCreate(created.inputValue);
      // A create that answers at once is added at once, inside the event that
      // asked for it: the blur of a click on Save is followed by the click, and
      // an entry added a microtask later missed the save it was typed for
      // (QA-64).
      if (typeof answer?.then !== 'function') {
        add(answer);
        return;
      }
      creating.current = true;
      try {
        add(await answer);
      } finally {
        creating.current = false;
      }
      return;
    }

    const ids = next.filter((option) => !option?.isNew).map((option) => option.value);
    onChange?.(typeof max === 'number' ? ids.slice(0, max) : ids);
  };

  return (
    <div className={styles.field}>
      {label ? (
        <label className={[styles.label, labelClassName].filter(Boolean).join(' ')} htmlFor={id}>
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
        onInputChange={(_event, next) => setTyped(next)}
        autoHighlight={typed.trim() !== ''}
        // On blur the highlighted option — "Add …" once something is typed —
        // is taken, as Enter would take it; what cannot be taken is left in
        // the box rather than cleared.
        autoSelect={creatable && commitOnBlur}
        clearOnBlur={!(creatable && commitOnBlur)}
        filterSelectedOptions
        getOptionLabel={(option) => option?.label ?? ''}
        isOptionEqualToValue={(option, current) => sameValue(option.value, current.value)}
        getOptionDisabled={(option) =>
          Boolean(option?.refused) ||
          (full && !value.some((entry) => sameValue(entry, option.value)))
        }
        filterOptions={(list, state) => {
          const query = state.inputValue.trim();
          const lower = query.toLowerCase();
          const filtered = searchable
            ? list.filter((option) => option.label.toLowerCase().includes(lower))
            : list;

          // `list` holds only what is not chosen yet; whether the typed name
          // is already an option — chosen or not — is asked of all of them.
          const exact = filtered.find((option) => option.label.toLowerCase() === lower);
          const known = options.some((option) => option.label.toLowerCase() === lower);
          if (exact) return [exact, ...filtered.filter((option) => option !== exact)];
          if (creatable && query && !known) {
            const problem = checkNew?.(query);
            return [
              problem
                ? { value: `refused:${query}`, label: problem, refused: true }
                : {
                    value: `new:${query}`,
                    label: `Add "${query}"`,
                    isNew: true,
                    inputValue: query,
                  },
              ...filtered,
            ];
          }
          // Known but not offered: it is chosen already. Enter did nothing, and
          // nothing said why (QA-64).
          if (creatable && query && known) {
            return [
              { value: `refused:${query}`, label: `“${query}” is already added`, refused: true },
              ...filtered,
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
