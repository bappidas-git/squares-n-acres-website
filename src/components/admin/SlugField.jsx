import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import { isCanceled } from '../../services/apiError';
import { slugify, toSlugInput } from '../../utils/slug';

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
 * @param {string} [props.error]
 */
export default function SlugField({
  label = 'Slug',
  value = '',
  onChange,
  source = '',
  checkSlug,
  excludeId,
  base = '/',
  error,
  required = false,
  disabled = false,
}) {
  const id = useId();
  // Locked = "follow the title". A slug that already exists arrives unlocked,
  // because it is a live URL rather than a draft.
  const [locked, setLocked] = useState(() => !value);
  const [status, setStatus] = useState({ state: 'idle' });

  // Read by the "follow the title" effect without making it depend on them:
  // it must run when the title or the value changes and at no other time.
  const latest = useRef({});
  latest.current = { locked, value, onChange };

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
    if (!current.locked) return;

    const next = slugify(source);
    if (next === current.value) return;
    written.current = next;
    current.onChange?.(next);
  }, [source, value]);

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
    // A half-typed slug (`whitefield-`) is not a slug the API can answer about,
    // so the question waits until the value is one.
    if (!value || slugify(value) !== value) {
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
  }, [value, check]);

  const edit = (next) => {
    setLocked(false);
    write(toSlugInput(next));
  };

  // Typing may leave a trailing separator behind; leaving the field tidies it.
  const normalise = () => {
    const tidy = slugify(value);
    if (tidy !== value) write(tidy);
  };

  const errorId = error ? `${id}-error` : undefined;
  const statusId = `${id}-status`;

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
        <span className={styles.base}>{base}</span>
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
          label={locked ? 'Edit the slug' : 'Generate the slug from the title'}
          size="sm"
          onClick={() => {
            if (locked) {
              setLocked(false);
              return;
            }
            setLocked(true);
            write(slugify(source));
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

      <p className={styles.status} id={statusId} aria-live="polite">
        {status.state === 'checking' ? (
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
            This URL is available.
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
        ) : locked ? (
          <span className={styles.idle}>Generated from the title — unlock to edit.</span>
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
