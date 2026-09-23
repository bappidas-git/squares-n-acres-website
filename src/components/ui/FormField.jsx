import { useId } from 'react';

import styles from './FormField.module.css';

/**
 * The form controls of the design system.
 *
 * Every field renders a **visible** label (never a placeholder standing in for
 * one), links its hint and error with `aria-describedby`, and marks an invalid
 * control with `aria-invalid` (§8.3). `required` adds the asterisk and the
 * native attribute.
 */

/** Label + control + hint/error scaffolding shared by every field below. */
export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  children,
  className = '',
  labelAs: LabelTag = 'label',
  ...rest
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')} {...rest}>
      {label ? (
        <LabelTag className={styles.label} htmlFor={LabelTag === 'label' ? id : undefined}>
          {label}
          {required ? (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          ) : null}
        </LabelTag>
      ) : null}
      {children({ hintId, errorId })}
      {hint && !error ? (
        <span className={styles.hint} id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className={styles.error} id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

const describedBy = (hintId, errorId) => [errorId, hintId].filter(Boolean).join(' ') || undefined;

/**
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.hint]
 * @param {string} [props.error]
 * @param {boolean} [props.required]
 */
export function TextField({
  id,
  label,
  hint,
  error,
  required,
  type = 'text',
  className,
  fieldClassName,
  ...rest
}) {
  const generated = useId();
  const fieldId = id || generated;

  return (
    <Field
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={fieldClassName}
    >
      {({ hintId, errorId }) => (
        <input
          id={fieldId}
          type={type}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(hintId, errorId)}
          className={[styles.control, error ? styles.invalid : '', className]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />
      )}
    </Field>
  );
}

/** A number input with Indian-format hinting left to the caller's `hint`. */
export function NumberField({ id, min, max, step = 1, ...rest }) {
  return (
    <TextField
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={step}
      {...rest}
    />
  );
}

export function DateField(props) {
  return <TextField type="date" {...props} />;
}

export function UrlField({ hint = 'Include https://', ...rest }) {
  return <TextField type="url" inputMode="url" hint={hint} {...rest} />;
}

/** A phone input with the fixed +91 prefix of the Indian market. */
export function PhoneField({
  id,
  label,
  hint,
  error,
  required,
  prefix = '+91',
  className,
  fieldClassName,
  ...rest
}) {
  const generated = useId();
  const fieldId = id || generated;

  return (
    <Field
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={fieldClassName}
    >
      {({ hintId, errorId }) => (
        <span className={styles.group}>
          <span className={styles.prefix} aria-hidden="true">
            {prefix}
          </span>
          <input
            id={fieldId}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            maxLength={10}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(hintId, errorId)}
            className={[styles.control, error ? styles.invalid : '', className]
              .filter(Boolean)
              .join(' ')}
            {...rest}
          />
        </span>
      )}
    </Field>
  );
}

export function TextareaField({
  id,
  label,
  hint,
  error,
  required,
  rows = 4,
  className,
  fieldClassName,
  ...rest
}) {
  const generated = useId();
  const fieldId = id || generated;

  return (
    <Field
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={fieldClassName}
    >
      {({ hintId, errorId }) => (
        <textarea
          id={fieldId}
          rows={rows}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(hintId, errorId)}
          className={[styles.control, styles.textarea, error ? styles.invalid : '', className]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />
      )}
    </Field>
  );
}

/**
 * @param {object} props
 * @param {{ value: string|number, label: React.ReactNode, disabled?: boolean }[]} props.options
 * @param {string} [props.placeholder] rendered as a disabled first option
 */
export function SelectField({
  id,
  label,
  hint,
  error,
  required,
  options = [],
  placeholder,
  className,
  fieldClassName,
  children,
  ...rest
}) {
  const generated = useId();
  const fieldId = id || generated;

  return (
    <Field
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={fieldClassName}
    >
      {({ hintId, errorId }) => (
        <select
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(hintId, errorId)}
          className={[styles.control, styles.select, error ? styles.invalid : '', className]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        >
          {/* Disabled only on a required field. On an optional one it is the
              way back to "not set": once a facing or an ownership had been
              picked, nothing could clear it again. */}
          {placeholder ? (
            <option value="" disabled={Boolean(required)}>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
          {children}
        </select>
      )}
    </Field>
  );
}

/**
 * An on/off control rendered as a labelled switch button.
 *
 * @param {object} props
 * @param {boolean} props.checked
 * @param {(checked: boolean) => void} props.onChange
 */
export function SwitchField({
  id,
  label,
  hint,
  error,
  checked = false,
  onChange,
  disabled = false,
  className = '',
  ...rest
}) {
  const generated = useId();
  const fieldId = id || generated;
  const hintId = hint ? `${fieldId}-hint` : undefined;

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')} {...rest}>
      <div className={styles.switchRow}>
        <label className={styles.label} htmlFor={fieldId}>
          {label}
        </label>
        <button
          id={fieldId}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-describedby={hintId}
          disabled={disabled}
          className={[styles.switch, checked ? styles.switchOn : ''].filter(Boolean).join(' ')}
          onClick={() => onChange?.(!checked)}
        >
          <span className={styles.knob} />
        </button>
      </div>
      {hint ? (
        <span className={styles.hint} id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/**
 * @param {object} props
 * @param {{ value: string|number, label: React.ReactNode }[]} props.options
 * @param {(string|number)[]} props.value
 * @param {(value: (string|number)[]) => void} props.onChange
 */
export function CheckboxGroup({
  label,
  hint,
  error,
  options = [],
  value = [],
  onChange,
  required,
  column = false,
  className = '',
  ...rest
}) {
  const name = useId();
  const toggle = (option) => {
    const next = value.includes(option) ? value.filter((v) => v !== option) : [...value, option];
    onChange?.(next);
  };

  return (
    <fieldset className={[styles.field, className].filter(Boolean).join(' ')} {...rest}>
      {label ? (
        <legend className={styles.legend}>
          {label}
          {required ? (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          ) : null}
        </legend>
      ) : null}
      <div className={[styles.choices, column ? styles.column : ''].filter(Boolean).join(' ')}>
        {options.map((option) => (
          <label key={option.value} className={styles.choice}>
            <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={value.includes(option.value)}
              onChange={() => toggle(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {hint && !error ? <span className={styles.hint}>{hint}</span> : null}
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </fieldset>
  );
}

/**
 * @param {object} props
 * @param {{ value: string|number, label: React.ReactNode }[]} props.options
 * @param {string|number} props.value
 * @param {(value: string) => void} props.onChange
 */
export function RadioGroup({
  label,
  hint,
  error,
  options = [],
  value,
  onChange,
  required,
  column = false,
  className = '',
  ...rest
}) {
  const name = useId();

  return (
    <fieldset className={[styles.field, className].filter(Boolean).join(' ')} {...rest}>
      {label ? (
        <legend className={styles.legend}>
          {label}
          {required ? (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          ) : null}
        </legend>
      ) : null}
      <div className={[styles.choices, column ? styles.column : ''].filter(Boolean).join(' ')}>
        {options.map((option) => (
          <label key={option.value} className={styles.choice}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={String(value) === String(option.value)}
              onChange={(event) => onChange?.(event.target.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {hint && !error ? <span className={styles.hint}>{hint}</span> : null}
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </fieldset>
  );
}

export default TextField;
