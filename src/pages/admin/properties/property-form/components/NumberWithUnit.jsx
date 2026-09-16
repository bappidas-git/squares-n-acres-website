import { useId } from 'react';

import { Field } from '../../../../../components/ui';

import styles from './NumberWithUnit.module.css';

/**
 * A number with a unit attached — `₹ 15,000,000` or `1,650 sq ft`.
 *
 * Every measurement on the property form is a number that means nothing on its
 * own, so the unit rides inside the control rather than in the label, the
 * digits are right-aligned (§6 of prompt 19), and a `readout` prints the same
 * number the public page will print (`₹1.5 Cr`, D33) directly underneath.
 *
 * It is built on the kit's `Field`, so the label, the hint, the error and their
 * `aria-describedby` wiring are the ones every other field of the product uses.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {number|string|null} props.value
 * @param {(value: number|null) => void} props.onChange the parsed number, `null` when empty
 * @param {string} [props.prefix] rendered before the input, e.g. `₹`
 * @param {string} [props.suffix] rendered after it, e.g. `sq ft`
 * @param {React.ReactNode} [props.readout] the formatted value, under the control
 * @param {string} [props.hint]
 * @param {string} [props.error]
 * @param {number} [props.step]
 * @param {(value: number|null) => void} [props.onBlurValue] the parsed value on blur
 */
export default function NumberWithUnit({
  id,
  label,
  value,
  onChange,
  prefix,
  suffix,
  readout,
  hint,
  error,
  required = false,
  disabled = false,
  step = 1,
  min,
  max,
  placeholder,
  onBlurValue,
  ...rest
}) {
  const generated = useId();
  const fieldId = id || generated;

  // `''` is "the editor cleared it", which is `null` in the record — not 0.
  const parse = (raw) => {
    if (raw === '' || raw === null || raw === undefined) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return (
    <Field id={fieldId} label={label} hint={hint} error={error} required={required}>
      {({ hintId, errorId }) => (
        <>
          <span
            className={[styles.group, error ? styles.invalid : '', disabled ? styles.off : '']
              .filter(Boolean)
              .join(' ')}
          >
            {prefix ? (
              <span className={styles.prefix} aria-hidden="true">
                {prefix}
              </span>
            ) : null}
            <input
              id={fieldId}
              type="number"
              inputMode="decimal"
              className={styles.input}
              value={value ?? ''}
              step={step}
              min={min}
              max={max}
              required={required}
              disabled={disabled}
              placeholder={placeholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
              onChange={(event) => onChange?.(parse(event.target.value))}
              onBlur={(event) => onBlurValue?.(parse(event.target.value))}
              {...rest}
            />
            {suffix ? (
              <span className={styles.suffix} aria-hidden="true">
                {suffix}
              </span>
            ) : null}
          </span>
          {readout ? <span className={styles.readout}>{readout}</span> : null}
        </>
      )}
    </Field>
  );
}
