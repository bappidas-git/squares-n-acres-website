import { useState } from 'react';
import { Icon } from '@iconify/react';

import Avatar from '../../../components/ui/Avatar';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import IconButton from '../../../components/ui/IconButton';
import { TextareaField } from '../../../components/ui';
import { formatDateTime, formatRelative } from '../../../utils/format';

import styles from './LeadDetailPage.module.css';

/**
 * What the desk has written about this lead (§6.7 `notes[]`).
 *
 * Newest first, because the last thing somebody wrote is the thing the next
 * caller needs. A note is yours to withdraw and nobody else's — the server
 * enforces that for a sales user (403) and the button follows the same rule,
 * so a control that would be refused is not offered.
 *
 * Ctrl/⌘ + Enter posts, which is what anybody typing into a box beside a phone
 * call will reach for.
 *
 * @param {object} props
 * @param {Array<object>} props.notes
 * @param {(text: string) => Promise<void>} props.onAdd
 * @param {(noteId: number|string) => Promise<void>} props.onDelete
 * @param {(note: object) => boolean} props.canDelete
 * @param {boolean} [props.busy]
 */
export default function LeadNotes({ notes = [], onAdd, onDelete, canDelete, busy = false }) {
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const ordered = [...notes].sort(
    (left, right) => Date.parse(right.createdAt ?? 0) - Date.parse(left.createdAt ?? 0)
  );

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    try {
      await onAdd(trimmed);
      setText('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card as="section" className={styles.card} aria-labelledby="lead-notes-heading">
      <h2 className={styles.cardTitle} id="lead-notes-heading">
        Notes
        <span className={styles.count}>{ordered.length}</span>
      </h2>

      <div className={styles.noteForm}>
        <TextareaField
          label="Add a note"
          rows={3}
          value={text}
          placeholder="What was said, what was promised, what happens next…"
          hint="Ctrl + Enter posts it."
          disabled={busy}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return;
            event.preventDefault();
            submit();
          }}
        />
        <Button size="sm" loading={adding} disabled={!text.trim() || busy} onClick={submit}>
          Add note
        </Button>
      </div>

      {ordered.length === 0 ? (
        <p className={styles.emptyLine}>No notes yet.</p>
      ) : (
        <ul className={styles.notes}>
          {ordered.map((note) => (
            <li key={note.id} className={styles.note}>
              <Avatar name={note.createdByName ?? 'Unknown'} size={32} />
              <div className={styles.noteBody}>
                <p className={styles.noteMeta}>
                  <span className={styles.noteAuthor}>{note.createdByName ?? 'Unknown'}</span>
                  <time dateTime={note.createdAt} title={formatDateTime(note.createdAt)}>
                    {formatRelative(note.createdAt)}
                  </time>
                </p>
                <p className={styles.noteText}>{note.text}</p>
              </div>
              {canDelete?.(note) ? (
                <IconButton
                  label={`Delete the note by ${note.createdByName ?? 'this author'}`}
                  size="sm"
                  disabled={busy}
                  onClick={() => setDeleting(note)}
                >
                  <Icon icon="mdi:delete-outline" width="18" height="18" />
                </IconButton>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this note?"
        message="The note goes; the timeline entry that records it was added stays."
        confirmLabel="Delete"
        danger
        loading={busy}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          const note = deleting;
          setDeleting(null);
          if (note) await onDelete(note.id);
        }}
      />
    </Card>
  );
}
