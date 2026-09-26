import { useCallback, useEffect, useRef, useState } from 'react';

import rebase from '../utils/rebase';
import { firstFieldMessage } from '../services/apiError';
import { useToast } from '../components/common/ToastProvider';

/** The 409 of a save made over somebody else's (QA-62) — not a slug's 409. */
export const isStaleWrite = (thrown) =>
  thrown?.status === 409 && thrown?.data?.conflict === 'stale';

/**
 * "Somebody else saved this after you opened it" for the record forms built on
 * `useForm` — pages, articles, localities, developers and job openings — the
 * version check the property form has made since QA-62 (prompt 51).
 *
 *   const guard = useStaleGuard({ storedAt: record?.updatedAt });
 *   const form = useForm({
 *     onSubmit: (payload) => service.update(id, guard.stamp(payload)),
 *     onError: guard.onError,
 *   });
 *
 * - `stamp(payload)` adds the version the form was made from to an update, so
 *   the API refuses it (409, `data.conflict: 'stale'`) when the record has been
 *   saved since, instead of writing every field back over the other save.
 * - `onError(thrown)` answers that refusal with the dialog rather than a toast.
 * - The dialog's answers: `dismiss` (keep editing, nothing sent); `reload`
 *   (their version, with this editor's own edits kept as the draft the banner
 *   offers back, replayed on top of it); `overwrite` (this version over
 *   theirs, knowingly — naming the version the refusal named, so a third save
 *   made meanwhile is still refused).
 *
 * @param {{storedAt?: string|null}} [options] the stored record's `updatedAt`:
 *   the version a save names until a restored draft or a refusal says otherwise
 */
export default function useStaleGuard({ storedAt = null } = {}) {
  const toast = useToast();
  const [conflict, setConflict] = useState(null);
  const [busy, setBusy] = useState(false);

  // The version the next save names.
  const version = useRef(storedAt);
  useEffect(() => {
    version.current = storedAt;
  }, [storedAt]);

  const conflictRef = useRef(null);
  conflictRef.current = conflict;

  /** The version the values on screen were made from. */
  const current = useCallback(() => version.current ?? null, []);

  /** A restored draft was made from this version, or a save answered with it. */
  const adopt = useCallback((next) => {
    if (next !== undefined) version.current = next ?? null;
  }, []);

  /** An update, naming the version it was made from. */
  const stamp = useCallback(
    (payload) => (version.current ? { ...payload, updatedAt: version.current } : payload),
    []
  );

  /** `true` when the failure was the refusal, and the dialog now answers it. */
  const onError = useCallback((thrown) => {
    if (!isStaleWrite(thrown)) return false;
    setConflict({ ...(thrown.data?.current ?? {}), message: thrown.message });
    return true;
  }, []);

  const dismiss = useCallback(() => setConflict(null), []);

  /**
   * "Save mine anyway".
   *
   * @param {() => Promise<unknown>} save the form's own save
   */
  const overwrite = useCallback((save) => {
    const pending = conflictRef.current;
    if (!pending) return Promise.resolve(false);
    version.current = pending.updatedAt ?? null;
    setConflict(null);
    return save();
  }, []);

  /**
   * "Load their version".
   *
   * @param {object} options
   * @param {() => Promise<{data?: object}>} options.fetchLatest reads the record again
   * @param {(record: object) => object} options.toValues the form's values of a record
   * @param {{baseline: object, values: object}} options.form what the form started
   *   from and what the editor made of it
   * @param {{put: (copy: object) => boolean}} options.draft the form's `useLocalDraft`
   * @param {(record: object) => void} options.load makes the record the form's
   */
  const reload = useCallback(
    async ({ fetchLatest, toValues, form, draft, load }) => {
      setBusy(true);
      try {
        const envelope = await fetchLatest();
        const fresh = envelope?.data ?? null;
        if (!fresh) return false;
        draft.put({
          values: rebase(form.baseline, form.values, toValues(fresh)),
          savedAt: new Date().toISOString(),
          version: fresh.updatedAt ?? null,
        });
        load(fresh);
        setConflict(null);
        return true;
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'The latest version could not be loaded.'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );

  return { conflict, busy, current, adopt, stamp, onError, dismiss, overwrite, reload };
}
