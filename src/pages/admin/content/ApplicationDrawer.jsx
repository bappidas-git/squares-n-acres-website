import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import StatusChip from '../../../components/admin/StatusChip';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';
import { Button, Drawer, SelectField, TextareaField } from '../../../components/ui';
import { JOB_APPLICATION_STATUS } from '../../../config/enums';
import { formatDateTime, formatRelative } from '../../../utils/format';

import styles from './JobApplicationsPage.module.css';

/** `tel:+919845100121`, or `''`. */
const telHref = (phone) => (phone ? `tel:${String(phone).replace(/[^\d+]/g, '')}` : '');

/**
 * One labelled line of the panel; absent when there is nothing to show.
 *
 * `value` decides, not `children`: a link around nothing is still an element,
 * and a missing phone drew a "Phone" line with an empty link under it (QA-61).
 */
function Row({ label, value, children }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className={styles.row}>
      <dt className={styles.rowLabel}>{label}</dt>
      <dd className={styles.rowValue}>{children ?? value}</dd>
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
 * A note being typed is the editor's until it is saved or given up (QA-61):
 * it used to be written over with the stored one whenever the panel's record
 * changed — so changing the status, which is the commonest thing to do next,
 * threw it away — and closing the panel lost it without a word.
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
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const openId = application?.id ?? null;
  const storedNotes = application?.notes ?? '';
  const storedRef = useRef(storedNotes);
  storedRef.current = storedNotes;

  // Each opening starts from the record it is about — another application, or
  // the same one opened again — and only then: the record is replaced by every
  // write and every read of the desk, a status change among them.
  useEffect(() => {
    setNotes(storedRef.current);
    setConfirmDiscard(false);
  }, [openId]);

  const open = Boolean(application);
  const entry = application ? (JOB_APPLICATION_STATUS.meta[application.status] ?? {}) : {};
  const dirty = open && storedNotes !== notes;

  // Leaving the screen or reloading it with a note half-written asks first.
  useUnsavedChanges(dirty);

  /** Escape, the backdrop, × and "Close" all ask first when a note would be lost. */
  const requestClose = () => {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await onNotesChange(notes);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={requestClose}
        title={application?.name ?? 'Application'}
        closeLabel="Close the application"
        PaperProps={{ className: styles.drawerPaper }}
        footer={
          <>
            <Button variant="ghost" onClick={requestClose}>
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
              <Row
                label="Applied for"
                value={application.job ? application.job.title : `Job #${application.jobId}`}
              />
              <Row label="E-mail" value={application.email}>
                <a href={`mailto:${application.email}`}>{application.email}</a>
              </Row>
              <Row label="Phone" value={application.phone}>
                <a href={telHref(application.phone)}>{application.phone}</a>
              </Row>
              <Row label="Résumé" value={application.resumeUrl}>
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
              <Row label="LinkedIn" value={application.linkedinUrl}>
                <a
                  href={application.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.externalLink}
                >
                  {application.linkedinUrl}
                  <Icon icon="mdi:open-in-new" width="16" height="16" aria-hidden="true" />
                </a>
              </Row>
              <Row label="Received" value={formatDateTime(application.createdAt)} />
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
                disabled={savingNotes}
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

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard your note?"
        message={`The note you typed for “${application?.name ?? 'this application'}” has not been saved.`}
        confirmLabel="Discard note"
        cancelLabel="Keep editing"
        danger
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          // "Keep editing" fades this out with "Discard" under the pointer: a
          // press that lands then must not throw the note away.
          if (!confirmDiscard) return;
          setConfirmDiscard(false);
          setNotes(storedNotes);
          onClose();
        }}
      />
    </>
  );
}
