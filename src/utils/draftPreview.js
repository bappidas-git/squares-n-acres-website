/**
 * "Preview changes" (prompt 51): the unsaved form of a **published** article or
 * page, handed to its public page in this browser — through `localStorage`,
 * never the API — so an editor sees the change before visitors do, without
 * saving it live.
 *
 * The editor's tab writes the record under `sna-draft-preview-<uuid>` and
 * opens the public address with `?draftPreview=<uuid>`; the public page takes
 * it once and deletes the key, so the link is spent by its first opening and
 * works in no other browser. A hand-off nobody opened is dropped after an hour.
 */

import storage from './storage';

/** The key family of the hand-offs. */
export const DRAFT_PREVIEW_PREFIX = 'sna-draft-preview-';

/** The query parameter that names one. */
export const DRAFT_PREVIEW_PARAM = 'draftPreview';

/** How long an unopened hand-off is kept. */
const MAX_AGE_MS = 60 * 60 * 1000;

/**
 * What this page load has already taken: React may render — and, in
 * development, initialise — a page twice, and the second reading must see what
 * the first one removed.
 */
const taken = new Map();

const newId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/** Drops the hand-offs nobody opened. */
function pruneStale(now = Date.now()) {
  for (const key of storage.keys(DRAFT_PREVIEW_PREFIX)) {
    const entry = storage.getItem(key);
    const savedAt = Date.parse(entry?.savedAt ?? '');
    if (!Number.isFinite(savedAt) || now - savedAt > MAX_AGE_MS) storage.removeItem(key);
  }
}

/**
 * Keeps a record for its public page to show once.
 *
 * @param {'article'|'page'} type
 * @param {object} record what the public page renders, in its own shape
 * @returns {string|null} the id for `?draftPreview=`, or `null` when this
 *   browser keeps nothing
 */
export function stashDraftPreview(type, record) {
  pruneStale();
  const id = newId();
  const written = storage.setItem(`${DRAFT_PREVIEW_PREFIX}${id}`, {
    type,
    record,
    savedAt: new Date().toISOString(),
  });
  return written ? id : null;
}

/**
 * The record a `?draftPreview=` names — once: the key is deleted as it is
 * read, and a second opening finds nothing.
 *
 * @param {string} id
 * @param {'article'|'page'} type
 * @returns {object|null} `null` when it was spent, never written, or is another kind
 */
export function takeDraftPreview(id, type) {
  if (!id) return null;
  if (taken.has(id)) return taken.get(id);
  const key = `${DRAFT_PREVIEW_PREFIX}${id}`;
  const entry = storage.getItem(key);
  storage.removeItem(key);
  const record = entry && entry.type === type && entry.record ? entry.record : null;
  taken.set(id, record);
  return record;
}

/** Forgets what this page load took — for the tests. */
export const resetDraftPreviews = () => taken.clear();
