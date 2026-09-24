import { useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { LEAD_PIPELINE, LEAD_STATUS } from '../../../config/enums';

import styles from './LeadDetailPage.module.css';

/**
 * The funnel, as the control that moves a lead along it (§6.17).
 *
 * Six rungs — new, contacted, qualified, site visit, negotiation, converted —
 * each a button, so getting a lead to the next stage is one press. "Lost" is
 * not a rung: it is where a lead leaves the funnel, which is why it sits below
 * as its own action and asks for a reason on the way out.
 *
 * Moving **forward** is what the screen is for and happens immediately. Moving
 * **backwards** asks first: a mis-click that demotes a lead from Negotiation to
 * Contacted rewrites the history of a deal, and the confirmation costs one
 * press against that.
 *
 * @param {object} props
 * @param {string} props.status the lead's current status
 * @param {string} [props.lostReason]
 * @param {(status: string) => void} props.onChange
 * @param {() => void} props.onLost opens the reason dialog
 * @param {boolean} [props.busy] a PATCH is in flight
 */
export default function LeadPipeline({ status, lostReason, onChange, onLost, busy = false }) {
  const [pending, setPending] = useState(null);

  const isLost = status === 'lost';
  const current = LEAD_PIPELINE.indexOf(status);

  const choose = (next, index) => {
    if (next === status) return;
    // Anything that is not a step forward through the funnel — including
    // reopening a lost lead — is a rewrite of what happened, so it is asked
    // about rather than done.
    if (isLost || index < current) {
      setPending(next);
      return;
    }
    onChange(next);
  };

  return (
    <div className={styles.pipeline}>
      <h2 className={styles.railTitle}>Pipeline</h2>

      <ol className={styles.steps} aria-label="Lead pipeline">
        {LEAD_PIPELINE.map((value, index) => {
          const done = !isLost && current > -1 && index < current;
          const active = !isLost && index === current;
          const label = LEAD_STATUS.labelOf(value);

          return (
            <li
              key={value}
              className={[
                styles.step,
                done ? styles.stepDone : '',
                active ? styles.stepActive : '',
                isLost ? styles.stepLost : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={active ? 'step' : undefined}
            >
              <button
                type="button"
                className={styles.stepButton}
                disabled={busy}
                aria-label={active ? `${label} — the current stage` : `Move to ${label}`}
                onClick={() => choose(value, index)}
              >
                <span className={styles.stepMarker} aria-hidden="true">
                  {done ? <Icon icon="mdi:check" width="14" height="14" /> : index + 1}
                </span>
                <span className={styles.stepLabel}>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {isLost ? (
        <>
          <p className={styles.lostBanner} role="status">
            <Icon icon="mdi:close-circle-outline" width="18" height="18" aria-hidden="true" />
            <span>
              <span className={styles.lostLabel}>Lost</span>
              {lostReason ? <span className={styles.lostReason}>{lostReason}</span> : null}
            </span>
          </p>
          {/* The rungs are faded, and nothing else said they still work. */}
          <p className={styles.emptyLine}>Choose a stage above to reopen the lead.</p>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          icon={<Icon icon="mdi:close-circle-outline" width="16" height="16" />}
          onClick={onLost}
        >
          Mark as lost
        </Button>
      )}

      {/* Reopening a lost lead is not "moving it back" — it was never on the
          rung it goes to — so it asks its own question (QA-53). */}
      <ConfirmDialog
        open={Boolean(pending)}
        title={isLost ? 'Reopen this lead?' : 'Move this lead back?'}
        message={
          pending
            ? isLost
              ? `The lead goes back into the pipeline at ${LEAD_STATUS.labelOf(pending)}. Why it was lost stays in the timeline.`
              : `The lead goes from ${LEAD_STATUS.labelOf(status)} to ${LEAD_STATUS.labelOf(pending)}. The change is recorded in the timeline.`
            : undefined
        }
        confirmLabel={isLost ? 'Reopen' : 'Move it'}
        loading={busy}
        onClose={() => setPending(null)}
        onConfirm={() => {
          const next = pending;
          setPending(null);
          if (next) onChange(next);
        }}
      />
    </div>
  );
}
