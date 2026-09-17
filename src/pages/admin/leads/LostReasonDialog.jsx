import { useEffect, useState } from 'react';

import Modal from '../../../components/ui/Modal';
import { Button, TextareaField } from '../../../components/ui';

import styles from './LeadsListPage.module.css';

/** Short enough to type in a hurry, long enough to mean something (§7). */
export const MIN_REASON_LENGTH = 3;

/**
 * Why a lead was lost.
 *
 * "Lost" is the one status change that asks a question first: it is the end of
 * the funnel, and a pipeline full of closed leads with no reason between them
 * teaches nobody anything. The dialog refuses an empty answer rather than
 * sending one, so the API never has to.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.name the lead being closed
 * @param {(reason: string) => void} props.onConfirm
 * @param {() => void} props.onClose
 * @param {boolean} [props.loading]
 */
export default function LostReasonDialog({ open, name, onConfirm, onClose, loading = false }) {
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

  const submit = () => {
    setTouched(true);
    if (invalid) return;
    onConfirm(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title="Mark this lead as lost?"
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
      {name ? <p className={styles.dialogText}>{`“${name}” leaves the pipeline here.`}</p> : null}
      <TextareaField
        label="Reason"
        required
        rows={3}
        value={reason}
        placeholder="Bought elsewhere, budget too low, wrong number…"
        error={touched && invalid ? 'Say in a few words why this lead was lost.' : undefined}
        onChange={(event) => setReason(event.target.value)}
        onBlur={() => setTouched(true)}
      />
    </Modal>
  );
}
