import { useId } from 'react';

import { BADGE_TONES } from '../../config/enums';
import { toneStyles } from '../ui/tones';

import styles from './ToneSelect.module.css';

/**
 * The colour of a badge — as a tone name, never a hex value (§2.4, §6.4).
 *
 * The swatches are painted from the tone tokens themselves, so the picker can
 * never drift from what the badge will actually look like.
 *
 * @param {object} props
 * @param {string} props.value one of `BADGE_TONES.values`
 * @param {(tone: string) => void} props.onChange
 * @param {string} [props.label]
 * @param {string} [props.error]
 */
export default function ToneSelect({
  label = 'Colour',
  value = 'primary',
  onChange,
  error,
  required = false,
  disabled = false,
}) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={styles.field}>
      <span className={styles.label} id={id}>
        {label}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
      </span>

      <div
        className={styles.swatches}
        role="radiogroup"
        aria-labelledby={id}
        aria-describedby={errorId}
      >
        {BADGE_TONES.entries.map((tone) => {
          const palette = toneStyles(tone.value);
          const selected = tone.value === value;

          return (
            <button
              key={tone.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              className={[styles.swatch, selected ? styles.selected : ''].filter(Boolean).join(' ')}
              style={{ background: palette.background, borderColor: palette.border }}
              onClick={() => onChange?.(tone.value)}
            >
              <span
                className={styles.dot}
                style={{ background: palette.border }}
                aria-hidden="true"
              />
              <span style={{ color: palette.color }}>{tone.label}</span>
            </button>
          );
        })}
      </div>

      {error ? (
        <span className={styles.error} id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
