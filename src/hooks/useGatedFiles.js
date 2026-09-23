import { useCallback, useEffect, useState } from 'react';

import propertyService from '../services/propertyService';
import { LEAD_CHANGE_EVENT, leadStorage } from '../utils/leadStorage';

/**
 * The addresses of a listing's gated files, for the visitor who has shared
 * their details about it.
 *
 * A public read carries no address for a gated brochure or paper, nor for any
 * floor-plan drawing or PDF (QA-51 OPEN-1): `POST /leads` answers a lead about
 * the listing with a token (`leadStorage.getAccess`), and
 * `POST /properties/:id/documents/access` exchanges it for every address at
 * once. The documents, the floor plans and the unit configurations all need
 * that answer, so it is fetched **once per token** and shared: whichever
 * section asks first starts the request, the others wait on the same promise,
 * and every section re-reads when it lands.
 *
 *   const { files, status, fetchFiles } = useGatedFiles(property.id, { enabled: unlocked });
 *
 * `status` is `none` (no token this visit), `idle` (a token, not yet used),
 * `loading`, `ready` or `failed` (the request failed and may be retried with
 * `fetchFiles`). A token the API refuses (403) is forgotten, which reads as
 * `none`: the page asks for the visitor's details again.
 */

/** Announced when an answer arrives or fails, so every section re-reads. */
export const GATED_FILES_EVENT = 'sna:gated-files';

/** The listing's id → `{ token, promise, files, failed, previous }`, for this visit. */
const cache = new Map();

const filled = (value) => typeof value === 'string' && value.trim() !== '';

const keyOf = (propertyId) =>
  propertyId === null || propertyId === undefined || propertyId === '' ? null : String(propertyId);

const announce = () => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(GATED_FILES_EVENT));
  } catch {
    // An environment without `CustomEvent` has nothing listening either.
  }
};

/**
 * The exchange's answer, keyed by record id the way the sections look it up.
 *
 * @param {object} data `DocumentAccess`
 * @returns {{brochureUrl: string|null, documents: Record<string, string|null>,
 *   floorPlans: Record<string, {imageUrl: string|null, pdfUrl: string|null}>,
 *   unitConfigurations: Record<string, {floorPlanImageUrl: string|null,
 *   floorPlanPdfUrl: string|null}>}}
 */
export function normaliseFiles(data) {
  const url = (value) => (filled(value) ? value : null);
  const byId = (rows, pick) =>
    Object.fromEntries(
      (Array.isArray(rows) ? rows : [])
        .filter((row) => row && row.id !== null && row.id !== undefined)
        .map((row) => [String(row.id), pick(row)])
    );

  return {
    brochureUrl: url(data?.brochureUrl),
    documents: byId(data?.documents, (row) => url(row.url)),
    floorPlans: byId(data?.floorPlans, (row) => ({
      imageUrl: url(row.imageUrl),
      pdfUrl: url(row.pdfUrl),
    })),
    unitConfigurations: byId(data?.unitConfigurations, (row) => ({
      floorPlanImageUrl: url(row.floorPlanImageUrl),
      floorPlanPdfUrl: url(row.floorPlanPdfUrl),
    })),
  };
}

/**
 * Asks for one listing's addresses with the visit's token — once per token,
 * however many sections ask. A failed request is retried by the next call; a
 * refused token is forgotten.
 *
 * @param {number|string|null} propertyId
 * @returns {Promise<object|null>} the addresses, or `null` when there are none to have
 */
export function fetchGatedFiles(propertyId) {
  const key = keyOf(propertyId);
  const token = key ? leadStorage.getAccess(key) : null;
  if (!token) return Promise.resolve(null);

  const hit = cache.get(key);
  if (hit && hit.token === token && !hit.failed) return hit.promise;

  // A later token's answer replaces an earlier one's; until it lands, the
  // addresses already handed over stay on screen (`previous`).
  const entry = {
    token,
    files: null,
    failed: false,
    previous: hit?.files ?? hit?.previous ?? null,
    promise: null,
  };
  entry.promise = propertyService
    .documentAccess(propertyId, token)
    .then((response) => {
      entry.files = normaliseFiles(response?.data);
      return entry.files;
    })
    .catch((error) => {
      entry.failed = true;
      if (error?.status === 403) leadStorage.forgetAccess(key);
      return null;
    })
    .finally(announce);

  cache.set(key, entry);
  announce();
  return entry.promise;
}

/** Forgets every answer — the test harness starts each case clean. */
export function resetGatedFiles() {
  cache.clear();
}

/**
 * What this visit holds for one listing right now.
 *
 * @param {number|string|null} propertyId
 * @returns {{key: string|null, status: 'none'|'idle'|'loading'|'ready'|'failed',
 *   files: object|null}}
 */
function snapshot(propertyId) {
  const key = keyOf(propertyId);
  const hit = key ? cache.get(key) : null;
  const known = hit?.files ?? hit?.previous ?? null;
  const token = key ? leadStorage.getAccess(key) : null;

  if (!token) return { key, status: 'none', files: known };
  if (!hit || hit.token !== token) return { key, status: 'idle', files: known };
  if (hit.files) return { key, status: 'ready', files: hit.files };
  if (hit.failed) return { key, status: 'failed', files: known };
  return { key, status: 'loading', files: known };
}

/**
 * @param {number|string|null} propertyId
 * @param {{enabled?: boolean}} [options] `enabled` fetches as soon as the
 *   visit holds an unused token — a section passes "my gate is open and my
 *   record lacks an address"
 * @returns {{status: string, files: object|null, fetchFiles: () => Promise<object|null>}}
 */
export default function useGatedFiles(propertyId, { enabled = false } = {}) {
  const [state, setState] = useState(() => snapshot(propertyId));

  useEffect(() => {
    const read = () => {
      const next = snapshot(propertyId);
      setState((current) =>
        current.key === next.key && current.status === next.status && current.files === next.files
          ? current
          : next
      );
    };

    read();
    window.addEventListener(GATED_FILES_EVENT, read);
    window.addEventListener(LEAD_CHANGE_EVENT, read);
    return () => {
      window.removeEventListener(GATED_FILES_EVENT, read);
      window.removeEventListener(LEAD_CHANGE_EVENT, read);
    };
  }, [propertyId]);

  // The state is re-read after a render; a render for another listing than the
  // one it was read for must not show that listing's addresses meanwhile.
  const live = state.key === keyOf(propertyId) ? state : snapshot(propertyId);

  useEffect(() => {
    if (enabled && live.status === 'idle') fetchGatedFiles(propertyId);
  }, [enabled, live.status, propertyId]);

  const fetchFiles = useCallback(() => fetchGatedFiles(propertyId), [propertyId]);

  return { status: live.status, files: live.files, fetchFiles };
}
