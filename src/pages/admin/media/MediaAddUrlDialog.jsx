import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

import mediaService from '../../../services/mediaService';
import useDebounce from '../../../hooks/useDebounce';
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

/** The longest address the library stores (`media.url`, `VARCHAR(500)`; QA-63). */
export const URL_MAX_LENGTH = 500;

/** How long the address rests before the picture behind it is looked at. */
const PROBE_DELAY_MS = 400;

/**
 * What an address the API refused is called under the field it belongs to.
 * "The url has already been taken." is Laravel's sentence for the unique rule;
 * the editor is told what it means here (QA-63).
 *
 * @param {object} thrown the `ApiError`
 * @returns {{url?: string, alt?: string, title?: string, folder?: string}}
 */
export function fieldErrorsOf(thrown) {
  if (thrown?.status !== 422 || !thrown?.errors || typeof thrown.errors !== 'object') return {};
  const first = (key) => {
    const value = thrown.errors[key];
    return Array.isArray(value) ? value[0] : typeof value === 'string' ? value : undefined;
  };
  const url = first('url');
  return {
    url: url && /already been taken/i.test(url) ? 'This address is already in the library.' : url,
    alt: first('alt'),
    title: first('title'),
    folder: first('folder'),
  };
}

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
 * It is a form (QA-63): Enter in any box adds the file, as it does in every
 * other dialog of the admin. An address already in the library is refused
 * under the box it was typed in, and a picture is previewed and measured
 * before it is filed.
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
  // What the API said about each field, until that field changes (QA-63).
  const [refused, setRefused] = useState({});

  const [lastFolder, setLastFolder] = useState(folder);
  if (folder !== lastFolder) {
    setLastFolder(folder);
    setTarget(folder);
  }

  const trimmed = url.trim();
  const valid = URL_PATTERN.test(trimmed) && trimmed.length <= URL_MAX_LENGTH;
  const described = valid ? describeUrl(trimmed) : null;

  // The detected type is a suggestion, so it is derived from the address on
  // every render rather than copied into state — until the editor overrules
  // it, at which point their choice is the state and the address stops
  // speaking for them.
  const [chosenType, setChosenType] = useState(null);
  const type = chosenType ?? described?.type ?? 'image';

  // A picture is looked at before it is filed (QA-63): the editor sees what
  // the address shows — or that it shows nothing — and the record gets the
  // width and height the seed's pictures carry, which one added by address
  // never had.
  const probed = useDebounce(valid && type === 'image' ? trimmed : '', PROBE_DELAY_MS);
  const [probe, setProbe] = useState({ url: '', status: 'idle', width: null, height: null });
  useEffect(() => {
    if (!probed || typeof Image === 'undefined') return undefined;
    let alive = true;
    const image = new Image();
    image.onload = () => {
      if (!alive) return;
      setProbe({
        url: probed,
        status: 'loaded',
        width: image.naturalWidth || null,
        height: image.naturalHeight || null,
      });
    };
    image.onerror = () => {
      if (alive) setProbe({ url: probed, status: 'failed', width: null, height: null });
    };
    setProbe({ url: probed, status: 'loading', width: null, height: null });
    image.src = probed;
    return () => {
      alive = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [probed]);
  const seen = type === 'image' && probe.url === trimmed ? probe : null;

  const urlError = (() => {
    if (refused.url) return refused.url;
    if (!touched) return '';
    if (!URL_PATTERN.test(trimmed)) return 'Paste a complete https:// link.';
    if (trimmed.length > URL_MAX_LENGTH) {
      return `That address is ${trimmed.length} characters long. The library takes up to ${URL_MAX_LENGTH}.`;
    }
    return '';
  })();
  const altError =
    refused.alt || (touched && alt.trim() === '' ? 'Describe the file — this is required.' : '');

  const submit = async (event) => {
    event?.preventDefault?.();
    // One request at a time: Enter held down, or pressed beside a click.
    if (busy) return;
    setTouched(true);
    if (!valid || alt.trim() === '') return;

    setBusy(true);
    setFailure('');
    setRefused({});
    try {
      const { data } = await mediaService.create({
        url: trimmed,
        provider: described.provider,
        type,
        format: described.format,
        ...(seen?.status === 'loaded' && seen.width && seen.height
          ? { width: seen.width, height: seen.height }
          : null),
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
      const fields = fieldErrorsOf(thrown);
      if (Object.values(fields).some(Boolean)) {
        setRefused(fields);
        setFailure(
          fields.url || fields.alt
            ? ''
            : firstFieldMessage(thrown, 'The file could not be added to the library.')
        );
      } else {
        setFailure(firstFieldMessage(thrown, 'The file could not be added to the library.'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.urlForm} noValidate onSubmit={submit}>
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
        onChange={(event) => {
          setUrl(event.target.value);
          if (refused.url) setRefused((state) => ({ ...state, url: undefined }));
        }}
      />

      {seen && seen.status !== 'idle' ? (
        <div className={styles.urlFormPreview} aria-live="polite">
          {seen.status === 'loaded' ? (
            <>
              <img src={trimmed} alt="" className={styles.urlFormThumb} />
              <span>
                {seen.width && seen.height
                  ? `${seen.width} × ${seen.height} — this is the picture that will be filed.`
                  : 'This is the picture that will be filed.'}
              </span>
            </>
          ) : seen.status === 'failed' ? (
            <span className={styles.urlFormWarning}>
              <Icon icon="mdi:alert-outline" width="16" height="16" aria-hidden="true" />
              This address did not open as a picture here. Check it — the library records it either
              way.
            </span>
          ) : (
            <span>Looking at the picture…</span>
          )}
        </div>
      ) : null}

      <TextField
        label="Alt text"
        required
        value={alt}
        error={altError}
        maxLength={200}
        hint="What the file shows. A screen reader reads this, and Google indexes the picture by it."
        onBlur={() => setTouched(true)}
        onChange={(event) => {
          setAlt(event.target.value);
          if (refused.alt) setRefused((state) => ({ ...state, alt: undefined }));
        }}
      />

      <TextField
        label="Title"
        value={title}
        error={refused.title}
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
          error={refused.folder}
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
        <Button type="submit" variant="primary" loading={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
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
