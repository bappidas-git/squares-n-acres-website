import { Button, Modal } from '../ui';
import { formatRelative } from '../../utils/format';

/**
 * "Somebody else saved this listing" — what a save made from an older version
 * of a record is answered with: the property form's since QA-62, every record
 * form's since prompt 51 (pages, articles, localities, developers, job
 * openings).
 *
 * The form sends the version it read; the API refuses it when the record has
 * been saved since, instead of writing every field back as this form read it —
 * which silently undid the other save: a form left open un-featured a listing
 * that had been starred from the list meanwhile. Nothing is lost either way:
 *
 *   - "Load their version" shows the record as it now stands, and keeps this
 *     editor's edits as the draft the banner offers back — replayed on top of
 *     their version (`utils/rebase.js`), not the whole form as it was;
 *   - "Save mine anyway" writes this version over theirs, knowingly;
 *   - "Keep editing" closes the question and sends nothing.
 *
 * @param {object} props
 * @param {{updatedAt?: string, updatedBy?: {name?: string}|null, updatedByName?: string|null,
 *   message?: string}|null} props.conflict
 * @param {string} [props.noun] what the record is called — "listing", "page"
 * @param {boolean} [props.busy]
 * @param {() => void} props.onKeepEditing
 * @param {() => void} props.onReload
 * @param {() => void} props.onOverwrite
 */
export default function ConflictDialog({
  conflict,
  noun = 'record',
  busy = false,
  onKeepEditing,
  onReload,
  onOverwrite,
}) {
  const who = conflict?.updatedBy?.name || conflict?.updatedByName || 'Somebody else';
  const when = conflict?.updatedAt ? formatRelative(conflict.updatedAt) : '';

  return (
    <Modal
      open={Boolean(conflict)}
      onClose={busy ? undefined : onKeepEditing}
      dismissible={!busy}
      title={`Somebody else saved this ${noun}`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" disabled={busy} onClick={onKeepEditing}>
            Keep editing
          </Button>
          <Button variant="outline" loading={busy} onClick={onReload}>
            Load their version
          </Button>
          <Button variant="danger" disabled={busy} onClick={onOverwrite}>
            Save mine anyway
          </Button>
        </>
      }
    >
      <p>
        {who} saved it {when ? `${when}, ` : ''}after you opened it. Saving yours now would replace
        whatever they changed.
      </p>
      <p>
        Load their version to see it — your changes stay in this browser as a draft that puts them
        back on top of it — or save yours over theirs.
      </p>
    </Modal>
  );
}
