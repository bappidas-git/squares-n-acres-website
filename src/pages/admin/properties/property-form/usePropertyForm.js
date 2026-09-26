import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ApiError from '../../../../services/apiError';
import PATHS from '../../../../routes/paths';
import propertyService from '../../../../services/propertyService';
import storage from '../../../../utils/storage';
import useUnsavedChanges from '../../../../hooks/useUnsavedChanges';
import { SITE } from '../../../../config/site';
import { TOASTS } from '../../../../config/adminCopy';
import { firstFieldMessage } from '../../../../services/apiError';
import { setIn } from '../../../../hooks/useForm';
import { useNavigationGuard } from '../../../../contexts/NavigationGuardContext';
import { useToast } from '../../../../components/common/ToastProvider';
import { PREVIEW_QUERY, publicUrlOf, viewPathOf, viewUrlOf } from '../publicUrl';
import { DEFAULT_TAB, firstTabWithErrors, groupErrorsByTab, tabByKey, tabOfPath } from './tabs';
import { focusFieldElement, resolveFieldPath } from './fieldFocus';
import { applySeoSideEffects, redirectWarning } from '../../../../components/seo/seoSideEffects';
import { computeCompleteness } from './completeness';
import { validateAll as runAllValidators, validateForActivation } from './validators';
import fromRecord from './fromRecord';
import rebase from './rebase';
import reducer, { actions, createFormState } from './reducer';
import toPayload, { formPathOf, keptRowIndexes } from './toPayload';
import { reserveTmpIds } from './initialState';

/** How often a dirty form writes its draft to this browser (§4.2 of prompt 18). */
export const AUTOSAVE_INTERVAL_MS = 10000;

/** `sna_property_draft:<id|new>` — one draft per listing, per browser (§4.2). */
export const draftKey = (propertyId) => `sna_property_draft:${propertyId ?? 'new'}`;

/**
 * Where "Save & view" goes.
 *
 * A published listing has a public page; an unpublished one answers 404 to
 * everybody, so an editor is sent to the admin preview of it instead — the
 * route reads the record through `GET /admin/properties/slug/:slug` while they
 * are signed in (decision logged in `docs/DECISIONS.md`). The addresses live
 * in `../publicUrl`, which the property list links through as well, and are
 * re-exported here for the form's own callers.
 */
export { PREVIEW_QUERY, publicUrlOf, viewPathOf, viewUrlOf };

const errorCount = (errors) => Object.keys(errors).length;

/**
 * A draft: the values on screen, when they were kept, and the version of the
 * record they were made from — so a draft restored after somebody else saved
 * the listing is refused by the version check instead of undoing that save.
 */
const draftOf = (current) => ({
  values: current.values,
  savedAt: new Date().toISOString(),
  version: current.state.version ?? null,
});

/** The 409 of a save made over somebody else's (QA-62) — not the slug's 409. */
const isStaleWrite = (thrown) => thrown?.status === 409 && thrown?.data?.conflict === 'stale';

/** How long a focus request keeps looking for a control a lazy tab has not drawn yet. */
const FOCUS_ATTEMPTS = 12;
const FOCUS_RETRY_MS = 60;

/**
 * The first message of the first tab that holds one — what a failed save
 * scrolls to. The error map is built in tab order, field by field.
 */
function firstErrorPath(errors) {
  const tab = firstTabWithErrors(errors);
  return Object.keys(errors).find((path) => tabOfPath(path) === tab) ?? null;
}

