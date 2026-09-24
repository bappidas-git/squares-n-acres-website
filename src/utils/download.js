/**
 * Saving a file from the browser (D46).
 *
 * Two ways in, one way out:
 *
 *   - `downloadBlob()` saves something the page already holds — the CSV the
 *     admin tables build out of `perPage=all` (D44);
 *   - `downloadAuthenticated()` saves what an API endpoint answers with, which
 *     an `<a href>` cannot do: the file sits behind `Authorization: Bearer …`
 *     and a plain link carries no header. The registry call fetches it as a
 *     blob and hands it to `downloadBlob()`.
 *
 * Both are no-ops without a DOM (a test runner, a prerender pass), and say so
 * by returning `false` rather than throwing into a click handler.
 */

import ApiError from '../services/apiError';
import http from '../services/http';

/**
 * Saves a blob under a file name.
 *
 * @param {Blob} blob
 * @param {string} filename
 * @returns {boolean} false when the environment cannot save a file
 */
export function downloadBlob(blob, filename) {
  if (!blob) return false;
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false;
  if (typeof URL.createObjectURL !== 'function') return false;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  link.remove();

  // Safari reads the URL after the click returns, so it is released a tick later.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

/**
 * Downloads an authenticated endpoint's answer as a file.
 *
 * @param {object} endpoint an entry of `services/endpoints.js`
 * @param {Record<string, unknown>} [params] query parameters (§5.6)
 * @param {string} filename
 * @param {{pathParams?: object, signal?: AbortSignal, type?: string}} [options]
 * @returns {Promise<Blob>} the body that was saved
 * @throws {import('../services/apiError').default}
 */
export async function downloadAuthenticated(endpoint, params, filename, options = {}) {
  const { pathParams, signal, type } = options;

  let body;
  try {
    body = await http.request(endpoint, {
      pathParams,
      params,
      signal,
      responseType: 'blob',
    });
  } catch (thrown) {
    throw await readBlobError(thrown);
  }

  const blob = body instanceof Blob ? body : new Blob([body ?? ''], type ? { type } : undefined);
  downloadBlob(blob, filename);
  return blob;
}

/** A blob's text, where `Blob.text()` is missing too (an older engine, jsdom). */
const blobText = (blob) =>
  typeof blob.text === 'function'
    ? blob.text()
    : new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
      });

/**
 * The failure a file endpoint answered, read out of its body.
 *
 * Asked for a blob, the client hands the API's JSON error over as a blob too,
 * so the `ApiError` knew nothing of it, and a failed export toasted the HTTP
 * client's own words: "Request failed with status code 500" (QA-61). The
 * body's `message` and `errors` are the API's (§5.3); a body that is not JSON
 * leaves the message empty, for the caller's own sentence to stand.
 *
 * @param {unknown} thrown
 * @returns {Promise<unknown>} an `ApiError` carrying the API's message, or
 *   what was thrown when there is no body to read
 */
async function readBlobError(thrown) {
  const data = thrown?.original?.response?.data;
  if (typeof Blob === 'undefined' || !(data instanceof Blob)) return thrown;

  let payload = null;
  try {
    payload = JSON.parse(await blobText(data));
  } catch (_unreadable) {
    payload = null;
  }

  return new ApiError({
    status: thrown.status,
    message: typeof payload?.message === 'string' ? payload.message : '',
    errors: payload?.errors && typeof payload.errors === 'object' ? payload.errors : {},
    data: payload?.data ?? null,
    original: thrown.original,
  });
}

const download = { downloadBlob, downloadAuthenticated };

export default download;
