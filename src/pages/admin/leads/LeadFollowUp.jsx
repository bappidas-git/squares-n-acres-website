import { useEffect, useState } from 'react';

import Button from '../../../components/ui/Button';
import StatusChip from '../../../components/admin/StatusChip';
import { DateField, TextField } from '../../../components/ui';
import { formatDateTime } from '../../../utils/format';
import { isFollowUpOverdue } from './leadColumns';

import styles from './LeadDetailPage.module.css';

/** The time a follow-up defaults to when only a date is given: mid-morning. */
const DEFAULT_TIME = '10:00';

/**
 * India Standard Time, which has no daylight saving, so the offset is a
 * constant rather than something to look up (D22).
 */
const IST = 'Asia/Kolkata';
const IST_OFFSET = '+05:30';

/**
 * When we said we would come back to them (§6.7 `followUpAt`).
 *
 * A date and a time, because "Thursday" is not a plan and the overdue marker
 * that the list and this rail both show has to know which Thursday.
 *
 * Both inputs are read and written in IST rather than in the browser's own
 * timezone (D22), so the fields agree with the date printed above them
 * whatever clock the laptop is set to; the API is sent the ISO instant.
 *
 * @param {object} props
 * @param {object} props.lead
 * @param {(followUpAt: string|null) => Promise<void>} props.onSave
 * @param {boolean} [props.busy]
 */
export default function LeadFollowUp({ lead, onSave, busy = false }) {
  const [date, setDate] = useState(() => datePartOf(lead.followUpAt));
  const [time, setTime] = useState(() => timePartOf(lead.followUpAt));

  // A PATCH elsewhere on the screen re-reads the lead; the inputs follow it
  // rather than keeping what was typed before the answer came back.
  useEffect(() => {
    setDate(datePartOf(lead.followUpAt));
    setTime(timePartOf(lead.followUpAt));
  }, [lead.followUpAt]);

  const overdue = isFollowUpOverdue(lead);
  const dirty = date !== datePartOf(lead.followUpAt) || time !== timePartOf(lead.followUpAt);

  const save = () => {
    if (!date) {
      onSave(null);
      return;
    }
    const instant = new Date(`${date}T${time || DEFAULT_TIME}:00${IST_OFFSET}`);
    if (Number.isNaN(instant.getTime())) return;
    onSave(instant.toISOString());
  };

  return (
    <div className={styles.railBlock}>
      <h2 className={styles.railTitle}>Follow-up</h2>

      {lead.followUpAt ? (
        <p className={styles.railValue}>
          {formatDateTime(lead.followUpAt)}
          {overdue ? <StatusChip tone="error" icon="mdi:alert-outline" label="Overdue" /> : null}
        </p>
      ) : (
        <p className={styles.emptyLine}>No follow-up set.</p>
      )}

      <div className={styles.followUpFields}>
        <DateField
          label="Date"
          value={date}
          disabled={busy}
          onChange={(event) => setDate(event.target.value)}
        />
        <TextField
          label="Time"
          type="time"
          value={time}
          disabled={busy || !date}
          onChange={(event) => setTime(event.target.value)}
        />
      </div>

      <div className={styles.railActions}>
        <Button size="sm" disabled={busy || !dirty} onClick={save}>
          Save
        </Button>
        {lead.followUpAt ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onSave(null)}>
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** `2026-09-24` from an ISO instant, in IST — the format `<input type=date>` reads. */
function datePartOf(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(date);
}

/** `16:30` from an ISO instant, in IST. */
function timePartOf(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return DEFAULT_TIME;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: IST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
