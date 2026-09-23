import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import LeadForm from './LeadForm';
import { Button, Modal } from '../ui';
import { LEAD_SOURCES } from '../../config/enums';
import { LEADS } from '../../config/copy';
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

/** What the success panel says when the lead is filed but the file did not arrive. */
const FILE_UNAVAILABLE =
  'Thank you — the sales team has your request. We could not fetch the file just now; try again, or your advisor will send it to you.';

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
 * A file whose address only the API hands over (`needsAccess`) also needs the
 * token this visit's lead was answered with: a visit that has lost it — one
 * that began on an older bundle, a restarted API, a tab left open for a day —
 * is asked again rather than told "opening…" about a file it cannot have.
 *
 * Exported for the unit test.
 *
 * @param {{propertyId?: number|string|null, unlockKind?: string|null,
 *   needsAccess?: boolean}} options
 * @returns {boolean}
 */
export function canSkipForm({ propertyId = null, unlockKind = null, needsAccess = false } = {}) {
  if (!leadStorage.getVisitor()?.phone) return false;
  if (needsAccess && !leadStorage.getAccess(propertyId)) return false;
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
 *   fileLabel?: string, resolveUrl?: () => Promise<string|null>}|null} [props.deliver]
 *   what the visitor gets afterwards. A gated file has no `fileUrl` in a public
 *   read, so its `resolveUrl` asks the API for it once the visitor may have it
 *   (`POST /properties/:id/documents/access`, with the token of their lead).
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
  const wantsFile = deliver?.kind === 'file';
  const needsAccess = wantsFile && !deliver.fileUrl && typeof deliver.resolveUrl === 'function';

  // Decided once, when the dialog opens: a visitor who is skipped must not see
  // the form flash into view as `leadStorage` changes underneath them. It is
  // taken back only when the visit's token turns out not to open the file.
  const [skipped, setSkipped] = useState(() =>
    open ? canSkipForm({ propertyId, unlockKind: gate, needsAccess }) : false
  );
  const [delivered, setDelivered] = useState(false);
  const [fileUrl, setFileUrl] = useState(wantsFile ? deliver.fileUrl || null : null);
  const [fetching, setFetching] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** The file's address: known already, or asked of the API now. */
  const resolveFile = useCallback(async () => {
    if (deliver?.fileUrl) return deliver.fileUrl;
    if (typeof deliver?.resolveUrl !== 'function') return null;
    try {
      return (await deliver.resolveUrl()) || null;
    } catch {
      return null;
    }
  }, [deliver]);

  /**
   * Hands over what was asked for.
   *
   * After a submitted form the lead is filed whatever happens next, so the gate
   * opens and a file that does not arrive becomes a "try again" on the success
   * panel. A skipped visitor has filed nothing new: when the address cannot be
   * had they are shown the form, and nothing is unlocked. (A token the API
   * refused is forgotten by whoever asked it — `DocumentsSection` — so a
   * network blip does not cost the visitor theirs.)
   */
  const runDelivery = useCallback(
    async ({ skipping = false } = {}) => {
      if (!wantsFile) {
        if (gate) leadStorage.unlock(propertyId, gate);
        setDelivered(true);
        return;
      }

      setFetching(true);
      const url = await resolveFile();
      if (!mounted.current) return;
      setFetching(false);

      if (!url && skipping) {
        setSkipped(false);
        return;
      }

      if (gate) leadStorage.unlock(propertyId, gate);
      setUnavailable(!url);
      setFileUrl(url);
      // Still inside the gesture that asked for it, as long as the API answers
      // in time; the panel's link below is there for when it did not.
      if (url) openFile(url);
      setDelivered(true);
    },
    [wantsFile, gate, propertyId, resolveFile]
  );

  // The skipped visitor gets the file straight away. The Open button below
  // stays on screen whatever the browser did with the tab. The ref keeps a
  // delivery that is still waiting on the API from being started twice.
  const started = useRef(false);
  useEffect(() => {
    if (!open || !skipped || delivered || started.current) return;
    started.current = true;
    runDelivery({ skipping: true });
  }, [open, skipped, delivered, runDelivery]);

  /** "Try again" from the success panel, inside the visitor's own click. */
  const retry = useCallback(async () => {
    setFetching(true);
    const url = await resolveFile();
    if (!mounted.current) return;
    setFetching(false);
    setUnavailable(!url);
    setFileUrl(url);
    if (url) openFile(url);
  }, [resolveFile]);

  const fileAction = (() => {
    if (!wantsFile) return null;
    // The lead is filed but the address did not arrive: the button asks again,
    // inside the visitor's own click.
    if (unavailable) {
      return { label: `Open ${fileLabel}`, icon: 'mdi:refresh', onClick: retry, loading: fetching };
    }
    // A real link rather than another `window.open`: the dialog has already
    // tried the tab, and a blocker that swallowed it would swallow a second
    // attempt too (BUG-08).
    return {
      label: `Open ${fileLabel}`,
      icon: 'mdi:open-in-new',
      href: fileUrl ?? undefined,
      loading: !fileUrl,
    };
  })();

  const heading = useMemo(
    () => title || LEAD_SOURCES.labelOf(source) || LEADS.enquiryTitle,
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
            We have your details — {wantsFile ? `opening ${fileLabel}` : 'everything is unlocked'}.
          </p>
          <div className={styles.skipActions}>
            {wantsFile ? (
              <Button
                variant="primary"
                href={fileUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                loading={!fileUrl}
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
          submitLabel={LEADS.send}
          successAction={fileAction}
          onCloseSuccess={onClose}
          onSuccess={(lead, values) => {
            // Inside the click that submitted the form, so the browser still
            // counts it as a user gesture and lets the tab through.
            runDelivery();
            onSuccess?.(lead, values);
          }}
          {...formProps}
          successMessage={unavailable ? FILE_UNAVAILABLE : formProps.successMessage}
        />
      )}
    </Modal>
  );
}
