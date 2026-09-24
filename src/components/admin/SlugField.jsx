import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import { isCanceled } from '../../services/apiError';
import { slugify, slugifyPath, toPathSlugInput, toSlugInput } from '../../utils/slug';

import styles from './SlugField.module.css';

/** How long the field waits before asking the API whether a slug is free. */
export const CHECK_DEBOUNCE_MS = 500;

/**
 * The URL of a record (§5.9).
 *
 * While the slug is locked it follows the title — which is what a new record
 * wants. The moment it is edited (or unlocked), it stops following: a slug that
 * has been published is a URL, and rewriting it because someone fixed a typo in
 * the title would break every link to it. A slug that **arrives** in `value`
 * from outside — a record reaching a form whose fields mounted a render before
 * it did — counts as edited for the same reason (NEW-31).
 *
 * Availability is asked of the API, debounced, with the answer rendered as one
 * of four states: idle, checking, free, taken (+ the suggestion to take).
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(slug: string) => void} props.onChange
 * @param {string} [props.source] the title the slug follows while locked
 * @param {(slug: string, options: {excludeId?: number|string, signal: AbortSignal}) =>
 *   Promise<{data: {available: boolean, suggestion?: string}}>} [props.checkSlug]
 * @param {number|string} [props.excludeId] the record being edited
 * @param {string} [props.base] the path the slug hangs off, e.g. `/properties/`
 * @param {boolean} [props.path] the slug is a URL **path** rather than a single
 *   segment, so `/` survives and each segment is slugified on its own — the CMS
 *   pages, whose `buyer-assistance/home-loan` is one slug (§6.10)
 * @param {string} [props.error]
 * @param {string} [props.id] the input's id, for a host that has to focus it
 *   from elsewhere (an SEO hint, a failed save)
 * @param {string} [props.sourceLabel] what the hint calls `source` — "title"
 *   by default, "name" on the master-data forms, which have no title (QA-60)
 */
