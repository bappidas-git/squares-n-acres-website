import { Alert, SwitchField } from '../../../components/ui';

/**
 * What changing a live record's URL does, said before the save (QA-60): the
 * address it had stops answering, and — for an editor who may write redirects
 * — the offer to send its visitors on (301), on by default. The Pages form has
 * said this since QA-56; a locality or a developer moved in silence, and every
 * link, bookmark and search result to it answered 404.
 *
 * @param {object} props
 * @param {string} props.from the address being left, e.g. `/localities/whitefield`
 * @param {boolean} props.canRedirect whether this editor may write redirects
 * @param {boolean} props.checked
 * @param {boolean} [props.disabled]
 * @param {(checked: boolean) => void} props.onChange
 */
export default function MovedNotice({ from, canRedirect, checked, disabled = false, onChange }) {
  return (
    // The kit's warning announces itself as an alert; this is a note about a
    // save not yet made, and a refused save must not stop on it.
    <div data-advisory="" style={{ marginTop: 'var(--space-3)' }}>
      <Alert tone="warning" role="note">
        <p style={{ margin: 0 }}>
          This page is live at <code style={{ overflowWrap: 'anywhere' }}>{from}</code>. Once saved,
          that address stops answering
          {canRedirect ? '.' : ' — ask an SEO editor to redirect it.'}
        </p>
        {canRedirect ? (
          <SwitchField
            label={`Send visitors from ${from} to the new address (301)`}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
          />
        ) : null}
      </Alert>
    </div>
  );
}
