import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

import StatusChip from '../../../components/admin/StatusChip';
import { Button, Drawer, SelectField, TextareaField } from '../../../components/ui';
import { JOB_APPLICATION_STATUS } from '../../../config/enums';
import { formatDateTime, formatRelative } from '../../../utils/format';

import styles from './JobApplicationsPage.module.css';

/** `tel:+919845100121`, or `''`. */
const telHref = (phone) => (phone ? `tel:${String(phone).replace(/[^\d+]/g, '')}` : '');

/** One labelled line of the panel; absent when there is nothing to show. */
function Row({ label, children }) {
  if (!children) return null;
  return (
    <div className={styles.row}>
      <dt className={styles.rowLabel}>{label}</dt>
      <dd className={styles.rowValue}>{children}</dd>
    </div>
  );
}

/**
 * One application, in full (§6.11).
 *
 * The table carries what a triage needs at a glance; everything else — the
 * covering note, the LinkedIn profile, the internal note the desk keeps — is
 * here. The status select and the note are the two things this panel writes,
 * and each is its own `PATCH` (§5.8): a note saved by mistake must not also
 * move somebody to "Rejected".
 *
 * @param {object} props
 * @param {object|null} props.application `null` closes the panel
 * @param {() => void} props.onClose
 * @param {(status: string) => Promise<boolean>} props.onStatusChange
 * @param {(notes: string) => Promise<boolean>} props.onNotesChange
 * @param {() => void} props.onDelete
 * @param {boolean} [props.busy]
 */
export default function ApplicationDrawer({
  application,
  onClose,
  onStatusChange,
  onNotesChange,
  onDelete,
  busy = false,
}) {
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // The panel outlives one opening of it, so each opening starts from the
  // record it is about rather than from whatever was typed last time.
  useEffect(() => {
    setNotes(application?.notes ?? '');
  }, [application]);

  const open = Boolean(application);
  const entry = application ? (JOB_APPLICATION_STATUS.meta[application.status] ?? {}) : {};
  const dirty = (application?.notes ?? '') !== notes;

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await onNotesChange(notes);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={application?.name ?? 'Application'}
      closeLabel="Close the application"
      PaperProps={{ className: styles.drawerPaper }}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="danger"
            icon={<Icon icon="mdi:delete-outline" width="18" height="18" />}
            onClick={onDelete}
          >
            Delete
          </Button>
        </>
      }
    >
      {application ? (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <StatusChip
              tone={entry.tone ?? 'neutral'}
              label={JOB_APPLICATION_STATUS.labelOf(application.status)}
            />
            <span className={styles.panelMeta}>
              Applied {formatRelative(application.createdAt)}
            </span>
          </div>

          <SelectField
            label="Status"
            value={application.status ?? 'new'}
            options={JOB_APPLICATION_STATUS.options}
            disabled={busy}
            onChange={(event) => onStatusChange(event.target.value)}
          />

          <dl className={styles.rows}>
            <Row label="Applied for">
              {application.job ? application.job.title : `Job #${application.jobId}`}
            </Row>
            <Row label="E-mail">
              <a href={`mailto:${application.email}`}>{application.email}</a>
            </Row>
            <Row label="Phone">
              <a href={telHref(application.phone)}>{application.phone}</a>
            </Row>
            <Row label="Résumé">
              <a
                href={application.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.externalLink}
              >
                Open the résumé
                <Icon icon="mdi:open-in-new" width="16" height="16" aria-hidden="true" />
              </a>
            </Row>
            <Row label="LinkedIn">
              {application.linkedinUrl ? (
                <a
                  href={application.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.externalLink}
                >
                  {application.linkedinUrl}
                  <Icon icon="mdi:open-in-new" width="16" height="16" aria-hidden="true" />
                </a>
              ) : null}
            </Row>
            <Row label="Received">{formatDateTime(application.createdAt)}</Row>
          </dl>

          {application.coverLetter ? (
            <section className={styles.letter} aria-labelledby="application-letter">
              <h3 className={styles.sectionTitle} id="application-letter">
                Why this role
              </h3>
              <p className={styles.letterText}>{application.coverLetter}</p>
            </section>
          ) : null}

          <section className={styles.notes} aria-labelledby="application-notes">
            <h3 className={styles.sectionTitle} id="application-notes">
              Internal notes
            </h3>
            <TextareaField
              label="Notes"
              rows={5}
              maxLength={2000}
              value={notes}
              disabled={busy || savingNotes}
              hint="Only the hiring desk sees this. The applicant never does."
              onChange={(event) => setNotes(event.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              className={styles.notesSave}
              loading={savingNotes}
              disabled={!dirty || busy}
              onClick={saveNotes}
            >
              Save notes
            </Button>
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}
