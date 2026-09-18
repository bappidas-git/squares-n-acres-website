import { useState } from 'react';
import { Icon } from '@iconify/react';

import mediaService from '../../../services/mediaService';
import { Alert, Button, Modal, SelectField, TextField } from '../../../components/ui';
import { MEDIA_TYPES } from '../../../config/enums';
import { URL_PATTERN } from '../../../utils/validation';
import { firstFieldMessage } from '../../../services/apiError';
import { parseCloudinary } from '../../../utils/cloudinary';

import styles from './MediaLibraryPage.module.css';

/** Extensions that say what a file is, when the URL carries one (§6.12). */
const EXTENSION_TYPES = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico'],
  video: ['mp4', 'webm', 'mov', 'm4v', 'ogv'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'],
};

/** Hosts that only ever serve pictures, for the URLs that carry no extension. */
const IMAGE_HOSTS = [/(^|\.)picsum\.photos$/i, /(^|\.)images\.unsplash\.com$/i];

/** Hosts that serve video players rather than files. */
const VIDEO_HOSTS = [/(^|\.)youtube\.com$/i, /(^|\.)youtu\.be$/i, /(^|\.)vimeo\.com$/i];

/**
 * What a URL says about itself (§4.4 of prompt 39).
 *
 * The extension first, because it is the only thing that is ever certain; the
 * host second, because `picsum.photos/seed/x/1600/900` has no extension and is
 * unmistakably a photograph — and the seed is full of them, so guessing
 * "document" there would file half the library wrongly.
 *
 * Exported for the unit test.
 *
 * @param {string} url
 * @returns {{type: 'image'|'video'|'document', provider: 'cloudinary'|'external',
 *            format: string|null}}
 */
export function describeUrl(url) {
  const value = String(url ?? '').trim();
  const cloudinary = parseCloudinary(value);

  let host = '';
  let pathname = value;
  try {
    const parsed = new URL(value);
    host = parsed.host;
    pathname = parsed.pathname;
  } catch (_thrown) {
    host = '';
  }

  const match = /\.([a-z0-9]+)$/i.exec(pathname);
  const format = match ? match[1].toLowerCase() : (cloudinary?.format ?? null);

  const byExtension = Object.entries(EXTENSION_TYPES).find(([, list]) =>
    list.includes(String(format))
  );

  let type = byExtension?.[0] ?? null;
  if (!type && VIDEO_HOSTS.some((pattern) => pattern.test(host))) type = 'video';
  if (!type && IMAGE_HOSTS.some((pattern) => pattern.test(host))) type = 'image';
  if (!type) type = cloudinary?.resourceType === 'video' ? 'video' : 'image';

  return { type, provider: cloudinary ? 'cloudinary' : 'external', format };
}

/**
 * The fields behind "Add by URL", without the dialog around them.
 *
 * The media library opens this in a `Modal`; the picker shows it as a tab, so
 * somebody choosing a picture for a page can paste one without leaving the
 * dialog they are already in (§5). Both get the same required `alt` — a record
 * with no alt text is a picture nobody can describe later (§6.12, §8.3).
 *
 * @param {object} props
 * @param {string} [props.folder] pre-filled, and offered as a datalist
 * @param {string[]} [props.folders] the folders that already exist
 * @param {(record: object) => void} props.onCreated
 * @param {() => void} [props.onCancel]
 * @param {string} [props.submitLabel]
 */
