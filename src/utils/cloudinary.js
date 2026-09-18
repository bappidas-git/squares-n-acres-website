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
 * Prompt 39 added the responsive half of §8.6 on top of those three:
 * `parseCloudinary()` answers whether a URL is ours at all (and what its parts
 * are), `buildSrcSet()` turns one URL into the six widths a browser picks from,
 * and `blurThumb()` gives the 24-pixel thumbnail `LazyImage` blurs up from. All
 * three are pure, and all three hand back `null` for a URL from anywhere else,
 * so a caller never has to ask where a picture is hosted.
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
 *          format?: string|null, effect?: string|null, dpr?: string|number}} [options]
 * @returns {string} `''` when there is nothing to ask for
 */
export function buildTransformation({
  w,
  h,
  crop,
  quality = 'auto',
  format = 'auto',
  effect,
  dpr,
} = {}) {
  return [
    format ? `f_${format}` : '',
    quality ? `q_${quality}` : '',
    w ? `w_${Math.round(w)}` : '',
    h ? `h_${Math.round(h)}` : '',
    crop ? `c_${crop}` : '',
    effect ? `e_${effect}` : '',
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
 * path — is returned untouched, which is what lets `LazyImage` call this on
 * every `src` it is given without knowing where the file lives.
 *
 * A URL that already carries a transformation is returned untouched too,
 * unless `merge` is asked for. It was written that way deliberately (the brand
 * favicons of §2.3 are crops), and a segment inserted *in front* of it would
 * decide the size before the crop narrowed it — the wrong way round. `merge`
 * is the right way round: the new transformation is chained **after** the one
 * that is already there (`/upload/<theirs>/<ours>/…`), so the crop happens and
 * the result of the crop is then scaled. That is what `buildSrcSet` and
 * `LazyImage` want, and why neither of them ever doubles `/upload/`.
 *
 * @param {string} url
 * @param {{w?: number, h?: number, crop?: string, quality?: string|number|null,
 *          format?: string|null, effect?: string|null, dpr?: string|number,
 *          merge?: boolean}} [options]
 * @returns {string}
 */
export function cloudinaryUrl(url, options = {}) {
  if (typeof url !== 'string' || !DELIVERY_HOST.test(url)) return url;

  const at = url.indexOf(UPLOAD_MARKER);
  if (at === -1) return url;

  const head = url.slice(0, at + UPLOAD_MARKER.length);
  const tail = url.slice(at + UPLOAD_MARKER.length);
  if (tail === '') return url;

  const { merge = false, ...rest } = options;
  const transformation = buildTransformation(rest);
  if (!transformation) return url;

  // Everything the URL already asks for, kept in front of what we add.
  const segments = tail.split('/');
  const existing = [];
  while (segments.length > 1 && isTransformationSegment(segments[0])) {
    existing.push(segments.shift());
  }

  if (existing.length === 0) return `${head}${transformation}/${tail}`;
  if (!merge) return url;

  return `${head}${existing.join('/')}/${transformation}/${segments.join('/')}`;
}

/**
 * The parts of a Cloudinary delivery URL, or `null` for a URL from anywhere
 * else.
 *
 * This is the question `LazyImage` asks before it builds a `srcSet`: a
 * `picsum.photos` photograph has no widths to offer, so it gets a plain `src`
 * and nothing else. Callers that only need the yes/no can read it as a
 * predicate — `null` is the "somebody else's URL" answer.
 *
 * @param {string} url
 * @returns {{cloudName: string, resourceType: string|null, deliveryType: string,
 *            transformation: string, version: string|null, publicId: string,
 *            format: string|null}|null}
 */
export function parseCloudinary(url) {
  if (typeof url !== 'string' || !DELIVERY_HOST.test(url)) return null;

  const at = url.indexOf(UPLOAD_MARKER);
  if (at === -1) return null;

  const tail = url.slice(at + UPLOAD_MARKER.length);
  if (tail === '') return null;

  // `…/res.cloudinary.com/<cloud>/<resourceType>` — or `…/<cloud>` on the
  // short form, where the host is the segment before the cloud name.
  const head = url.slice(0, at).split('/');
  const last = head[head.length - 1] ?? '';
  const beforeLast = head[head.length - 2] ?? '';
  const shortForm = /res\.cloudinary\.com$/i.test(beforeLast);
  const cloudName = shortForm ? last : beforeLast;
  const resourceType = shortForm ? null : last;
  if (!cloudName) return null;

  const segments = tail.split('/');
  const transformation = [];
  while (segments.length > 1 && isTransformationSegment(segments[0])) {
    transformation.push(segments.shift());
  }

  const version = segments.length > 1 && /^v\d+$/.test(segments[0]) ? segments.shift() : null;

  const rest = segments.join('/');
  if (rest === '') return null;

  const dot = rest.lastIndexOf('.');
  const hasFormat = dot > 0 && !rest.slice(dot + 1).includes('/');

  return {
    cloudName,
    resourceType,
    deliveryType: 'upload',
    transformation: transformation.join('/'),
    version,
    publicId: hasFormat ? rest.slice(0, dot) : rest,
    format: hasFormat ? rest.slice(dot + 1).toLowerCase() : null,
  };
}

/** The widths every responsive image is offered in (§8.6). */
export const SRCSET_WIDTHS = [320, 480, 640, 960, 1280, 1600];

/**
 * A CSS `aspect-ratio` as a number, or `null` when it is not one.
 *
 * `'16/9'`, `'4 / 3'`, `'1'` and `1.91` all arrive here, because `ratio` is a
 * `LazyImage` prop authors write by hand.
 *
 * @param {string|number|null|undefined} ratio
 * @returns {number|null}
 */
export function parseRatio(ratio) {
  if (typeof ratio === 'number') return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
  if (typeof ratio !== 'string') return null;

  const [left, right] = ratio.split('/');
  const width = Number(String(left).trim());
  const height = right === undefined ? 1 : Number(String(right).trim());

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return width / height;
}

/**
 * The `srcSet` of a Cloudinary image: one `f_auto,q_auto,dpr_auto` variant per
 * width, so the browser downloads the one it needs and not the 1600px original
 * (§8.6).
 *
 * `ratio` makes every variant that shape — `c_fill` with the height the box
 * implies — which is what keeps a 4:3 card from downloading a 16:9 picture and
 * cropping it in CSS.
 *
 * `null` for a URL that is not Cloudinary's: there is nothing to offer, and a
 * caller that spreads the result onto an `<img>` gets no `srcset` attribute at
 * all rather than a broken one.
 *
 * @param {string} url
 * @param {number[]} [widths]
 * @param {{ratio?: string|number|null, crop?: string}} [options]
 * @returns {string|null}
 */
export function buildSrcSet(url, widths = SRCSET_WIDTHS, { ratio, crop = 'fill' } = {}) {
  if (!parseCloudinary(url)) return null;

  const wanted = [
    ...new Set(
      (Array.isArray(widths) ? widths : [])
        .map((width) => Math.round(Number(width)))
        .filter((width) => Number.isFinite(width) && width > 0)
    ),
  ].sort((left, right) => left - right);

  if (wanted.length === 0) return null;

  const aspect = parseRatio(ratio);

  return wanted
    .map((w) => {
      const variant = cloudinaryUrl(url, {
        w,
        h: aspect ? Math.round(w / aspect) : undefined,
        crop: aspect ? crop : undefined,
        dpr: 'auto',
        merge: true,
      });
      return `${variant} ${w}w`;
    })
    .join(', ');
}

/**
 * The 24-pixel blur a picture fades in from (§6 of prompt 39).
 *
 * It is two or three kilobytes, so it arrives with the markup rather than
 * after it, and the box is never an empty grey rectangle while the real
 * photograph is still coming. `null` for anything not Cloudinary's — those
 * boxes keep the surface tint instead.
 *
 * @param {string} url
 * @returns {string|null}
 */
export function blurThumb(url) {
  if (!parseCloudinary(url)) return null;
  return cloudinaryUrl(url, { w: 24, quality: 1, effect: 'blur:200', merge: true });
}

const cloudinary = {
  blurThumb,
  buildSrcSet,
  cloudinaryConfig,
  cloudinaryUrl,
  isCloudinaryConfigured,
  parseCloudinary,
  parseRatio,
  uploadEndpoint,
  uploadToCloudinary,
};

export default cloudinary;
