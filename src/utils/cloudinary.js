/**
 * Cloudinary: the configuration, the unsigned upload and the delivery URL
 * (00_MASTER_CONTEXT.md §8.6, decision D12).
 *
 * Three things live here and nothing else does:
 *
 *   - `isCloudinaryConfigured()` — whether this deployment can upload at all.
 *     Site settings win over the build-time variables, so a client who pastes
 *     a cloud name into Admin → Settings switches uploading on without a
 *     rebuild, and a developer who sets `REACT_APP_CLOUDINARY_*` in `.env`
 *     gets the same behaviour on a checkout with no settings.
 *   - `uploadToCloudinary()` — one unsigned `POST` to the upload API, with
 *     progress and a cancel. There is no multipart endpoint on our own API
 *     (D12): the browser uploads straight to Cloudinary and only the resulting
 *     URL is stored, which is what lets a résumé and, from prompt 39, every
 *     image reach the record without the API ever handling a binary.
 *   - `cloudinaryUrl()` — the `f_auto,q_auto,w_…` transformation §8.6 asks for
 *     on every Cloudinary image. A URL from anywhere else is returned exactly
 *     as it came in, so a caller never has to ask where a picture is hosted.
 *
 * Prompt 39 extends this file (the media library, `ImageField`, `LazyImage`);
 * it does not replace it.
 */

/** The delivery host. Anything else is somebody else's URL (`picsum.photos`). */
const DELIVERY_HOST = /^https?:\/\/res\.cloudinary\.com\//i;

/** The segment that separates a public id (and its transformations) from the rest. */
const UPLOAD_MARKER = '/upload/';

/**
 * The transformation prefixes Cloudinary defines.
 *
 * They are what tells `w_640,c_fill` (a transformation somebody applied on
 * purpose) from `my_folder` (a public id that merely contains an underscore),
 * which decides whether {@link cloudinaryUrl} may add a segment of its own.
 */
const TRANSFORM_PREFIXES = new Set(
  // prettier-ignore
  ['a', 'ac', 'ar', 'b', 'bo', 'br', 'c', 'co', 'cs', 'd', 'dpr', 'du', 'e', 'eo', 'f', 'fl',
   'fps', 'g', 'h', 'if', 'ki', 'l', 'o', 'pg', 'q', 'r', 'so', 'sp', 't', 'u', 'vc', 'w', 'x',
   'y', 'z']
);

/** What a caller is told when nothing is configured (§7 of prompt 31). */
export const NOT_CONFIGURED_MESSAGE =
  'Uploads are not configured. Paste a link to the file instead.';

/** What a caller is told when the upload never reached Cloudinary. */
export const NETWORK_MESSAGE = 'The upload could not reach the server. Check your connection.';

/**
 * The cloud name and the unsigned preset this deployment uploads with.
 *
 * Settings first, environment second: the environment is the developer's
 * default and the settings are the client's answer, and the client's answer
 * wins (§5 of prompt 31).
 *
 * @param {object|null} [settings] `siteSettings` — `useSiteSettings().settings`
 * @returns {{cloudName: string, uploadPreset: string}} trimmed, `''` when absent
 */
export function cloudinaryConfig(settings) {
  const integrations = settings?.integrations ?? {};
  const trimmed = (value) => (typeof value === 'string' ? value.trim() : '');

  return {
    cloudName:
      trimmed(integrations.cloudinaryCloudName) ||
      trimmed(process.env.REACT_APP_CLOUDINARY_CLOUD_NAME),
    uploadPreset:
      trimmed(integrations.cloudinaryUploadPreset) ||
      trimmed(process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET),
  };
}

/**
 * Whether an unsigned upload is possible.
 *
 * Both halves are needed: a cloud name without a preset cannot upload and a
 * preset without a cloud name has nowhere to go. A screen that asks this
 * question is deciding between an upload zone and a URL box, so a half
 * configuration has to answer `false` rather than offer a control that would
 * fail on use.
 *
 * @param {object|null} [settings]
 * @returns {boolean}
 */
export const isCloudinaryConfigured = (settings) => {
  const { cloudName, uploadPreset } = cloudinaryConfig(settings);
  return Boolean(cloudName && uploadPreset);
};

/**
 * The unsigned upload endpoint.
 *
 * `resourceType` is `auto` by default (D12): a PDF, a Word file, an image and
 * a video all go to the same address and Cloudinary decides what each one is.
 *
 * @param {string} cloudName
 * @param {'auto'|'image'|'video'|'raw'} [resourceType]
 * @returns {string}
 */
export const uploadEndpoint = (cloudName, resourceType = 'auto') =>
  `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${encodeURIComponent(
    resourceType
  )}/upload`;

/**
 * Cloudinary's answer as the fields the app stores (§6.12).
 *
 * Exported for the unit test.
 *
 * @param {object} payload the parsed upload response
 * @returns {{url: string, publicId: string|null, bytes: number|null, format: string|null,
 *            width: number|null, height: number|null, resourceType: string|null}}
 */
export function toUploadResult(payload = {}) {
  return {
    url: payload.secure_url || payload.url || '',
    publicId: payload.public_id ?? null,
    bytes: typeof payload.bytes === 'number' ? payload.bytes : null,
    format: payload.format ?? null,
    width: typeof payload.width === 'number' ? payload.width : null,
    height: typeof payload.height === 'number' ? payload.height : null,
    resourceType: payload.resource_type ?? null,
  };
}

