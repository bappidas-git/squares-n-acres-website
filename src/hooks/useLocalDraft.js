import { useCallback, useEffect, useRef, useState } from 'react';

import storage from '../utils/storage';

/** How often a dirty form writes its copy to this browser (prompt 18). */
export const AUTOSAVE_INTERVAL_MS = 10000;

/**
 * A record form's copy of itself in this browser — what the property form has
 * kept since prompt 18, extracted for every record form in prompt 51: pages,
 * articles, localities, developers and job openings.
 *
 * - **Every ten seconds** while the form is dirty, the values on screen are
 *   written under `key`, with the moment and the version of the record they
 *   were made from (the `updatedAt` the form read).
 * - **On the way out** — the tab closing or reloading (`pagehide`), the route
 *   changing, the session ending and the sign-in screen taking over — they are
 *   written once more, unless the editor answered "Discard changes": a copy of
 *   what they chose to throw away is not worth offering back (QA-55, QA-62).
 * - **On the next opening** a copy newer than the stored record is offered,
 *   never applied — the record on the server is the truth until the editor
 *   says otherwise; an older copy is dropped: the record was saved after it.
 *
 *   const draft = useLocalDraft({
 *     key: `sna_page_draft:${id ?? 'new'}`,
 *     values: form.values,
 *     dirty: form.dirty,
 *     ready: !isEdit || Boolean(record),
 *     storedAt: record?.updatedAt,
 *     version: guard.current,
 *   });
 *   useUnsavedChanges(form.dirty, { onDiscard: draft.forget });
 *
 * @param {object} options
 * @param {string|null} options.key where the copy lives — `null` keeps none
 * @param {object} options.values what is on screen
 * @param {boolean} options.dirty whether it differs from what is stored
 * @param {boolean} [options.enabled] `false` for a form that cannot save — read
 *   only, or its record deleted elsewhere: nothing is written or offered
 * @param {boolean} [options.ready] the stored record is there to compare a copy
 *   with — always, for a record not created yet
 * @param {string|null} [options.storedAt] the stored record's `updatedAt`
 * @param {string|null|(() => string|null)} [options.version] the version the
 *   values were made from, kept with each copy — a function is read when the
 *   copy is written
 * @param {boolean} [options.paused] a save in flight: the ten-second copy waits
 * @returns {{
 *   offer: {values: object, savedAt: string, version?: string|null}|null,
 *   savedAt: string|null,
 *   changed: boolean,
 *   take: () => object|null,
 *   dismiss: () => void,
 *   clear: () => void,
 *   keep: () => boolean,
 *   forget: () => void,
 *   put: (copy: object) => boolean,
 * }} `changed` — the form has moved on since the last copy was written
 */
export default function useLocalDraft({
  key,
  values,
  dirty,
  enabled = true,
  ready = true,
  storedAt = null,
  version = null,
  paused = false,
}) {
  const [offer, setOffer] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  // Read by the timer and the listeners without becoming dependencies of them:
  // a copy is of the values of the moment it is written.
  const latest = useRef({});
  latest.current = { key, values, dirty, enabled, paused, version };

  // The values the last copy was made of, by identity: every edit makes a new
  // object, so "changed since the copy" is whether the form still holds it.
  const copied = useRef(null);
  // "Discard changes" was the answer: nothing more is written on the way out.
  const discarded = useRef(false);

  const offerRef = useRef(null);
  offerRef.current = offer;

  /** Writes what is on screen now, rather than at the next tick. */
  const keep = useCallback(() => {
    const current = latest.current;
    if (!current.key || !current.enabled || !current.dirty) return false;
    const stamp = typeof current.version === 'function' ? current.version() : current.version;
    const written = storage.setItem(current.key, {
      values: current.values,
      savedAt: new Date().toISOString(),
      version: stamp ?? null,
    });
    if (written) copied.current = current.values;
    return written;
  }, []);

  /**
   * A copy the form makes itself, and offers at once — "Load their version"
   * keeps the editor's edits this way, replayed on top of the newer record.
   */
  const put = useCallback((copy) => {
    const { key: current } = latest.current;
    if (!current) return false;
    setOffer(copy);
    return storage.setItem(current, copy);
  }, []);

  /** After a save: no copy, nothing on offer. */
  const clear = useCallback(() => {
    const { key: current } = latest.current;
    if (current) storage.removeItem(current);
    copied.current = null;
    setOffer(null);
    setSavedAt(null);
  }, []);

  /** "Discard it", on the banner: the copy on offer goes, and so does the offer. */
  const dismiss = useCallback(() => {
    const { key: current } = latest.current;
    if (current) storage.removeItem(current);
    copied.current = null;
    setOffer(null);
  }, []);

  /** "Restore the draft": the copy on offer, for the form to apply. */
  const take = useCallback(() => {
    const taken = offerRef.current;
    setOffer(null);
    return taken;
  }, []);

  /** "Discard changes", on leaving: the copy goes, and none is written on the way out. */
  const forget = useCallback(() => {
    discarded.current = true;
    clear();
  }, [clear]);

  // Another record in the same form — Duplicate, then Back — is not the one a
  // "Discard changes" was said about.
  useEffect(() => {
    discarded.current = false;
  }, [key]);

  // Offered once per record: a new one at once, a stored one as soon as it is
  // there to compare the copy's age against.
  const offeredFor = useRef(null);
  useEffect(() => {
    if (!key || !enabled || !ready || offeredFor.current === key) return;
    offeredFor.current = key;

    const copy = storage.getItem(key, null);
    if (!copy?.values || !copy.savedAt) return;
    const newer = !storedAt || Date.parse(copy.savedAt) > Date.parse(storedAt);
    if (!newer) {
      storage.removeItem(key);
      return;
    }
    setOffer(copy);
  }, [key, enabled, ready, storedAt]);

  // Every ten seconds, while there is something new to keep.
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => {
      const current = latest.current;
      if (!current.dirty || current.paused || discarded.current) return;
      if (current.values === copied.current) return;
      if (keep()) setSavedAt(new Date().toISOString());
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled, keep]);

  // Leaving without "Discard changes" keeps the work: a reload through
  // `pagehide`, a route change or an ended session through the unmount. The
  // guard lets a sign-in page through without asking — a session that ended
  // cannot be stayed in — so this is what brings the work back after signing
  // in again (QA-62).
  useEffect(() => {
    if (!enabled) return undefined;
    const onHide = () => {
      if (!discarded.current) keep();
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      if (!discarded.current) keep();
    };
  }, [enabled, keep]);

  return {
    offer,
    savedAt,
    changed: savedAt !== null && values !== copied.current,
    take,
    dismiss,
    clear,
    keep,
    forget,
    put,
  };
}
