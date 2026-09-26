import { useState } from 'react';

import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { TextField } from '../../../components/ui/FormField';
import { cleanFolder, cloudinaryFolder } from './useMediaUpload';

/** What a folder name may run to — the record's `folder` column (§6.12). */
export const FOLDER_MAX_LENGTH = 120;

/**
 * "New folder" (prompt 51).
 *
 * A folder in this library is a string on its files (D12): there is nothing to
 * create until a file is filed in it. The library used to leave that unsaid —
 * the only folder inputs were free-text boxes inside the upload zone, the
 * Add-by-URL dialog and the file drawer — so editors went looking for a "New
 * folder" button that did not exist. This is that button, and it says the
 * truth: the name is kept, the next file goes into it, and the folder appears
 * in the list once it holds one.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(name: string) => void} props.onCreate the cleaned name
 * @param {Array<{name: string}>} [props.existing] the folders the library has
 * @param {boolean} [props.uploadsOn] whether the next step is an upload or an address
 */
export default function NewFolderDialog({
  open,
  onClose,
  onCreate,
  existing = [],
  uploadsOn = false,
}) {
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);

  // A dialog that reopens starts empty.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName('');
      setTouched(false);
    }
  }

  const clean = cleanFolder(name);
  const already = existing.some((entry) => (entry?.name ?? entry) === clean);
  const error = !touched
    ? undefined
    : !clean
      ? 'Name the folder — for example “campaigns/diwali”.'
      : clean.length > FOLDER_MAX_LENGTH
        ? `A folder name can be at most ${FOLDER_MAX_LENGTH} characters.`
        : undefined;

  const submit = (event) => {
    event?.preventDefault();
    setTouched(true);
    if (!clean || clean.length > FOLDER_MAX_LENGTH) return;
    onCreate?.(clean);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New folder"
      description="A folder appears in the list once a file is filed in it."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="new-media-folder" disabled={!clean}>
            {uploadsOn ? 'Create and upload' : 'Create and add a file'}
          </Button>
        </>
      }
    >
      <form id="new-media-folder" noValidate onSubmit={submit}>
        <TextField
          label="Folder name"
          required
          value={name}
          maxLength={FOLDER_MAX_LENGTH + 20}
          error={error}
          hint={
            clean
              ? `Files go to “${clean}” — Cloudinary stores them under ${cloudinaryFolder(clean)}. A slash makes a folder inside a folder.`
              : 'A slash makes a folder inside a folder: “projects/aurelia”.'
          }
          onBlur={() => setTouched(true)}
          onChange={(event) => setName(event.target.value)}
        />
        {already ? (
          <Alert tone="info">“{clean}” already exists — the next file you add goes into it.</Alert>
        ) : null}
        <p>
          {uploadsOn
            ? 'Next, the upload zone opens with this folder chosen. Until a file lands in it, the folder shows as an empty, dashed chip — it is not kept if you leave the page first.'
            : 'Next, “Add by URL” opens with this folder chosen. Until a file lands in it, the folder shows as an empty, dashed chip — it is not kept if you leave the page first.'}
        </p>
      </form>
    </Modal>
  );
}
