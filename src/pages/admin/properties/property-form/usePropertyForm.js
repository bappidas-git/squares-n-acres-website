import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ApiError from '../../../../services/apiError';
import PATHS from '../../../../routes/paths';
import propertyService from '../../../../services/propertyService';
import storage from '../../../../utils/storage';
import useUnsavedChanges from '../../../../hooks/useUnsavedChanges';
import { SITE } from '../../../../config/site';
import { setIn } from '../../../../hooks/useForm';
import { useNavigationGuard } from '../../../../contexts/NavigationGuardContext';
import { useToast } from '../../../../components/common/ToastProvider';
import { DEFAULT_TAB, firstTabWithErrors, groupErrorsByTab, tabByKey } from './tabs';
import { computeCompleteness } from './completeness';
import { validateAll as runAllValidators, validateForActivation } from './validators';
import reducer, { actions, createFormState } from './reducer';
import toPayload from './toPayload';

/** How often a dirty form writes its draft to this browser (§4.2 of prompt 18). */
export const AUTOSAVE_INTERVAL_MS = 10000;

/** `sna_property_draft:<id|new>` — one draft per listing, per browser (§4.2). */
export const draftKey = (propertyId) => `sna_property_draft:${propertyId ?? 'new'}`;

/** The public address of a listing, for "View on site" and "Save & view". */
export const publicUrlOf = (slug) => `${SITE.url}${PATHS.propertyDetails(slug)}`;

const errorCount = (errors) => Object.keys(errors).length;

/**
 * The property form: one reducer, the validators, the draft and the writes
 * (00_MASTER_CONTEXT.md §6.1, §5.8, PROP-02/03/04).
 *
 * The page owns the fetch — it needs the loading and error states of §8.2 —
 * and hands the record here; everything that happens to it afterwards happens
 * in this hook, so the shell, the rail and sixteen tabs all read one state.
 *
 *   const form = usePropertyForm({ propertyId: id, record, readOnly: !canEdit });
 *
 * @param {object} options
 * @param {number|string|null} [options.propertyId] absent for a new listing
 * @param {object|null} [options.record] the record `GET /admin/properties/:id` returned
 * @param {boolean} [options.readOnly] a sales user: no writes, no autosave (§7)
 */
