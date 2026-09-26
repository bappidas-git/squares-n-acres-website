import { Icon } from '@iconify/react';

import { SwitchField } from '../ui/FormField';

import styles from './SlugMoveNotice.module.css';

/**
 * "This listing is live at /properties/old. Once saved, that address stops
 * answering." — and the switch that leaves a 301 behind (prompt 51, the rule
 * pages, localities and developers already kept).
 *
 * @param {object} props
 * @param {string} props.livePath the address the record is live at now
 * @param {string} [props.noun] "listing", "article", "page"
 * @param {boolean} props.canRedirect whether the editor may write redirects
 * @param {boolean} props.checked
 * @param {(checked: boolean) => void} props.onChange
 * @param {boolean} [props.disabled]
 */
export default function SlugMoveNotice({
  livePath,
  noun = 'page',
  canRedirect,
  checked,
  onChange,
  disabled = false,
}) {
  return (
    <div className={styles.notice} role="note">
      <p>
        <Icon icon="mdi:alert-outline" width="16" height="16" aria-hidden="true" /> This {noun} is
        live at <code>{livePath}</code>. Once saved, that address stops answering
        {canRedirect ? '.' : ' — ask an SEO editor to redirect it.'}
      </p>
      {canRedirect ? (
        <SwitchField
          label={`Send visitors from ${livePath} to the new address (301)`}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}
