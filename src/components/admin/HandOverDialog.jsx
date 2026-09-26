import { useState } from 'react';

import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { RadioGroup, SelectField } from '../ui/FormField';

import styles from './HandOverDialog.module.css';

const HAND_OVER = 'hand-over';
const KEEP = 'keep';

/**
 * "Ravi has 9 open leads" — the question asked before somebody who still holds
 * work is switched off or deleted (prompt 51): hand it to a colleague, or
 * leave it where the screen says it goes. The Users screen asks it about open
 * leads, the Team screen about the listings an advisor answers for.
 *
 * The dialog chooses; `onConfirm` does the work — the hand-over and then the
 * action that was asked for — and a refusal it throws is shown here, with the
 * dialog left open, so nothing is switched off with its work still stranded.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.title "Deactivate Ravi?"
 * @param {Array<{key: string, line: React.ReactNode}>} props.summary one line per person:
 *   who holds what
 * @param {Array<{value: string, label: string}>} props.candidates who may take it over
 * @param {string} [props.suggested] the candidate chosen to begin with
 * @param {string} props.handOverLabel "Hand them to a colleague"
 * @param {string} props.keepLabel "Leave them unassigned"
 * @param {React.ReactNode} props.keepNote what "keep" means, under the choice
 * @param {string} props.targetLabel the select's label, "Colleague"
 * @param {React.ReactNode} [props.footnote] what the action itself does
 * @param {{handOver: string, keep: string}} props.confirmLabels
 * @param {boolean} [props.danger] a delete
 * @param {(choice: {handOver: boolean, target: string|null}) => Promise<void>} props.onConfirm
 *   throws an `Error` whose message is shown when the work is refused
 * @param {() => void} props.onClose
 */
export default function HandOverDialog({
  open,
  title,
  summary = [],
  candidates = [],
  suggested = '',
  handOverLabel,
  keepLabel,
  keepNote,
  targetLabel,
  footnote,
  confirmLabels,
  danger = false,
  onConfirm,
  onClose,
}) {
  const [choice, setChoice] = useState(HAND_OVER);
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Each opening starts from the suggestion.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setChoice(HAND_OVER);
      setTarget('');
      setError('');
    }
  }

  const canHandOver = candidates.length > 0;
  const handingOver = choice === HAND_OVER && canHandOver;
  const chosen = target || suggested || (canHandOver ? candidates[0].value : '');

  const confirm = async () => {
    if (busy) return;
    if (handingOver && !chosen) {
      setError('Choose who takes them over.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onConfirm?.({ handOver: handingOver, target: handingOver ? chosen : null });
    } catch (thrown) {
      setError(thrown?.message || 'The hand-over could not be made.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      dismissible={!busy}
      size="sm"
      mobile="fullscreen"
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={confirm} loading={busy}>
            {handingOver ? confirmLabels.handOver : confirmLabels.keep}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <ul className={styles.summary}>
          {summary.map((entry) => (
            <li key={entry.key}>{entry.line}</li>
          ))}
        </ul>

        <RadioGroup
          label="What happens to them"
          column
          value={handingOver ? HAND_OVER : KEEP}
          onChange={(next) => {
            setChoice(next);
            setError('');
          }}
          options={[
            ...(canHandOver ? [{ value: HAND_OVER, label: handOverLabel }] : []),
            { value: KEEP, label: keepLabel },
          ]}
        />

        {handingOver ? (
          <SelectField
            label={targetLabel}
            value={chosen}
            options={candidates}
            onChange={(event) => {
              setTarget(event.target.value);
              setError('');
            }}
          />
        ) : (
          <p className={styles.note}>{keepNote}</p>
        )}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        {footnote ? <p className={styles.note}>{footnote}</p> : null}
      </div>
    </Modal>
  );
}