export default function usePropertyForm({
  propertyId = null,
  record = null,
  readOnly = false,
} = {}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { isBlocking } = useNavigationGuard();

  const [state, dispatch] = useReducer(reducer, { propertyId, record }, createFormState);
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);
  const [draftOffer, setDraftOffer] = useState(null);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [redirect, setRedirect] = useState(null);
  const [busy, setBusy] = useState(false);

  const { values, errors, initial } = state;

  // A cheap deep compare: the record is a few kilobytes of JSON and this runs
  // once per change, not once per keystroke per field.
  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initial),
    [values, initial]
  );

  // Read by the callbacks without becoming dependencies of them: a save must
  // see the values of the moment it runs, not of the render that created it.
  const latest = useRef({});
  latest.current = { values, errors, dirty, state, propertyId, readOnly, toast };

  useUnsavedChanges(dirty && !readOnly);

  /* ---------------------------------------------------------------- *
   * Loading
   * ---------------------------------------------------------------- */

  // A record is loaded once. A refetch that brings back the same version must
  // not overwrite what the editor has typed since — only a genuinely newer
  // record does, and that is the one case where the server is right.
  const loadedStamp = useRef(null);
  useEffect(() => {
    if (!record) return;
    const stamp = `${record.id}:${record.updatedAt ?? ''}`;
    if (loadedStamp.current === stamp) return;
    loadedStamp.current = stamp;
    dispatch(actions.load(record));
  }, [record]);

  /* ---------------------------------------------------------------- *
   * The draft
   * ---------------------------------------------------------------- */

  const clearDraft = useCallback(() => {
    storage.removeItem(draftKey(latest.current.propertyId));
    setDraftOffer(null);
    setDraftSavedAt(null);
  }, []);

  // Offered once: on a new listing straight away, on an existing one as soon as
  // the record is there to compare the draft's age against (§7 of prompt 18).
  const offered = useRef(false);
  useEffect(() => {
    if (readOnly || offered.current) return;
    if (propertyId && !record) return;
    offered.current = true;

    const draft = storage.getItem(draftKey(propertyId), null);
    if (!draft?.values || !draft.savedAt) return;

    const newerThanRecord =
      !record?.updatedAt || Date.parse(draft.savedAt) > Date.parse(record.updatedAt);
    if (!newerThanRecord) {
      storage.removeItem(draftKey(propertyId));
      return;
    }
    setDraftOffer(draft);
  }, [propertyId, record, readOnly]);

  // Autosave: every ten seconds, and only while there is something to save.
  useEffect(() => {
    if (readOnly) return undefined;

    const timer = setInterval(() => {
      const current = latest.current;
      if (!current.dirty || current.state.saving) return;
      const savedAt = new Date().toISOString();
      if (storage.setItem(draftKey(current.propertyId), { values: current.values, savedAt })) {
        setDraftSavedAt(savedAt);
      }
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [readOnly]);

  const restoreDraft = useCallback(() => {
    setDraftOffer((offer) => {
      if (offer) dispatch(actions.restoreDraft(offer));
      return null;
    });
  }, []);

  const discardDraft = useCallback(() => {
    storage.removeItem(draftKey(latest.current.propertyId));
    setDraftOffer(null);
  }, []);

  /* ---------------------------------------------------------------- *
   * Writing values
   * ---------------------------------------------------------------- */

  const setField = useCallback((path, value) => dispatch(actions.set(path, value)), []);
  const setFields = useCallback((patch) => dispatch(actions.setMany(patch)), []);
  const addItem = useCallback(
    (path, item, index) => dispatch(actions.listAdd(path, item, index)),
    []
  );
  const removeItem = useCallback((path, id) => dispatch(actions.listRemove(path, id)), []);
  const moveItem = useCallback((path, from, to) => dispatch(actions.listMove(path, from, to)), []);
  const updateItem = useCallback(
    (path, id, patch) => dispatch(actions.listUpdate(path, id, patch)),
    []
  );

  /* ---------------------------------------------------------------- *
   * Validation
   * ---------------------------------------------------------------- */

  /** Every rule, against a candidate set of values. */
  const collectErrors = useCallback(
    (candidate) => runAllValidators(candidate, { propertyId: latest.current.propertyId }),
    []
  );

  /**
   * One tab's rules, merged over what the other tabs already reported.
   *
   * @param {string} key a tab key
   * @returns {boolean} whether that tab is clean
   */
  const validateTab = useCallback((key) => {
    const tab = tabByKey(key);
    const current = latest.current;
    const found = tab.validator(current.values, { propertyId: current.propertyId }) ?? {};

    // Replace this tab's share of the map and leave every other tab's alone.
    const others = Object.fromEntries(
      Object.entries(current.errors).filter(
        ([path]) => !tab.fields.some((prefix) => path === prefix || path.startsWith(`${prefix}.`))
      )
    );
    dispatch(actions.setErrors({ ...others, ...found }));
    return errorCount(found) === 0;
  }, []);

  /**
   * Every rule, painted onto the form.
   *
   * @returns {boolean} whether the listing may be saved
   */
  const validateAll = useCallback(() => {
    const found = collectErrors(latest.current.values);
    dispatch(actions.setErrors(found));
    const tab = firstTabWithErrors(found);
    if (tab) setActiveTab(tab);
    return errorCount(found) === 0;
  }, [collectErrors]);

  /**
   * Turns "Published on site" on, or explains why it cannot go on (PROP-04).
   *
   * @param {boolean} next
   * @returns {boolean} whether the switch moved
   */
  const setActive = useCallback(
    (next) => {
      if (!next) {
        dispatch(actions.set('isActive', false));
        return true;
      }

      const current = latest.current;
      const candidate = setIn(current.values, 'isActive', true);
      const blockers = validateForActivation(candidate).errors;

      if (errorCount(blockers) > 0) {
        dispatch(actions.setErrors({ ...current.errors, ...blockers }));
        const tab = firstTabWithErrors(blockers);
        if (tab) setActiveTab(tab);
        toast.error(
          'This listing is not ready to publish. Fix what is highlighted, or save it as inactive.'
        );
        return false;
      }

      dispatch(actions.set('isActive', true));
      return true;
    },
    [toast]
  );

  /* ---------------------------------------------------------------- *
   * Saving
   * ---------------------------------------------------------------- */

  /** Paints a 422 onto the fields it names and opens the first tab holding one (§5.3). */
  const applyServerErrors = useCallback((thrown) => {
    const fields = thrown?.errors ?? {};
    const mapped = Object.fromEntries(
      Object.entries(fields).map(([path, messages]) => [
        path,
        Array.isArray(messages) ? String(messages[0]) : String(messages),
      ])
    );
    if (errorCount(mapped) === 0) return;

    dispatch(actions.setErrors({ ...latest.current.errors, ...mapped }));
    const tab = firstTabWithErrors(mapped);
    if (tab) setActiveTab(tab);
  }, []);

  /**
   * Saves the listing.
   *
   * @param {'save'|'continue'|'view'|'inactive'} [mode]
   *   `continue` is `save` under another label; `view` opens the public page
   *   afterwards; `inactive` switches the listing off first, which is how an
   *   unfinished listing gets stored without meeting the activation rules.
   * @returns {Promise<object|false>} the saved record, or `false`
   */
  const save = useCallback(
    async (mode = 'save') => {
      const current = latest.current;
      if (current.readOnly) return false;

      const candidate =
        mode === 'inactive' ? setIn(current.values, 'isActive', false) : current.values;

      const found = collectErrors(candidate);
      if (errorCount(found) > 0) {
        dispatch(actions.setErrors(found));
        const tab = firstTabWithErrors(found);
        if (tab) setActiveTab(tab);
        const count = errorCount(found);
        toast.error(`Please fix ${count} field${count === 1 ? '' : 's'}.`);
        return false;
      }

      const payload = toPayload(candidate);
      dispatch(actions.setSaving(true));

      try {
        const envelope = current.propertyId
          ? await propertyService.update(current.propertyId, payload)
          : await propertyService.create(payload);
        const saved = envelope?.data ?? null;

        dispatch(actions.markSaved(saved));
        storage.removeItem(draftKey(current.propertyId));
        setDraftOffer(null);
        setDraftSavedAt(null);
        toast.success(current.propertyId ? 'Property saved.' : 'Property created.');

        // A created listing moves to its own URL, replacing the add route so
        // Back does not offer to create it a second time.
        if (!current.propertyId && saved?.id) {
          setRedirect({ to: PATHS.adminPropertyEdit(saved.id), replace: true });
        }

        if (mode === 'view' && saved?.slug) {
          const url = publicUrlOf(saved.slug);
          const opened = window.open(url, '_blank', 'noopener,noreferrer');
          // A blocked pop-up must not swallow the action: the tab it could not
          // open becomes a navigation in this one.
          if (!opened) setRedirect({ to: PATHS.propertyDetails(saved.slug), replace: false });
        }

        return saved;
      } catch (thrown) {
        dispatch(actions.setSaving(false));
        const enriched = await withSlugSuggestion(thrown, payload.slug, current.propertyId);
        applyServerErrors(enriched);
        toast.error(enriched?.message ?? 'The property could not be saved.');
        return false;
      }
    },
    [applyServerErrors, collectErrors, toast]
  );

  /** `POST /admin/properties/:id/duplicate` → the copy's own form (§5.14). */
  const duplicate = useCallback(async () => {
    const current = latest.current;
    if (!current.propertyId || current.readOnly) return false;

    setBusy(true);
    try {
      const envelope = await propertyService.duplicate(current.propertyId);
      const copy = envelope?.data ?? null;
      if (!copy?.id) return false;
      toast.success('Copy created. It is inactive until you publish it.');
      dispatch(actions.reset());
      setRedirect({ to: PATHS.adminPropertyEdit(copy.id), replace: false });
      return copy;
    } catch (thrown) {
      toast.error(thrown?.message ?? 'The property could not be duplicated.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [toast]);

  /** `DELETE /admin/properties/:id` → back to the list (§5.14). */
  const remove = useCallback(async () => {
    const current = latest.current;
    if (!current.propertyId || current.readOnly) return false;

    setBusy(true);
    try {
      await propertyService.remove(current.propertyId);
      storage.removeItem(draftKey(current.propertyId));
      toast.success('Property deleted.');
      dispatch(actions.reset());
      setRedirect({ to: PATHS.adminProperties, replace: true });
      return true;
    } catch (thrown) {
      toast.error(thrown?.message ?? 'The property could not be deleted.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [toast]);

  // Leaving waits for the guard to let go, twice over: a saved form is clean,
  // but the provider learns that one render later and `useBlocker` re-registers
  // the question in an effect of its own. Navigating any sooner meets a blocker
  // still holding the previous, dirty answer.
  useEffect(() => {
    if (!redirect || isBlocking) return undefined;
    const timer = setTimeout(() => navigate(redirect.to, { replace: redirect.replace }), 0);
    return () => clearTimeout(timer);
  }, [redirect, isBlocking, navigate]);

  /* ---------------------------------------------------------------- *
   * Derived
   * ---------------------------------------------------------------- */

  const errorsByTab = useMemo(() => groupErrorsByTab(errors), [errors]);
  const completeness = useMemo(() => computeCompleteness(values), [values]);
  const warnings = useMemo(() => validateForActivation(values).warnings, [values]);

  return {
    state,
    dispatch,
    values,
    errors,
    dirty,
    saving: state.saving,
    busy,
    isNew: state.isNew,
    propertyId,
    readOnly,
    lastSavedAt: state.lastSavedAt,
    activeTab,
    setActiveTab,
    setField,
    setFields,
    addItem,
    removeItem,
    moveItem,
    updateItem,
    setActive,
    validateTab,
    validateAll,
    save,
    duplicate,
    remove,
    errorsByTab,
    completeness,
    warnings,
    draftOffer,
    draftSavedAt,
    restoreDraft,
    discardDraft,
    clearDraft,
    publicUrl: values.slug ? publicUrlOf(values.slug) : null,
  };
}

/**
 * The 409 of a duplicate slug, with the free variant to take.
 *
 * The API answers `{ message, errors: { slug } }` but no suggestion, and the
 * suggestion is the useful half — so it is fetched from `check-slug` and put in
 * front of the field that caused it (§5.9).
 */
async function withSlugSuggestion(thrown, slug, excludeId) {
  if (thrown?.status !== 409 || !slug) return thrown;

  try {
    const { data } = await propertyService.checkSlug({ slug, excludeId });
    if (!data?.suggestion || data.suggestion === slug) return thrown;

    return new ApiError({
      status: thrown.status,
      message: thrown.message,
      data: thrown.data,
      original: thrown,
      errors: { ...thrown.errors, slug: [`${thrown.message} Try “${data.suggestion}”.`] },
    });
  } catch {
    // The suggestion is a nicety; the refusal is the answer.
    return thrown;
  }
}
