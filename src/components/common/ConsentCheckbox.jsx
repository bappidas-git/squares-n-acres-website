import { useId } from 'react';

import { LEADS, fill } from '../../config/copy';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

import styles from './LeadForm.module.css';

/**
 * The one box a lead form asks a visitor to tick.
 *
 * `lead.consent` is a field of §6.7, and a sales desk that cannot show when
 * somebody agreed to be called has no answer to a complaint. The checkbox is
 * pre-ticked — the visitor is filling a "call me" form — but it is a real
 * control they can untick, and unticking it blocks the submit rather than
 * sending a lead with `consent: false`.
 *
 * @param {object} props
 * @param {boolean} props.checked
 * @param {(checked: boolean) => void} props.onChange
 * @param {string} [props.error]
 */
export default function ConsentCheckbox({ checked = true, onChange, error }) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  // The company's own name is never spelled out in a component (§14): it is
  // `siteSettings.general.siteName`, which a client can change.
  const { siteName } = useSiteSettings();

  return (
    <div className={styles.consent}>
      <input
        id={id}
        type="checkbox"
        className={styles.consentBox}
        checked={checked}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <label htmlFor={id} className={styles.consentLabel}>
        {fill(LEADS.consent, { siteName })}.
      </label>
      {error ? (
        <span className={styles.consentError} id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
