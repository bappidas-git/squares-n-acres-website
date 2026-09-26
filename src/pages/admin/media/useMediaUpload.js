import { useCallback, useEffect, useRef, useState } from 'react';

import mediaService from '../../../services/mediaService';
import useCloudinaryConfig from '../../../hooks/useCloudinaryConfig';
import { firstFieldMessage } from '../../../services/apiError';
import { uploadToCloudinary } from '../../../utils/cloudinary';

/** Two at a time: enough to keep a connection busy, few enough to keep the bars readable. */
const MAX_CONCURRENT = 2;

/** One automatic retry, then the row asks the editor (§7). */
const MAX_ATTEMPTS = 2;

const MB = 1024 * 1024;

/**
 * What may be uploaded, per kind (§4.3 of prompt 39).
 *
 * The limits are the ones the browser can enforce before a byte leaves it,
 * which is the only place they can be enforced at all: the binary never
 * touches our API (D12), so an oversized file would otherwise be Cloudinary's
 * problem to refuse, several megabytes later.
 */
export const MEDIA_LIMITS = {
  image: {
    label: 'Images',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'],
    maxBytes: 10 * MB,
    maxLabel: '10 MB',
    resourceType: 'image',
  },
  video: {
    label: 'Videos',
    extensions: ['mp4', 'webm'],
    maxBytes: 100 * MB,
    maxLabel: '100 MB',
    resourceType: 'video',
  },
  document: {
    label: 'Documents',
    extensions: ['pdf', 'doc', 'docx'],
    maxBytes: 10 * MB,
    maxLabel: '10 MB',
    resourceType: 'auto',
  },
};

/** The kinds an `accept` value allows, widest first. */
export const kindsFor = (accept = 'any') =>
  accept === 'any' || !MEDIA_LIMITS[accept] ? Object.keys(MEDIA_LIMITS) : [accept];

/** The `accept` attribute of a file input, e.g. `.jpg,.png,…`. */
export const acceptAttribute = (accept = 'any') =>
  kindsFor(accept)
    .flatMap((kind) => MEDIA_LIMITS[kind].extensions.map((extension) => `.${extension}`))
    .join(',');

/** A one-line "PDF, DOC or DOCX, up to 10 MB" for the drop zone. */
export function acceptHint(accept = 'any') {
  return kindsFor(accept)
    .map((kind) => {
      const limit = MEDIA_LIMITS[kind];
      return `${limit.extensions.join(', ').toUpperCase()} up to ${limit.maxLabel}`;
    })
    .join(' · ');
}

/** A file name's extension, lowercase and without the dot. */
export const extensionOf = (name) => {
  const match = /\.([a-z0-9]+)$/i.exec(String(name ?? ''));
  return match ? match[1].toLowerCase() : '';
};

/** Which of the three kinds a file is, or `null` when it is none of them. */
export function kindOf(file) {
  const extension = extensionOf(file?.name);
  if (!extension) return null;
  const found = Object.entries(MEDIA_LIMITS).find(([, limit]) =>
    limit.extensions.includes(extension)
  );
  return found ? found[0] : null;
}

