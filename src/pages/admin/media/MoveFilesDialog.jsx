import { useState } from 'react';

import Button from '../../../components/ui/Button';
import FolderField from '../../../components/admin/FolderField';
import Modal from '../../../components/ui/Modal';
import { cleanFolder } from './useMediaUpload';

/** The longest folder a record keeps (`media.folder`, §6.12). */
const FOLDER_MAX_LENGTH = 120;

/**
 * "Move to folder" — the library's bulk refiling (prompt 51).
 *
 * The folder is chosen or typed in the same field every upload uses, so a
 * folder that does not exist yet is made by moving files into it, and "No
 * folder" takes them out of every one. Only the library's filing changes:
 * each file keeps its address, so nothing on Cloudinary moves.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {number} props.count how many files are selected
 * @param {Array<{name: string, count: number|null}>} props.folders
 * @param {string} [props.current] the folder on screen, offered away from
 * @param {boolean} [props.busy]
 * @param {() => void} props.onClose
 * @param {(folder: string|null) => void} props.onMove the cleaned folder, or `null`
 */
export default function MoveFilesDialog({
  open,
  count = 0,
  folders = [],
  current = '',
  busy = false,
  onClose,
  onMove,
}) {
  const [folder, setFolder] = useState('');
  const [touched, setTouched] = useState(false);

  // A dialog that reopens starts empty.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFolder('');
      setTouched(false);
    }
  }

  const clean = folder === null ? null : cleanFolder(folder);
  const error = !touched
    ? undefined
    : clean === ''
      ? 'Choose a folder, type a new one, or pick “No folder”.'
      : clean && clean.length > FOLDER_MAX_LENGTH
        ? `A folder name can be at most ${FOLDER_MAX_LENGTH} characters.`
        : clean && clean === current
          ? 'The files on screen are in this folder already.'
          : undefined;
  const noun = count === 1 ? 'file' : 'files';

  const submit = (event) => {
    event?.preventDefault();
    setTouched(true);
    if (clean === '' || (clean && (clean.length > FOLDER_MAX_LENGTH || clean === current))) return;
    onMove?.(clean);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={`Move ${count} ${noun}`}
      description="Only the library's filing changes: each file keeps its address, so nothing on the site or on Cloudinary moves."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="move-media-files" loading={busy}>
            Move
          </Button>
        </>
      }
    >
      <form id="move-media-files" noValidate onSubmit={submit}>
        <FolderField
          label="Move to"
          value={folder}
          folders={folders.filter((entry) => entry.name !== current)}
          allowNone
          error={error}
          onChange={(next) => {
            setFolder(next);
            setTouched(false);
          }}
        />
      </form>
    </Modal>
  );
}