/** The publish blockers that belong to one tab's fields. */
function activationErrorsFor(tab, values) {
  if (values?.isActive !== true) return {};
  const owned = (path) =>
    tab.fields.some((prefix) => path === prefix || path.startsWith(`${prefix}.`));
  return Object.fromEntries(
    Object.entries(validateForActivation(values).errors).filter(([path]) => owned(path))
  );
}

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
  // A save refused because somebody else saved the listing after this form
  // read it: who, when, and which save the editor was making (QA-62).
  const [conflict, setConflict] = useState(null);
  // A save that found the listing deleted elsewhere: there is nothing left to
  // edit, only the work on screen to keep (QA-62).
  const [gone, setGone] = useState(false);

  // Focusing a control on another tab has to wait for the render that mounts
  // it. A request carries a counter so that asking for a field on the tab
  // already open — where `setActiveTab` changes nothing and no effect keyed on
  // the tab would run — still moves the cursor.
  const [focusRequest, setFocusRequest] = useState(null);
  // The SEO panel owns its own controls and sub-tabs; a request for `seo.*` is
  // handed to it rather than looked for here.
  const [seoFocusRequest, setSeoFocusRequest] = useState(null);

  // A save in flight: read synchronously, so a second Ctrl+S — or a key held
  // down — cannot start another request before the first one answers.
  const savingRef = useRef(false);

  // Set when the editor answers the unsaved-changes question with "Discard":
  // what they threw away is not kept as a draft on the way out.
  const discardedRef = useRef(false);

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
  latest.current = { values, errors, dirty, state, propertyId, readOnly, toast, gone, conflict };

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
    // The route may hand this same form another listing (Duplicate, then
    // Back): a "discard" answered about the last one says nothing about it.
    discardedRef.current = false;
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

  /**
   * Writes what is on screen as this browser's draft, now rather than at the
   * next ten-second tick. Used when the form is about to go away without the
   * editor having said "discard": the tab unloading, the session ending.
   */
  const keepDraft = useCallback(() => {
    const current = latest.current;
    if (current.readOnly || !current.dirty || current.gone) return false;
    return storage.setItem(draftKey(current.propertyId), draftOf(current));
  }, []);

  // "Discard changes" means it: the draft autosaved from those changes went on
  // being offered — "Unsaved changes were found in this browser" — the next
  // time the listing was opened (QA-62).
  const forgetDraft = useCallback(() => {
    discardedRef.current = true;
    clearDraft();
  }, [clearDraft]);

  useUnsavedChanges(dirty && !readOnly, { onDiscard: forgetDraft });

  // Leaving without discarding keeps the work. The guard lets a sign-in page
  // through without asking — a session that ended cannot be stayed in — so a
  // form that goes away dirty writes its draft on the way out, and the
  // listing offers it back after signing in; a reload does the same through
  // `pagehide`, rather than losing whatever the last autosave missed (QA-62).
  useEffect(() => {
    if (readOnly) return undefined;
    window.addEventListener('pagehide', keepDraft);
    return () => {
      window.removeEventListener('pagehide', keepDraft);
      if (!discardedRef.current) keepDraft();
    };
  }, [readOnly, keepDraft]);

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
      if (!current.dirty || current.state.saving || current.gone) return;
      const draft = draftOf(current);
      if (storage.setItem(draftKey(current.propertyId), draft)) setDraftSavedAt(draft.savedAt);
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [readOnly]);

  const restoreDraft = useCallback(() => {
    setDraftOffer((offer) => {
      if (offer) {
        // The draft's new rows carry the `tmp-n` ids of the session that wrote
        // it, and this session's counter started again at 1: without moving it
        // past them, the next row added shared an id with a restored one, and
        // typing into it renamed both.
        reserveTmpIds(offer.values);
        dispatch(actions.restoreDraft(offer));
      }
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

  /**
   * Opens the tab that owns a dotted path and puts the cursor in the control.
   *
   * This is what the SEO panel's fix hints do: "the body never uses the focus
   * keyword" is a sentence, and a click that opens Basics with the cursor in
   * the description is a fix. The path is the analyser's `field` — `content`,
   * `images`, `faqs`, `pricing` — and `tabOfPath` already knows which tab owns
   * each one, because that is how a 422 finds its badge (§5.3).
   *
   * @param {string} path
   */
  const focusField = useCallback((path) => {
    if (!path) return;
    const target = resolveFieldPath(path, latest.current.values);

    // The panel's own fields — the snippet, the social cards, the robots —
    // are reached through the panel, which knows its sub-tabs and its ids.
    if (target.startsWith('seo.')) {
      setActiveTab('seo');
      setSeoFocusRequest((previous) => ({ path: target, nonce: (previous?.nonce ?? 0) + 1 }));
      return;
    }

    setActiveTab(tabOfPath(target));
    setFocusRequest((previous) => ({ path: target, nonce: (previous?.nonce ?? 0) + 1 }));
  }, []);
  const setFields = useCallback((patch) => dispatch(actions.setMany(patch)), []);

  /**
   * Fields the form computes — the SEO panel's score and its test results.
   *
   * They arrive through the panel's `onChange` like an edit does, and the first
   * analysis runs as soon as the SEO tab mounts, so treating them as an edit
   * made an untouched form warn about unsaved changes. The reducer moves
   * `initial` with them, which leaves `dirty` answering about the editor's own
   * work and nothing else.
   */
  const setComputed = useCallback((patch) => dispatch(actions.setComputed(patch)), []);
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
    // The tab's own rules and, while the listing is published, the publish
    // rules for its fields: leaving Basics used to wipe "a published listing
    // needs a one-line summary" along with the badge, although nothing had
    // been fixed and the next save refused it again.
    const found = {
      ...(tab.validator(current.values, { propertyId: current.propertyId }) ?? {}),
      ...activationErrorsFor(tab, current.values),
    };

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
    const first = firstErrorPath(found);
    if (first) focusField(first);
    return errorCount(found) === 0;
  }, [collectErrors, focusField]);

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
        // The tab opens on the first thing to fix, not wherever the page was
        // scrolled to: the badge said "2" and the two fields were a screen
        // below the fold.
        const first = firstErrorPath(blockers);
        if (first) focusField(first);
        toast.error(
          'This listing is not ready to publish. Fix what is highlighted, or save it as inactive.'
        );
        return false;
      }

      dispatch(actions.set('isActive', true));
      return true;
    },
    [focusField, toast]
  );

  /* ---------------------------------------------------------------- *
   * Saving
   * ---------------------------------------------------------------- */

  /**
   * Paints a 422 onto the fields it names and opens the first tab holding one
   * (§5.3). A row index is the payload's, which left out the rows nobody filled
   * in, so it is moved back onto the form's row before it is painted.
   */
  const applyServerErrors = useCallback(
    (thrown, sentValues) => {
      const fields = thrown?.errors ?? {};
      const kept = keptRowIndexes(sentValues ?? latest.current.values);
      const mapped = Object.fromEntries(
        Object.entries(fields).map(([path, messages]) => [
          formPathOf(path, kept),
          Array.isArray(messages) ? String(messages[0]) : String(messages),
        ])
      );
      if (errorCount(mapped) === 0) return;

      dispatch(actions.setErrors({ ...latest.current.errors, ...mapped }));
      const first = firstErrorPath(mapped);
      if (first) focusField(first);
    },
    [focusField]
  );

  /**
   * Saves the listing.
   *
   * @param {'save'|'continue'|'view'|'inactive'} [mode]
   *   `continue` is `save` under another label; `view` opens the page
   *   afterwards — the public one, or the admin preview when the listing is not
   *   published; `inactive` switches the listing off first, which is how an
   *   unfinished listing gets stored without meeting the activation rules.
   * @returns {Promise<object|false>} the saved record, or `false`
   */
  const save = useCallback(
    async (mode = 'save', { version } = {}) => {
      const current = latest.current;
      if (current.readOnly) return false;
      // One write at a time: a second Ctrl+S on a new listing used to POST it
      // twice, and the second answer — "that URL is taken" — landed on the
      // listing the first one had just created.
      if (savingRef.current) return false;

      const candidate =
        mode === 'inactive' ? setIn(current.values, 'isActive', false) : current.values;

      const found = collectErrors(candidate);
      if (errorCount(found) > 0) {
        dispatch(actions.setErrors(found));
        const first = firstErrorPath(found);
        if (first) focusField(first);
        const count = errorCount(found);
        toast.error(`Please fix ${count} field${count === 1 ? '' : 's'}.`);
        return false;
      }

      const payload = toPayload(candidate);
      const wasPublished = current.state.initial?.isActive === true;
      // An update names the version it was made from — the `updatedAt` this
      // form read — and the API refuses it when the listing has been saved
      // since. Without it, two editors (or one editor in two tabs) overwrote
      // each other silently: a form left open un-featured a listing starred
      // from the list meanwhile (QA-62). `version: null` is "save over it".
      const basedOn = version === undefined ? current.state.version : version;
      const body = current.propertyId && basedOn ? { ...payload, updatedAt: basedOn } : payload;
      savingRef.current = true;
      dispatch(actions.setSaving(true));

      try {
        const envelope = current.propertyId
          ? await propertyService.update(current.propertyId, body)
          : await propertyService.create(payload);
        const saved = envelope?.data ?? null;
        setConflict(null);

        // `sent` is what this save was made of: anything typed since it left
        // is kept on screen, and still unsaved, rather than replaced by the
        // server's copy of the older values.
        dispatch(actions.markSaved(saved, current.values));
        storage.removeItem(draftKey(current.propertyId));
        setDraftOffer(null);
        setDraftSavedAt(null);

        // The redirect this listing's `seo` asks for is written now, against
        // the slug the API answered with — a new listing has none until this
        // point (§9.6). It comes after the state that says the listing is
        // saved, because it never throws and never changes that answer.
        const effects = await applySeoSideEffects('property', saved);
        if (effects.ok) toast.success(savedMessage(mode, saved, wasPublished));
        else toast.warning(redirectWarning(effects.error));

        // A created listing moves to its own URL, replacing the add route so
        // Back does not offer to create it a second time.
        if (!current.propertyId && saved?.id) {
          setRedirect({ to: PATHS.adminPropertyEdit(saved.id), replace: true });
        }

        if (mode === 'view' && saved?.slug) {
          const path = viewPathOf(saved.slug, saved.isActive === true);
          // Opened without the `noopener` feature, because with it the call
          // returns `null` by specification — so the "blocked pop-up" branch
          // below ran on every save and dragged the editor's own tab to the
          // page as well. The opener is cut by hand instead.
          const opened = window.open(`${SITE.url}${path}`, '_blank');
          if (opened) {
            opened.opener = null;
          } else if (current.propertyId) {
            // Genuinely blocked: the page opens here instead. A new listing
            // keeps its move to its own edit URL, and says where the page is.
            setRedirect({ to: path, replace: false });
          } else {
            toast.info(`Your browser blocked the new tab. The page is at ${path}.`);
          }
        }

        return saved;
      } catch (thrown) {
        dispatch(actions.setSaving(false));
        if (thrown?.status === 401) {
          // The session ended: the sign-in screen says so and takes over, and
          // what was about to be saved stays in this browser as the draft the
          // listing offers back after signing in. The API's own
          // "Unauthenticated." under "Your session has expired" said nothing
          // more (QA-62).
          keepDraft();
          return false;
        }
        if (isStaleWrite(thrown)) {
          // Nothing is overwritten and nothing is lost: the dialog says who
          // saved in between, and offers their version or this one.
          setConflict({ ...(thrown.data?.current ?? {}), mode, message: thrown.message });
          return false;
        }
        if (current.propertyId && thrown?.status === 404) {
          // Deleted in another tab or by another editor while this was open.
          setGone(true);
          toast.error(TOASTS.gone('This listing'));
          return false;
        }
        const enriched = await withSlugSuggestion(thrown, payload.slug, current.propertyId);
        applyServerErrors(enriched, candidate);
        toast.error(enriched?.message ?? 'The property could not be saved.');
        return false;
      } finally {
        savingRef.current = false;
      }
    },
    [applyServerErrors, collectErrors, focusField, keepDraft, toast]
  );

  // Ctrl/Cmd+S saves rather than offering to save the HTML of the page. The
  // handler reads `save` through the ref so it is registered once (§8.3).
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (readOnly) return undefined;

    const onKeyDown = (event) => {
      // The physical key, so the shortcut works on a Hindi or Kannada layout
      // too, where `event.key` is not "s".
      const isS = event.code === 'KeyS' || event.key === 's' || event.key === 'S';
      if (!isS) return;
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.altKey || event.shiftKey) return;
      event.preventDefault();
      // A key held down repeats; one press is one save.
      if (event.repeat) return;
      saveRef.current('save');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [readOnly]);

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

  /* ---------------------------------------------------------------- *
   * A save made over somebody else's, and a listing deleted elsewhere
   * ---------------------------------------------------------------- */

  /** "Keep editing": the refusal is closed, nothing is sent. */
  const dismissConflict = useCallback(() => setConflict(null), []);

  /**
   * "Save mine anyway": the same save again, over the version the refusal
   * named — so a third save made meanwhile is still refused, not overwritten.
   */
  const overwriteConflict = useCallback(() => {
    const pending = latest.current.conflict;
    if (!pending) return Promise.resolve(false);
    setConflict(null);
    return saveRef.current(pending.mode ?? 'save', { version: pending.updatedAt ?? null });
  }, []);

  /**
   * "Load their version": the listing as it now stands, with this editor's
   * work kept as a draft the banner offers back — restoring it is saving over
   * a version they have now seen.
   */
  const reloadConflict = useCallback(async () => {
    const current = latest.current;
    if (!current.propertyId) return false;
    setBusy(true);
    try {
      const envelope = await propertyService.adminGet(current.propertyId);
      const fresh = envelope?.data ?? null;
      if (!fresh) return false;
      // Their version with this editor's own edits replayed on top — not the
      // whole form as it was, which undid their save again on restore.
      const draft = {
        ...draftOf(current),
        values: rebase(current.state.initial, current.values, fromRecord(fresh)),
        version: fresh.updatedAt ?? null,
      };
      storage.setItem(draftKey(current.propertyId), draft);
      loadedStamp.current = `${fresh.id}:${fresh.updatedAt ?? ''}`;
      dispatch(actions.load(fresh));
      setConflict(null);
      setDraftOffer(draft);
      return true;
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The latest version could not be loaded.'));
      return false;
    } finally {
      setBusy(false);
    }
  }, [toast]);

  /**
   * The listing was deleted while this form was open: the work on screen is
   * created as a new listing rather than lost. Its old address is kept when it
   * is still free; taken since, the API derives a free one from the title.
   */
  const saveAsNew = useCallback(async () => {
    const current = latest.current;
    if (current.readOnly || savingRef.current) return false;
    const payload = toPayload(current.values);
    savingRef.current = true;
    setBusy(true);
    try {
      let envelope;
      try {
        envelope = await propertyService.create(payload);
      } catch (thrown) {
        if (thrown?.status !== 409) throw thrown;
        envelope = await propertyService.create({ ...payload, slug: '' });
      }
      const saved = envelope?.data ?? null;
      if (!saved?.id) return false;
      storage.removeItem(draftKey(current.propertyId));
      dispatch(actions.markSaved(saved));
      setGone(false);
      toast.success('Saved as a new listing.');
      setRedirect({ to: PATHS.adminPropertyEdit(saved.id), replace: true });
      return saved;
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The listing could not be saved as a new one.'));
      return false;
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  }, [toast]);

  // Leaving waits for the guard to let go, twice over: a saved form is clean,
  // but the provider learns that one render later and `useBlocker` re-registers
  // the question in an effect of its own. Navigating any sooner meets a blocker
  // still holding the previous, dirty answer.
  useEffect(() => {
    if (!redirect || isBlocking) return undefined;
    const timer = setTimeout(() => {
      navigate(redirect.to, { replace: redirect.replace });
      // Spent: left in place, it navigated again every time the guard let go
      // — each save after a Duplicate pushed another copy of the same URL.
      setRedirect(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [redirect, isBlocking, navigate]);

  // A request for the SEO panel is spent once the editor leaves its tab:
  // left in place, it put the cursor back in that field every time the tab
  // was opened again.
  useEffect(() => {
    if (activeTab !== 'seo') setSeoFocusRequest(null);
  }, [activeTab]);

  // A tab drawn lazily (the map, the rich-text editor) may not have its
  // controls on the first tick, so the request looks a few times before it
  // gives up.
  useEffect(() => {
    if (!focusRequest) return undefined;
    let attempts = 0;
    let timer = null;

    const attempt = () => {
      attempts += 1;
      const last = attempts >= FOCUS_ATTEMPTS;
      // The message the form holds for the path, so a control without an id
      // of its own is still found by what it says is wrong.
      const message = latest.current.errors[focusRequest.path];
      if (focusFieldElement(focusRequest.path, { fallback: last, message }) || last) return;
      timer = setTimeout(attempt, FOCUS_RETRY_MS);
    };

    timer = setTimeout(attempt, 0);
    return () => clearTimeout(timer);
  }, [focusRequest]);

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
    setComputed,
    addItem,
    removeItem,
    moveItem,
    updateItem,
    setActive,
    focusField,
    seoFocusRequest,
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
    conflict,
    dismissConflict,
    overwriteConflict,
    reloadConflict,
    gone,
    saveAsNew,
    publicUrl: values.slug ? publicUrlOf(values.slug) : null,
    /**
     * Where "View on site" / "Preview" goes — the preview link while
     * unpublished. Built from the **saved** listing: an unsaved slug or status
     * made the link a 404 (prompt 51).
     */
    viewUrl: state.initial?.slug
      ? viewUrlOf(state.initial.slug, state.initial.isActive === true)
      : null,
    /** The address or the status differs from the saved listing's. */
    viewStale:
      Boolean(state.initial?.slug) &&
      (values.slug !== state.initial.slug ||
        (values.isActive === true) !== (state.initial.isActive === true)),
  };
}

/**
 * What a save says it did.
 *
 * "Property published" is the one that matters: an editor who flipped the
 * switch and pressed Save wants to be told the page is live, not that a record
 * was written.
 *
 * @param {'save'|'continue'|'view'|'inactive'} mode
 * @param {object|null} saved the record the API returned
 * @param {boolean} wasPublished whether it was live before this save
 */
function savedMessage(mode, saved, wasPublished) {
  if (mode === 'inactive' || saved?.isActive === false) return 'Saved as inactive.';
  if (saved?.isActive === true && !wasPublished) return 'Property published.';
  return 'Property saved.';
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