export function MediaUrlForm({
  folder = '',
  folders = [],
  onCreated,
  onCancel,
  submitLabel = 'Add to library',
}) {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState(folder);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  const [lastFolder, setLastFolder] = useState(folder);
  if (folder !== lastFolder) {
    setLastFolder(folder);
    setTarget(folder);
  }

  const trimmed = url.trim();
  const described = trimmed ? describeUrl(trimmed) : null;

  // The detected type is a suggestion, so it is derived from the address on
  // every render rather than copied into state — until the editor overrules
  // it, at which point their choice is the state and the address stops
  // speaking for them.
  const [chosenType, setChosenType] = useState(null);
  const type = chosenType ?? described?.type ?? 'image';

  const urlError = touched && !URL_PATTERN.test(trimmed) ? 'Paste a complete https:// link.' : '';
  const altError = touched && alt.trim() === '' ? 'Describe the file — this is required.' : '';

  const submit = async () => {
    setTouched(true);
    if (!URL_PATTERN.test(trimmed) || alt.trim() === '') return;

    setBusy(true);
    setFailure('');
    try {
      const { data } = await mediaService.create({
        url: trimmed,
        provider: described.provider,
        type,
        format: described.format,
        alt: alt.trim(),
        title: title.trim() || null,
        folder: target.trim() || null,
        tags: [],
      });
      onCreated?.(data);
      setUrl('');
      setAlt('');
      setTitle('');
      setTouched(false);
      setChosenType(null);
    } catch (thrown) {
      setFailure(firstFieldMessage(thrown, 'The file could not be added to the library.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.urlForm}>
      {failure ? (
        <Alert tone="error" title="Not added">
          {failure}
        </Alert>
      ) : null}

      <TextField
        label="File address"
        required
        type="url"
        value={url}
        error={urlError}
        placeholder="https://…"
        hint="A picture, a video or a document that is already online."
        onBlur={() => setTouched(true)}
        onChange={(event) => setUrl(event.target.value)}
      />

      <TextField
        label="Alt text"
        required
        value={alt}
        error={altError}
        maxLength={200}
        hint="What the file shows. A screen reader reads this, and Google indexes the picture by it."
        onBlur={() => setTouched(true)}
        onChange={(event) => setAlt(event.target.value)}
      />

      <TextField
        label="Title"
        value={title}
        maxLength={200}
        hint="Optional. What this file is called in the library."
        onChange={(event) => setTitle(event.target.value)}
      />

      <div className={styles.urlFormRow}>
        <SelectField
          label="Type"
          options={MEDIA_TYPES.options}
          value={type}
          hint={
            described
              ? `Worked out from the address — change it if that is wrong.`
              : 'Worked out from the address once you paste one.'
          }
          onChange={(event) => setChosenType(event.target.value)}
        />

        <TextField
          label="Folder"
          value={target}
          maxLength={120}
          list="sna-media-folders"
          placeholder="e.g. properties"
          hint="Optional. Groups the file in the library."
          onChange={(event) => setTarget(event.target.value)}
        />
        <datalist id="sna-media-folders">
          {folders.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      {described ? (
        <p className={styles.urlFormNote}>
          <Icon icon="mdi:information-outline" width="14" height="14" aria-hidden="true" />
          {described.provider === 'cloudinary'
            ? 'This is a Cloudinary file, so the site will serve it at the size each screen needs.'
            : 'This file is hosted elsewhere, so it is used exactly as it is.'}
        </p>
      ) : null}

      <div className={styles.urlFormActions}>
        {onCancel ? (
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
        <Button variant="primary" loading={busy} onClick={submit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * "Add by URL" — a file that is already online, recorded in the library.
 *
 * Nothing is uploaded and nothing is copied: the record points at the address
 * given, which is how every seed picture and every client-supplied link gets
 * in. It is also the *only* way in when Cloudinary is not configured, which is
 * why it is never hidden (§7).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(record: object) => void} props.onCreated
 * @param {string} [props.folder]
 * @param {string[]} [props.folders]
 */
export default function MediaAddUrlDialog({ open, onClose, onCreated, folder, folders }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a file by address"
      description="The file stays where it is — the library records where to find it."
      size="sm"
      mobile="fullscreen"
    >
      <MediaUrlForm
        folder={folder}
        folders={folders}
        onCancel={onClose}
        onCreated={(record) => {
          onCreated?.(record);
          onClose?.();
        }}
      />
    </Modal>
  );
}