export default function SlugField({
  id: idProp,
  label = 'Slug',
  value = '',
  onChange,
  source = '',
  sourceLabel = 'title',
  checkSlug,
  excludeId,
  base = '/',
  path = false,
  error,
  required = false,
  disabled = false,
}) {
  // How this field turns text into a slug: one segment, or a whole path.
  const toSlug = path ? slugifyPath : slugify;
  // What the field is, in its own sentences. A slug under a path is a URL; one
  // with no page of its own is what its label calls it — a team member's
  // "Identifier" said "This URL is available." over a record that has no URL
  // (QA-61), and so did a city's slug.
  const noun = base && String(base).startsWith('/') ? 'URL' : String(label).toLowerCase();
  const aNoun = `${noun !== 'URL' && /^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;
  const toInput = path ? toPathSlugInput : toSlugInput;
  const generatedId = useId();
  const id = idProp || generatedId;
  // Locked = "follow the title". A slug that already exists arrives unlocked,
  // because it is a live URL rather than a draft. A record not saved yet is the
  // exception: its slug is still a draft if it is exactly what the title makes.
  // A long form unmounts the field on every tab switch, and without this a new
  // listing's URL stopped following its title the first time the editor looked
  // at another tab.
  const [locked, setLockedState] = useState(
    () =>
      !value ||
      ((excludeId === undefined || excludeId === null || excludeId === '') &&
        value === toSlug(source))
  );
  const [status, setStatus] = useState({ state: 'idle' });

  // The lock as the "follow the title" effect reads it. The state is what the
  // field draws, and it reaches a render one render late: a keystroke in the
  // title that landed between a record's arrival and that render was drawn
  // with the lock still on, and wrote the title's slug over the live URL the
  // record had just brought in (QA-55). The ref changes the moment the lock
  // does.
  const lockedRef = useRef(locked);
  const setLocked = useCallback((next) => {
    lockedRef.current = next;
    setLockedState(next);
  }, []);

  // Read by the "follow the title" effect without making it depend on them:
  // it must run when the title or the value changes and at no other time.
  const latest = useRef({});
  latest.current = { value, onChange };

  // The last slug this field wrote. Anything else that turns up in `value`
  // arrived from outside — most often a record reaching a form whose fields
  // mounted a render earlier, which is exactly when the title changes too
  // (NEW-31).
  const written = useRef(value);

  /** Writes a slug and remembers it, so the write is not read back as external. */
  const write = (next) => {
    written.current = next;
    onChange?.(next);
  };

  // Follow the title while locked, and never write a value that is already
  // there — an identical write would report a pristine form as dirty.
  useEffect(() => {
    const current = latest.current;

    // A slug that came from somewhere else is a live URL, not a draft: the
    // field stops following the title rather than overwriting it.
    if (current.value && current.value !== written.current) {
      written.current = current.value;
      setLocked(false);
      return;
    }
    if (!lockedRef.current) return;

    const next = toSlug(source);
    if (next === current.value) return;
    written.current = next;
    current.onChange?.(next);
  }, [source, value, toSlug, setLocked]);

  const check = useCallback(
    (slug) => {
      if (!checkSlug || !slug) {
        setStatus({ state: 'idle' });
        return undefined;
      }

      const controller = new AbortController();
      setStatus({ state: 'checking' });

      checkSlug(slug, { excludeId, signal: controller.signal })
        .then((envelope) => {
          const data = envelope?.data ?? envelope ?? {};
          setStatus(
            data.available
              ? { state: 'available' }
              : { state: 'taken', suggestion: data.suggestion ?? '' }
          );
        })
        .catch((thrown) => {
          if (isCanceled(thrown)) return;
          // A failed check is not a verdict: say nothing rather than claim the
          // slug is free, and let the API's 409 be the final word (§5.9).
          setStatus({ state: 'idle' });
        });

      return () => controller.abort();
    },
    [checkSlug, excludeId]
  );

  useEffect(() => {
    // A read-only field cannot change its value, so whether the slug is free
    // is not a question worth asking — and `check-slug` belongs to the area's
    // `create` permission (§7), so a role that opens the form read-only is
    // answered 403 and the browser logs it (MB-01).
    if (disabled) {
      setStatus({ state: 'idle' });
      return undefined;
    }
    // A half-typed slug (`whitefield-`) is not a slug the API can answer about,
    // so the question waits until the value is one.
    if (!value || toSlug(value) !== value) {
      setStatus({ state: 'idle' });
      return undefined;
    }
    let abort;
    const timer = setTimeout(() => {
      abort = check(value);
    }, CHECK_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      abort?.();
    };
  }, [value, check, toSlug, disabled]);

  const edit = (next) => {
    setLocked(false);
    write(toInput(next));
  };

  // Typing may leave a trailing separator behind; leaving the field tidies it.
  const normalise = () => {
    const tidy = toSlug(value);
    if (tidy !== value) write(tidy);
  };

  const errorId = error ? `${id}-error` : undefined;
  const statusId = `${id}-status`;
  // "!!" or "北京 नगर" makes no slug at all: the box stays empty while the
  // name is typed, and "Generated from the name" said nothing about why. The
  // API gives such a record one of its own (QA-60).
  const sourceText = String(source ?? '').trim();
  const nothingToFollow = locked && !value && sourceText !== '' && toSlug(sourceText) === '';

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      <div className={styles.row}>
        {/* A slug with no address of its own (an amenity's) has no base: an
            empty span still took a gap and pushed the box off the column. */}
        {base ? <span className={styles.base}>{base}</span> : null}
        <input
          id={id}
          type="text"
          className={[styles.input, error ? styles.invalid : ''].filter(Boolean).join(' ')}
          value={value ?? ''}
          disabled={disabled || locked}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, statusId].filter(Boolean).join(' ')}
          onChange={(event) => edit(event.target.value)}
          onBlur={normalise}
        />
        <IconButton
          label={locked ? 'Edit the slug' : `Generate the slug from the ${sourceLabel}`}
          size="sm"
          onClick={() => {
            if (locked) {
              setLocked(false);
              return;
            }
            setLocked(true);
            write(toSlug(source));
          }}
          disabled={disabled}
        >
          <Icon
            icon={locked ? 'mdi:lock-outline' : 'mdi:lock-open-variant-outline'}
            width="18"
            height="18"
          />
        </IconButton>
      </div>

      {/* The availability line stands down while the field carries an error: a
          slug the API would accept can still be one this form refuses — a
          reserved path — and "available" under "Reserved path" reads as a
          contradiction rather than as two facts. */}
      <p className={styles.status} id={statusId} aria-live="polite">
        {error ? null : status.state === 'checking' ? (
          <span className={styles.checking}>
            <Icon
              icon="mdi:loading"
              width="14"
              height="14"
              className={styles.spin}
              aria-hidden="true"
            />
            Checking availability…
          </span>
        ) : status.state === 'available' ? (
          <span className={styles.available}>
            <Icon icon="mdi:check-circle-outline" width="14" height="14" aria-hidden="true" />
            This {noun} is available.
          </span>
        ) : status.state === 'taken' ? (
          <span className={styles.taken}>
            <Icon icon="mdi:close-circle-outline" width="14" height="14" aria-hidden="true" />
            Already taken.
            {status.suggestion ? (
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setLocked(false);
                  write(status.suggestion);
                }}
              >
                Use “{status.suggestion}”
              </Button>
            ) : null}
          </span>
        ) : nothingToFollow ? (
          <span className={styles.idle}>
            The {sourceLabel} has no Latin letters or numbers to make {aNoun} from, so one will be
            made when it is saved — unlock to type your own.
          </span>
        ) : locked ? (
          <span className={styles.idle}>Generated from the {sourceLabel} — unlock to edit.</span>
        ) : null}
      </p>

      {error ? (
        <span className={styles.error} id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
