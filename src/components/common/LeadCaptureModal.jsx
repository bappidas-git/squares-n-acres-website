import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import LeadForm from './LeadForm';
import { Button, Modal } from '../ui';
import { LEAD_SOURCES } from '../../config/enums';
import { leadStorage } from '../../utils/leadStorage';

import styles from './LeadCaptureModal.module.css';

/**
 * Open a file in a new tab.
 *
 * Returns the window the browser gave us, or `null` when it blocked the
 * pop-up — which is why every delivery keeps its "Open" button on screen: a
 * download a visitor paid for with their phone number must not be lost to a
 * pop-up blocker (BUG-08).
 *
 * @param {string} url
 * @returns {Window|null}
 */
export function openFile(url) {
  if (!url || typeof window === 'undefined') return null;
  return window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Whether this visitor may skip the form for this delivery.
 *
 * Two ways in: they have already filled a form in about this listing, or the
 * kind of gated content being asked for is already open on it. Either way they
 * have told us who they are once in this session, and asking again before the
 * second file would be theatre — so the delivery happens and **no second lead
 * is filed** (the record of the first capture is the one that matters).
 *
 * A visitor who has typed their details into a form about a *different*
 * listing is not skipped: that listing's sales desk has no record of them.
 *
 * Exported for the unit test.
 *
 * @param {{propertyId?: number|string|null, unlockKind?: string|null}} options
 * @returns {boolean}
 */
export function canSkipForm({ propertyId = null, unlockKind = null } = {}) {
  if (!leadStorage.getVisitor()?.phone) return false;
  if (leadStorage.isCapturedFor(propertyId)) return true;
  return Boolean(unlockKind) && leadStorage.isUnlocked(propertyId, unlockKind);
}

/**
 * The one lead dialog of the site.
 *
 * `LeadCaptureContext` mounts exactly one of these and parameterises it from
 * `ENTRY_POINTS`; a gated section may also mount its own when it needs to hand
 * a specific file over afterwards. Either way the dialog does three things the
 * four copy-pasted modals of the boilerplate did not (ADD-12): it asks with one
 * form, it delivers what was asked for, and it does not ask a visitor who has
 * already answered.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.source a `LEAD_SOURCES` value
 * @param {number|string|null} [props.propertyId]
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {Array<object>} [props.fields]
 * @param {boolean} [props.requirement]
 * @param {string|null} [props.unlockKind] the `leadStorage` gate this opens
 * @param {{kind: 'unlock'|'file', unlockKind?: string, fileUrl?: string,
 *   fileLabel?: string}|null} [props.deliver] what the visitor gets afterwards
 * @param {(lead: object, values: object) => void} [props.onSuccess]
 * @param {string} [props.propertyTitle]
 * @param {object|null} [props.agent]
 */
export default function LeadCaptureModal({
  open,
  onClose,
  source,
  propertyId = null,
  title,
  subtitle,
  fields,
  requirement = false,
  unlockKind = null,
  deliver = null,
  onSuccess,
  propertyTitle = '',
  agent = null,
  ...formProps
}) {
  const gate = deliver?.unlockKind ?? unlockKind ?? null;
  const fileLabel = deliver?.fileLabel || 'the file';

  // Decided once, when the dialog opens: a visitor who is skipped must not see
  // the form flash into view as `leadStorage` changes underneath them.
  const [skipped] = useState(() => (open ? canSkipForm({ propertyId, unlockKind: gate }) : false));
  const [delivered, setDelivered] = useState(false);

  const runDelivery = useCallback(() => {
    if (gate) leadStorage.unlock(propertyId, gate);
    if (deliver?.kind === 'file' && deliver.fileUrl) openFile(deliver.fileUrl);
    setDelivered(true);
  }, [deliver, gate, propertyId]);

  // The skipped visitor gets the file straight away. The Open button below
  // stays on screen whatever the browser did with the tab.
  useEffect(() => {
    if (open && skipped && !delivered) runDelivery();
  }, [open, skipped, delivered, runDelivery]);

  const heading = useMemo(
    () => title || LEAD_SOURCES.labelOf(source) || 'Enquiry',
    [title, source]
  );

  return (
    <Modal
      open={Boolean(open)}
      onClose={onClose}
      mobile="sheet"
      size="sm"
      title={heading}
      description={skipped ? undefined : subtitle || propertyTitle || undefined}
    >
      {skipped ? (
        <div className={styles.skip} role="status">
          <Icon icon="mdi:check-circle-outline" className={styles.skipIcon} aria-hidden="true" />
          <p className={styles.skipText}>
            We have your details —{' '}
            {deliver?.kind === 'file' ? `opening ${fileLabel}` : 'everything is unlocked'}.
          </p>
          <div className={styles.skipActions}>
            {deliver?.kind === 'file' && deliver.fileUrl ? (
              <Button
                variant="primary"
                href={deliver.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                icon={<Icon icon="mdi:open-in-new" aria-hidden="true" />}
              >
                Open {fileLabel}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <LeadForm
          source={source}
          propertyId={propertyId}
          // The dialog already carries both: its `title` and the `description`
          // the sheet prints under it, which is also what `aria-describedby`
          // points at. Repeating them inside the form printed each twice.
          title=""
          subtitle=""
          fields={fields}
          requirement={requirement}
          variant="modal"
          compact
          propertyTitle={propertyTitle}
          agent={agent}
          submitLabel="Send"
          successAction={
            deliver?.kind === 'file' && deliver.fileUrl
              ? {
                  label: `Open ${fileLabel}`,
                  icon: 'mdi:open-in-new',
                  // A real link rather than another `window.open`: the dialog
                  // has already tried the tab, and a blocker that swallowed it
                  // would swallow a second attempt too (BUG-08).
                  href: deliver.fileUrl,
                }
              : null
          }
          onCloseSuccess={onClose}
          onSuccess={(lead, values) => {
            // Inside the click that submitted the form, so the browser still
            // counts it as a user gesture and lets the tab through.
            runDelivery();
            onSuccess?.(lead, values);
          }}
          {...formProps}
        />
      )}
    </Modal>
  );
}