/** A byte count as an editor reads it. */
export function formatBytes(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

/**
 * The alt text a file name suggests.
 *
 * Every media record needs `alt` (§6.12) and an upload has nothing else to
 * derive it from, so the file name becomes a sentence and the editor corrects
 * it in the drawer. A name that carries no words — `IMG_2381` — still produces
 * something rather than an empty required field.
 *
 * @param {string} name
 * @returns {string}
 */
export function altFromFileName(name) {
  const base = String(name ?? '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);

  if (base === '') return 'Uploaded file';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** The longest title the library keeps (`media.title`, §6.12). */
export const TITLE_MAX_LENGTH = 200;

/**
 * The title an upload is filed under: its file name, shortened to what the
 * library keeps with its extension left on (QA-63).
 *
 * A 240-character name went to Cloudinary and was then refused by the API —
 * "The title may not be greater than 200 characters." — about a title the
 * editor never typed, on a row whose Retry could never succeed, with the file
 * left on Cloudinary.
 *
 * @param {string} name
 * @param {number} [max]
 * @returns {string}
 */
export function titleFromFileName(name, max = TITLE_MAX_LENGTH) {
  const full = String(name ?? '').trim();
  if (full.length <= max) return full;
  const extension = extensionOf(full);
  const tail = extension ? `.${extension}` : '';
  return `${full.slice(0, max - tail.length - 1).trimEnd()}…${tail}`;
}

/**
 * A folder as the library files it: its segments trimmed, no slash at either
 * end and none doubled — "/projects//aurelia/ " is `projects/aurelia` (QA-63).
 * The record and Cloudinary's `sna/<folder>` then name the same folder; the
 * record used to keep the slashes, and the Folder filter listed it twice.
 *
 * @param {string} folder
 * @returns {string} `''` for no folder
 */
export const cleanFolder = (folder) =>
  String(folder ?? '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/');

/**
 * What is wrong with a file, before a byte of it is sent.
 *
 * @param {File} file
 * @param {'image'|'video'|'document'|'any'} [accept]
 * @returns {string} `''` when the file may be uploaded
 */
export function fileError(file, accept = 'any') {
  if (!file) return 'Choose a file to upload.';

  const kind = kindOf(file);
  const allowed = kindsFor(accept);

  if (!kind || !allowed.includes(kind)) {
    const names = allowed.flatMap((one) => MEDIA_LIMITS[one].extensions);
    return `“${file.name}” is not a file this library takes. Allowed: ${names.join(', ')}.`;
  }

  const limit = MEDIA_LIMITS[kind];
  if (typeof file.size === 'number' && file.size > limit.maxBytes) {
    return `“${file.name}” is ${formatBytes(file.size)}. The limit for ${limit.label.toLowerCase()} is ${limit.maxLabel}.`;
  }

  return '';
}

/**
 * The folder one record's own files are filed under — `properties/<slug>`,
 * `articles/<slug>` — or the section's folder when the record has no slug to
 * name it by yet (prompt 51). Every listing's photographs used to share one
 * `properties` folder, 284 of the seed's 389 files, which a picker of eighteen
 * tiles a page could only page through.
 *
 * @param {string} section `properties`, `articles`
 * @param {string} [key] the slug, or a draft's own id
 * @returns {string}
 */
export const recordFolder = (section, key) => {
  const name = String(key ?? '')
    .replace(/\//g, '-')
    .trim();
  return name ? `${section}/${name}` : section;
};

/** The Cloudinary folder a logical folder maps to (D-media, `sna/<folder>`). */
export const cloudinaryFolder = (folder) => {
  const clean = cleanFolder(folder);
  return clean ? `sna/${clean}` : 'sna';
};

let sequence = 0;
const nextId = () => {
  sequence += 1;
  return `upload-${sequence}`;
};

/**
 * The upload queue behind every drop zone in the admin (§4.3 of prompt 39).
 *
 * One file is two steps, and both have to happen or neither counts: the binary
 * goes straight to Cloudinary with an unsigned preset (D12), and the URL it
 * comes back with is then filed as a `media` record so the library knows the
 * picture exists. A file that uploaded but whose record failed is the one state
 * worth showing loudly — the asset is in the cloud and invisible to everybody —
 * so it fails the row rather than quietly succeeding.
 *
 * Two at a time, each with its own progress and its own cancel; a failure
 * retries itself once and then waits for the editor, and the files behind it in
 * the queue carry on regardless (§7).
 *
 * A row remembers what Cloudinary answered (QA-63). When the upload worked and
 * the record did not, a retry — the automatic one and the editor's — files the
 * record again; it used to send the file to Cloudinary again, and every retry
 * left one more copy there that nothing pointed at. For the same reason a file
 * already on Cloudinary cannot be cancelled: the row said "Cancelled" and then
 * "Added", because filing it is the only way not to strand it. A file the
 * library does not take (`invalid`) offers no retry — it can never succeed.
 *
 * @param {object} [options]
 * @param {string} [options.folder] the logical folder — `sna/<folder>` on Cloudinary
 * @param {'image'|'video'|'document'|'any'} [options.accept]
 * @param {(records: object[]) => void} [options.onUploaded] called per finished file
 * @returns {{items: object[], busy: boolean, configured: boolean,
 *            enqueue: (files: FileList|File[], overrides?: object) => object[],
 *            retry: (id: string) => void, cancel: (id: string) => void,
 *            cancelAll: () => void, dismiss: (id: string) => void, clear: () => void}}
 */
export default function useMediaUpload({ folder = '', accept = 'any', onUploaded } = {}) {
  const { configured, settings } = useCloudinaryConfig();

  const [items, setItems] = useState([]);
  // The rows as last rendered, for the handlers that must know a row's state
  // before they touch its request.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const controllers = useRef(new Map());
  const running = useRef(new Set());
  const mounted = useRef(true);

  // The queue reads these when a file's turn comes, not when it was dropped,
  // so a re-render never restarts the pump.
  const latest = useRef({ folder, accept, onUploaded, settings });
  latest.current = { folder, accept, onUploaded, settings };

  useEffect(() => {
    mounted.current = true;
    // The map is created once and never replaced, so capturing it here is the
    // same object the cleanup would have read — and the lint rule is right
    // that reading `.current` at teardown is the habit worth not having.
    const inFlight = controllers.current;
    return () => {
      mounted.current = false;
      inFlight.forEach((controller) => controller.abort());
      inFlight.clear();
    };
  }, []);

  const update = useCallback((id, patch) => {
    if (!mounted.current) return;
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const run = useCallback(
    async (item) => {
      const { folder: target, onUploaded: notify, settings: current } = latest.current;
      const controller = new AbortController();
      controllers.current.set(item.id, controller);

      let outcome;
      let record = null;
      // What Cloudinary answered for this row, now or on an earlier attempt.
      let uploaded = item.uploaded ?? null;

      try {
        if (uploaded) {
          update(item.id, { status: 'saving', progress: 100, error: '' });
        } else {
          update(item.id, { status: 'uploading', progress: 0, error: '' });
          uploaded = await uploadToCloudinary(item.file, {
            resourceType: MEDIA_LIMITS[item.kind]?.resourceType ?? 'auto',
            folder: cloudinaryFolder(item.folder ?? target),
            settings: current,
            signal: controller.signal,
            onProgress: (progress) => update(item.id, { progress }),
          });
          update(item.id, { status: 'saving', progress: 100, uploaded });
        }

        const created = await mediaService.create({
          url: uploaded.url,
          publicId: uploaded.publicId,
          provider: 'cloudinary',
          type: item.kind,
          width: uploaded.width,
          height: uploaded.height,
          bytes: uploaded.bytes ?? item.size,
          format: uploaded.format ?? extensionOf(item.name),
          alt: item.alt,
          title: titleFromFileName(item.name),
          folder: cleanFolder(item.folder ?? target) || null,
          tags: [],
        });

        record = created?.data ?? null;
        outcome = { status: 'done', record, progress: 100, error: '' };
      } catch (thrown) {
        if (thrown?.name === 'AbortError') {
          outcome = { status: 'cancelled', progress: 0 };
        } else if (item.attempts < MAX_ATTEMPTS) {
          // One more go, at the back of the queue, so the files behind it are
          // not held up by a connection that dropped once.
          outcome = { status: 'queued', progress: 0, attempts: item.attempts + 1, error: '' };
        } else {
          outcome = {
            status: 'error',
            progress: 0,
            error: firstFieldMessage(thrown, thrown?.message || 'The upload failed.'),
          };
        }
      }

      // The slot is freed *before* the row changes, so the state update that
      // follows is the one the pump reacts to and the next file starts.
      controllers.current.delete(item.id);
      running.current.delete(item.id);
      update(item.id, outcome);
      if (record) notify?.([record]);
    },
    [update]
  );

  // The pump. It starts at most `MAX_CONCURRENT` files and does nothing else,
  // so every path that changes a row's status — a finish, a cancel, a retry —
  // starts the next file without knowing that it did.
  useEffect(() => {
    const free = MAX_CONCURRENT - running.current.size;
    if (free <= 0) return;

    items
      .filter((item) => item.status === 'queued' && !running.current.has(item.id))
      .slice(0, free)
      .forEach((item) => {
        running.current.add(item.id);
        run(item);
      });
  }, [items, run]);

  const enqueue = useCallback(
    (files, overrides = {}) => {
      const list = Array.from(files ?? []);
      if (list.length === 0) return [];

      const queued = list.map((file) => {
        const problem = fileError(file, latest.current.accept);
        return {
          id: nextId(),
          file,
          name: file.name,
          size: file.size ?? null,
          kind: kindOf(file),
          alt: altFromFileName(file.name),
          folder: overrides.folder ?? latest.current.folder,
          attempts: 1,
          progress: 0,
          record: null,
          uploaded: null,
          error: problem,
          // Refused before a byte was sent: no retry can change the answer.
          invalid: Boolean(problem),
          status: problem ? 'error' : 'queued',
        };
      });

      setItems((current) => [...current, ...queued]);
      return queued;
    },
    [] // `latest` is a ref: the newest folder and accept are read on use.
  );

  /** Whether a row may still be stopped: not once its file is on Cloudinary. */
  const cancellable = (item) => item?.status === 'queued' || item?.status === 'uploading';

  const cancel = useCallback(
    (id) => {
      const row = itemsRef.current.find((item) => item.id === id);
      if (!cancellable(row)) return;
      controllers.current.get(id)?.abort();
      update(id, { status: 'cancelled', progress: 0 });
    },
    [update]
  );

  const cancelAll = useCallback(() => {
    const stoppable = new Set(itemsRef.current.filter(cancellable).map((item) => item.id));
    stoppable.forEach((id) => controllers.current.get(id)?.abort());
    setItems((list) =>
      list.map((item) =>
        stoppable.has(item.id) ? { ...item, status: 'cancelled', progress: 0 } : item
      )
    );
  }, []);

  const retry = useCallback((id) => {
    setItems((list) =>
      list.map((item) =>
        item.id === id &&
        (item.status === 'error' || item.status === 'cancelled') &&
        item.file &&
        !fileError(item.file, latest.current.accept)
          ? { ...item, status: 'queued', attempts: 1, progress: 0, error: '' }
          : item
      )
    );
  }, []);

  const dismiss = useCallback((id) => {
    controllers.current.get(id)?.abort();
    setItems((list) => list.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => {
    setItems((list) => list.filter((item) => item.status !== 'done' && item.status !== 'error'));
  }, []);

  const busy = items.some(
    (item) => item.status === 'queued' || item.status === 'uploading' || item.status === 'saving'
  );

  return { items, busy, configured, enqueue, retry, cancel, cancelAll, dismiss, clear };
}