/** An abort, in the shape `services/apiError.isCanceled()` already recognises. */
function abortError(message = 'The upload was cancelled.') {
  if (typeof DOMException === 'function') return new DOMException(message, 'AbortError');
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

/**
 * Uploads one file to Cloudinary with an unsigned preset.
 *
 * `XMLHttpRequest` rather than `fetch` for one reason: `xhr.upload` reports
 * how far a send has got and `fetch` does not, and a résumé on a phone
 * connection needs a progress bar rather than a spinner that might mean
 * anything. An `AbortSignal` cancels the send, which is the Cancel button
 * beside that bar.
 *
 * The promise rejects with `Error(NOT_CONFIGURED_MESSAGE)` when there is
 * nothing to upload to, with Cloudinary's own message on a refusal, with
 * `Error(NETWORK_MESSAGE)` when the request never arrived, and with an
 * `AbortError` when it was cancelled.
 *
 * @param {File|Blob} file
 * @param {object} [options]
 * @param {'auto'|'image'|'video'|'raw'} [options.resourceType]
 * @param {string} [options.folder] the Cloudinary folder to file it under
 * @param {(percent: number) => void} [options.onProgress] 0–100
 * @param {object|null} [options.settings] `siteSettings`, which win over the env
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{url: string, publicId: string|null, bytes: number|null, format: string|null,
 *                    width: number|null, height: number|null, resourceType: string|null}>}
 */
export function uploadToCloudinary(file, options = {}) {
  const { resourceType = 'auto', folder, onProgress, settings, signal } = options;
  const { cloudName, uploadPreset } = cloudinaryConfig(settings);

  if (!cloudName || !uploadPreset) return Promise.reject(new Error(NOT_CONFIGURED_MESSAGE));
  if (!file) return Promise.reject(new Error('Choose a file to upload.'));
  if (typeof XMLHttpRequest === 'undefined' || typeof FormData === 'undefined') {
    return Promise.reject(new Error(NETWORK_MESSAGE));
  }
  if (signal?.aborted) return Promise.reject(abortError());

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', uploadPreset);
    if (folder) form.append('folder', folder);

    const xhr = new XMLHttpRequest();
    const cancel = () => xhr.abort();
    const release = () => signal?.removeEventListener?.('abort', cancel);

    signal?.addEventListener?.('abort', cancel);

    xhr.upload?.addEventListener?.('progress', (event) => {
      if (!event.lengthComputable || !event.total) return;
      onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    });

    xhr.addEventListener('load', () => {
      release();

      const payload = parseResponse(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300 && payload) {
        const result = toUploadResult(payload);
        if (!result.url) {
          reject(new Error('Cloudinary accepted the file but returned no URL.'));
          return;
        }
        onProgress?.(100);
        resolve(result);
        return;
      }

      reject(new Error(payload?.error?.message || `The upload failed (${xhr.status}).`));
    });

    xhr.addEventListener('error', () => {
      release();
      reject(new Error(NETWORK_MESSAGE));
    });

    xhr.addEventListener('abort', () => {
      release();
      reject(abortError());
    });

    xhr.open('POST', uploadEndpoint(cloudName, resourceType));
    xhr.send(form);
  });
}

/** Cloudinary answers JSON on success and on refusal; anything else is `null`. */
function parseResponse(text) {
  if (typeof text !== 'string' || text === '') return null;
  try {
    return JSON.parse(text);
  } catch (_thrown) {
    return null;
  }
}

/**
 * The transformation string of a set of options, in the order §8.6 writes it.
 *
 * Exported for the unit test.
 *
 * @param {{w?: number, h?: number, crop?: string, quality?: string|number|null,
 *          format?: string|null, dpr?: string|number}} [options]
 * @returns {string} `''` when there is nothing to ask for
 */
export function buildTransformation({ w, h, crop, quality = 'auto', format = 'auto', dpr } = {}) {
  return [
    format ? `f_${format}` : '',
    quality ? `q_${quality}` : '',
    w ? `w_${Math.round(w)}` : '',
    h ? `h_${Math.round(h)}` : '',
    crop ? `c_${crop}` : '',
    dpr ? `dpr_${dpr}` : '',
  ]
    .filter(Boolean)
    .join(',');
}

/** Whether a path segment is a transformation rather than a version or an id. */
function isTransformationSegment(segment) {
  if (!segment) return false;

  return segment.split(',').every((part) => {
    const at = part.indexOf('_');
    return at > 0 && TRANSFORM_PREFIXES.has(part.slice(0, at));
  });
}

/**
 * A Cloudinary delivery URL with `f_auto,q_auto,w_…` applied (§8.6).
 *
 * A URL from anywhere else — `picsum.photos`, a client's own CDN, a relative
 * path — is returned untouched, which is what lets `LazyImage` (prompt 39)
 * call this on every `src` it is given without knowing where the file lives.
 *
 * A URL that already carries a transformation is also returned untouched: it
 * was written that way deliberately (the brand favicons of §2.3 are crops),
 * and a second segment in front of it would chain onto the crop rather than
 * replace it.
 *
 * @param {string} url
 * @param {{w?: number, h?: number, crop?: string, quality?: string|number|null,
 *          format?: string|null, dpr?: string|number}} [options]
 * @returns {string}
 */
export function cloudinaryUrl(url, options = {}) {
  if (typeof url !== 'string' || !DELIVERY_HOST.test(url)) return url;

  const at = url.indexOf(UPLOAD_MARKER);
  if (at === -1) return url;

  const head = url.slice(0, at + UPLOAD_MARKER.length);
  const tail = url.slice(at + UPLOAD_MARKER.length);
  if (tail === '' || isTransformationSegment(tail.split('/')[0])) return url;

  const transformation = buildTransformation(options);
  return transformation ? `${head}${transformation}/${tail}` : url;
}

const cloudinary = {
  cloudinaryConfig,
  cloudinaryUrl,
  isCloudinaryConfigured,
  uploadEndpoint,
  uploadToCloudinary,
};

export default cloudinary;
