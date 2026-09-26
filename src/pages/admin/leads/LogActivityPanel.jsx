import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { DateField, SelectField, TextField, TextareaField } from '../../../components/ui';
import { LEAD_CONTACT_TYPES, LEAD_STATUS } from '../../../config/enums';
import { PRESET_TIME, followUpPresets, istDateOf, istInstant } from './followUpPresets';
import { formatDateTime } from '../../../utils/format';

import styles from './LeadDetailPage.module.css';

/** "Keep" in the status select: the lead stays where it is. */
const KEEP = '';

/** The shortest reason a lost lead takes, as the dialog asks (QA-53). */
const LOST_REASON_MIN = 3;

/**
 * What happened, and what happens next — in one place (prompt 51).
 *
 * The desk used to record a conversation in three saves: the status in the
 * pipeline, the follow-up in its own box, the gist in the notes, each with its
 * own button and its own toast, and most calls were recorded in none of them.
 * Here a call, a WhatsApp, a visit or a meeting is one form: what it was, how
 * it went, anything worth keeping, where the lead stands now and when to come
 * back — with the three follow-ups a desk actually uses a press away.
 *
 * The conversation is logged first (`POST …/activities`); a new status or
 * follow-up is the `PATCH` sent beside it, so the timeline reads in the order
 * things happened. The status and follow-up controls further down the rail
 * stay for the changes that are not a conversation.
 *
 * @param {object} props
 * @param {object} props.lead
 * @param {(entry: {type: string, outcome: string|null, note: string|null},
 *   changes: object|null) => Promise<boolean>} props.onLog
 * @param {boolean} [props.busy]
 * @param {{type: string, nonce: number}|null} [props.prefill] set by the
 *   contact card's Call and WhatsApp buttons after they are pressed
 */
export default function LogActivityPanel({ lead, onLog, busy = false, prefill = null }) {
  const [type, setType] = useState('call');
  const [outcome, setOutcome] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState(KEEP);
  const [lostReason, setLostReason] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState(PRESET_TIME);
  const [touched, setTouched] = useState(false);
  const panelRef = useRef(null);

  // A press on Call or WhatsApp readies the form for what comes next, without
  // taking the focus away from the conversation it just started.
  const [seenPrefill, setSeenPrefill] = useState(prefill?.nonce ?? null);
  if (prefill && prefill.nonce !== seenPrefill) {
    setSeenPrefill(prefill.nonce);
    setType(prefill.type);
  }
  useEffect(() => {
    if (!prefill) return;
    panelRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [prefill]);

  const presets = followUpPresets();
  const lostError =
    touched && status === 'lost' && lostReason.trim().length < LOST_REASON_MIN
      ? `Say why the lead was lost — at least ${LOST_REASON_MIN} characters.`
      : undefined;

  const reset = () => {
    setOutcome('');
    setNote('');
    setStatus(KEEP);
    setLostReason('');
    setFollowUpDate('');
    setFollowUpTime(PRESET_TIME);
    setTouched(false);
  };

  const submit = async (event) => {
    event?.preventDefault();
    setTouched(true);
    if (status === 'lost' && lostReason.trim().length < LOST_REASON_MIN) return;

    const changes = {};
    if (status !== KEEP && status !== lead.status) changes.status = status;
    if (status === 'lost') changes.lostReason = lostReason.trim();
    const followUpAt = followUpDate ? istInstant(followUpDate, followUpTime) : null;
    if (followUpAt) changes.followUpAt = followUpAt;

    const logged = await onLog?.(
      { type, outcome: outcome.trim() || null, note: note.trim() || null },
      Object.keys(changes).length > 0 ? changes : null
    );
    if (logged) reset();
  };

  const statusOptions = [
    {
      value: KEEP,
      label: `Keep: ${LEAD_STATUS.labelOf(lead.status) || lead.status}`,
    },
    ...LEAD_STATUS.options.filter((option) => option.value !== lead.status),
  ];

  return (
    <Card
      as="section"
      className={styles.railCard}
      aria-labelledby="lead-log-heading"
      ref={panelRef}
    >
      <form className={styles.railBlock} noValidate onSubmit={submit}>
        <h2 className={styles.railTitle} id="lead-log-heading">
          Log activity
        </h2>

        <fieldset className={styles.logTypes}>
          <legend className={styles.srOnly}>What happened</legend>
          {LEAD_CONTACT_TYPES.entries.map((entry) => (
            <label
              key={entry.value}
              className={[styles.logType, type === entry.value ? styles.logTypeOn : '']
                .filter(Boolean)
                .join(' ')}
            >
              <input
                type="radio"
                name="lead-activity-type"
                value={entry.value}
                checked={type === entry.value}
                disabled={busy}
                onChange={() => setType(entry.value)}
              />
              <Icon icon={entry.icon} width="16" height="16" aria-hidden="true" />
              {entry.label}
            </label>
          ))}
        </fieldset>

        <TextField
          label="How it went"
          value={outcome}
          maxLength={200}
          disabled={busy}
          placeholder="Interested, wants a Saturday visit"
          onChange={(event) => setOutcome(event.target.value)}
        />
        <TextareaField
          label="Note"
          rows={2}
          maxLength={2000}
          value={note}
          disabled={busy}
          onChange={(event) => setNote(event.target.value)}
        />

        <SelectField
          label="Status now"
          value={status}
          options={statusOptions}
          disabled={busy}
          onChange={(event) => setStatus(event.target.value)}
        />
        {status === 'lost' ? (
          <TextField
            label="Why it was lost"
            required
            value={lostReason}
            maxLength={300}
            error={lostError}
            disabled={busy}
            onChange={(event) => setLostReason(event.target.value)}
          />
        ) : null}

        <div className={styles.logNext}>
          <span className={styles.logNextLabel} id="lead-log-next">
            Next follow-up
          </span>
          <div className={styles.logPresets} role="group" aria-labelledby="lead-log-next">
            {presets.map((preset) => {
              const on = followUpDate === istDateOf(preset.at) && followUpTime === PRESET_TIME;
              return (
                <Button
                  key={preset.key}
                  size="sm"
                  variant={on ? 'secondary' : 'outline'}
                  aria-pressed={on}
                  disabled={busy}
                  title={formatDateTime(preset.at)}
                  onClick={() => {
                    setFollowUpDate(istDateOf(preset.at));
                    setFollowUpTime(PRESET_TIME);
                  }}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
          <div className={styles.followUpFields}>
            <DateField
              label="Date"
              value={followUpDate}
              disabled={busy}
              onChange={(event) => setFollowUpDate(event.target.value)}
            />
            <TextField
              label="Time"
              type="time"
              value={followUpTime}
              disabled={busy || !followUpDate}
              onChange={(event) => setFollowUpTime(event.target.value)}
            />
          </div>
        </div>

        <div className={styles.railActions}>
          <Button type="submit" size="sm" loading={busy}>
            {LEAD_CONTACT_TYPES.meta[type]?.action ?? 'Log activity'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
