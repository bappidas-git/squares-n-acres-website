import { Icon } from '@iconify/react';

import { Alert, Button } from '../ui';
import { formatRelative } from '../../utils/format';

/**
 * "Unsaved changes were found in this browser" — the copy `useLocalDraft`
 * kept, offered back.
 *
 * A record form writes a copy of itself to this browser every ten seconds
 * while it is dirty, and once more on the way out, so a closed tab, a reload,
 * a crash or an ended session does not cost an afternoon's work. On the next
 * visit the copy is **offered**, never applied: the record on the server is
 * the truth until an editor says otherwise.
 *
 * @param {object} props
 * @param {{savedAt: string}|null} props.draft
 * @param {string} [props.noun] what the record is called — "listing", "page"
 * @param {boolean} [props.isNew] the copy is of a record never created — there
 *   is no "last time it reached the server" to compare it with
 * @param {() => void} props.onRestore
 * @param {() => void} props.onDiscard
 */
export default function DraftBanner({
  draft,
  noun = 'record',
  isNew = false,
  onRestore,
  onDiscard,
}) {
  if (!draft) return null;

  return (
    <Alert
      tone="warning"
      title="Unsaved changes were found in this browser"
      icon={<Icon icon="mdi:history" width="20" height="20" />}
      actions={
        <>
          <Button size="sm" onClick={onRestore}>
            Restore the draft
          </Button>
          <Button size="sm" variant="ghost" onClick={onDiscard}>
            Discard it
          </Button>
        </>
      }
    >
      {isNew ? (
        <p>
          A new {noun} was started in this browser {formatRelative(draft.savedAt)} and never
          created. Restore it to carry on where it stopped, or discard it and start from a blank
          form.
        </p>
      ) : (
        <p>
          A draft of this {noun} was saved {formatRelative(draft.savedAt)}, after the last time it
          reached the server. Restore it, or discard it and keep what is saved.
        </p>
      )}
    </Alert>
  );
}
