import { useEffect, useState } from 'react';

import Modal from '../../../components/ui/Modal';
import { Button, TextareaField } from '../../../components/ui';
import { patch as leadPatchSchema } from '../../../services/schemas/lead';

import styles from './LeadsListPage.module.css';

/** Short enough to type in a hurry, long enough to mean something (§7). */
export const MIN_REASON_LENGTH = 3;

/** What `PATCH /admin/leads/:id` stores, so a longer reason is never typed only to be refused. */
export const MAX_REASON_LENGTH = leadPatchSchema.lostReason.maxLength;

/**
 * Why a lead was lost — or why a batch of them were.
 *
 * "Lost" is the one status change that asks a question first: it is the end of
 * the funnel, and a pipeline full of closed leads with no reason between them
 * teaches nobody anything. The dialog refuses an empty answer rather than
 * sending one, and the API refuses it too (QA-53) — the bulk bar used to close
 * leads with no reason at all.
 *
 * The caller closes the dialog once the change is saved, so a refused one
 * leaves the reason where it was typed.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} [props.name] the lead being closed
 * @param {number} [props.count] or how many, from the bulk bar
 * @param {(reason: string) => void} props.onConfirm
 * @param {() => void} props.onClose
 * @param {boolean} [props.loading]
 */
export default function LostReasonDialog({
  open,
  name,
  count,
  onConfirm,
  onClose,
  loading = false,
}) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setTouched(false);
    }
  }, [open]);

  const trimmed = reason.trim();
  const invalid = trimmed.length < MIN_REASON_LENGTH;
  const many = typeof count === 'number' && !name;

  const submit = () => {
    setTouched(true);
    if (invalid || loading) return;
    onConfirm(trimmed);
  };

  const intro = many
    ? `${count} ${count === 1 ? 'lead leaves' : 'leads leave'} the pipeline here. The reason is recorded on each of them.`
    : name
      ? `“${name}” leaves the pipeline here.`
      : null;

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={many ? 'Mark the selected leads as lost?' : 'Mark this lead as lost?'}
      size="sm"
      dismissible={!loading}
      showClose={!loading}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" loading={loading} onClick={submit}>
            Mark as lost
          </Button>
        </>
      }
    >
      {intro ? <p className={styles.dialogText}>{intro}</p> : null}
      <TextareaField
        label="Reason"
        required
        rows={3}
        value={reason}
        maxLength={MAX_REASON_LENGTH}
        placeholder="Bought elsewhere, budget too low, wrong number…"
        hint={`${reason.length}/${MAX_REASON_LENGTH} characters`}
        error={touched && invalid ? 'Say in a few words why this lead was lost.' : undefined}
        onChange={(event) => setReason(event.target.value)}
        onBlur={() => setTouched(true)}
      />
    </Modal>
  );
}
