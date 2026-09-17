import { useId } from 'react';

import styles from './LeadForm.module.css';

/**
 * The box only a robot fills in (§5.11).
 *
 * `POST /leads`, `POST /newsletter/subscribe` and `POST /jobs/:id/apply` accept
 * a `website` field; anything in it answers 200 and stores nothing, so the bot
 * cannot tell its submission was discarded. The field is therefore never a
 * client-side rejection — the form behaves exactly as it would have.
 *
 * It is hidden the way a honeypot has to be: off-screen rather than
 * `display: none` (which the better crawlers skip), out of the tab order, out
 * of the accessibility tree, and with autofill switched off so a password
 * manager never fills it in for a human.
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {string} [props.name]
 */
export default function Honeypot({ value = '', onChange, name = 'website' }) {
  const id = useId();

  return (
    <div className={styles.honeypot} aria-hidden="true">
      <label htmlFor={id}>Leave this field empty</label>
      <input
        id={id}
        type="text"
        name={name}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
