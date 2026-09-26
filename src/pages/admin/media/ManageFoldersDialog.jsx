import { useState } from 'react';
import { Icon } from '@iconify/react';

import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import mediaService from '../../../services/mediaService';
import { TextField } from '../../../components/ui/FormField';
import { cleanFolder, cloudinaryFolder } from './useMediaUpload';
import { fieldErrorsOf } from './MediaAddUrlDialog';
import { firstFieldMessage } from '../../../services/apiError';
import { formatNumber } from '../../../utils/format';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './MediaLibraryPage.module.css';

/** The longest folder a record keeps (`media.folder`, §6.12). */
const FOLDER_MAX_LENGTH = 120;

/**
 * "Manage folders" — every folder with what it holds, and a rename per row
 * (prompt 51).
 *
 * A folder is a string on its files (D12), so a typo'd one used to be
 * permanent: the only way out was opening each file and retyping it. A rename
 * here refiles every file of the folder — and of the folders inside it — in
 * one request. A name another folder already has is refused until the editor
 * says to merge the two.
 *
 * What it does **not** do is said on the dialog, because it is the question
 * everybody asks: the files keep their addresses, so Cloudinary keeps each one
 * under the path it was uploaded to. Only the library's filing moves.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {Array<{name: string, count: number|null}>} props.folders
 * @param {(result: {from: string, to: string, moved: number, merged: boolean}) => void} props.onRenamed
 */
export default function ManageFoldersDialog({ open, onClose, folders = [], onRenamed }) {
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [existing, setExisting] = useState(null);
  const [busy, setBusy] = useState(false);

  // A dialog that reopens starts with no row open.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setEditing(null);
  }

  const start = (folder) => {
    setEditing(folder);
    setName(folder);
    setError('');
    setExisting(null);
  };

  const stop = () => {
    setEditing(null);
    setError('');
    setExisting(null);
  };

  const rename = async ({ merge = false } = {}) => {
    const to = cleanFolder(name);
    if (!to) {
      setError('Name the folder.');
      return;
    }
    if (to.length > FOLDER_MAX_LENGTH) {
      setError(`A folder name can be at most ${FOLDER_MAX_LENGTH} characters.`);
      return;
    }
    if (to === editing) {
      stop();
      toast.info('The folder already has that name — nothing changed.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const response = await mediaService.renameFolder({ from: editing, to, merge });
      const result = response?.data ?? { from: editing, to, moved: 0, merged: merge };
      toast.success(
        response?.message ||
          `Moved ${result.moved} ${result.moved === 1 ? 'file' : 'files'} to “${result.to}”.`
      );
      stop();
      onRenamed?.(result);
    } catch (thrown) {
      const collision = thrown?.data?.existing;
      if (thrown?.status === 422 && collision) {
        setExisting(collision);
      } else {
        const fields = fieldErrorsOf(thrown);
        setError(
          fields.to ||
            fields.from ||
            firstFieldMessage(thrown, 'The folder could not be renamed. Try again.')
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const clean = cleanFolder(name);

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title="Manage folders"
      description="Rename a folder to refile every file in it — and in the folders inside it."
      size="sm"
      mobile="fullscreen"
      footer={
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Done
        </Button>
      }
    >
      <p className={styles.manageNote}>
        <Icon icon="mdi:information-outline" width="16" height="16" aria-hidden="true" />
        <span>
          A rename changes the library’s filing only. Each file keeps its address, so Cloudinary
          keeps it under the path it was uploaded to and nothing on the site that shows it breaks.
        </span>
      </p>

      {folders.length === 0 ? (
        <p className={styles.manageEmpty}>No folder holds a file yet.</p>
      ) : (
        <ul className={styles.manageList} aria-label="Folders">
          {folders.map((entry) => (
            <li key={entry.name} className={styles.manageRow}>
              {editing === entry.name ? (
                <form
                  className={styles.manageForm}
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    rename();
                  }}
                >
                  <TextField
                    label={`New name for “${entry.name}”`}
                    value={name}
                    error={error || undefined}
                    maxLength={FOLDER_MAX_LENGTH + 20}
                    hint={
                      clean
                        ? `New uploads go to ${cloudinaryFolder(clean)}; the files already filed stay where they are on Cloudinary.`
                        : 'A slash makes a folder inside a folder.'
                    }
                    onChange={(event) => {
                      setName(event.target.value);
                      setError('');
                      setExisting(null);
                    }}
                  />
                  {existing ? (
                    <Alert tone="warning" title={`“${existing.name}” already exists`}>
                      It holds {formatNumber(existing.count)}{' '}
                      {existing.count === 1 ? 'file' : 'files'}. Merge to move the files of “
                      {entry.name}” in beside them, or choose another name.
                    </Alert>
                  ) : null}
                  <span className={styles.manageActions}>
                    <Button variant="ghost" size="sm" onClick={stop} disabled={busy}>
                      Cancel
                    </Button>
                    {existing ? (
                      <Button size="sm" loading={busy} onClick={() => rename({ merge: true })}>
                        Merge into “{existing.name}”
                      </Button>
                    ) : (
                      <Button type="submit" size="sm" loading={busy}>
                        Rename
                      </Button>
                    )}
                  </span>
                </form>
              ) : (
                <>
                  <Icon
                    icon="mdi:folder-outline"
                    width="18"
                    height="18"
                    aria-hidden="true"
                    className={styles.railIcon}
                  />
                  <span className={styles.manageName}>{entry.name}</span>
                  <span className={styles.railCount}>
                    {entry.count === null
                      ? ''
                      : `${formatNumber(entry.count)} ${entry.count === 1 ? 'file' : 'files'}`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy || editing !== null}
                    aria-label={`Rename ${entry.name}`}
                    onClick={() => start(entry.name)}
                  >
                    Rename
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
