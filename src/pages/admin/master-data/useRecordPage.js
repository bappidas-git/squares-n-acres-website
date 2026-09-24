import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import focusFirstError from '../../../components/admin/focusFirstError';
import redirectMoves, { describeMoves } from '../../../components/admin/redirectMoves';
import { FORMS, TOASTS } from '../../../config/adminCopy';
import { applySeoSideEffects } from '../../../components/seo/seoSideEffects';
import { slugify } from '../../../utils/slug';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useNavigationGuard } from '../../../contexts/NavigationGuardContext';
import { useToast } from '../../../components/common/ToastProvider';

/**
 * What saving a full-page master-data record does — the locality and the
 * developer forms — in the order the article and page forms have done it
 * since QA-55 and QA-56 (QA-60):
 *
 * - **A refused save says so.** "Please fix the highlighted fields.", and the
 *   first of them is brought into view with the cursor in it. A latitude of 95
 *   further down the page was refused in silence: Save seemed to do nothing.
 * - **Nothing changed, nothing written.** "No changes to save." instead of a
 *   `PUT` and "Locality saved".
 * - **The saved record becomes the form**, from the API's answer. The form was
 *   read again instead, and swapped for its skeleton while it was: the page
 *   jumped back to the top after every save.
 * - **A new record replaces the add route** with its edit route, so Back does
 *   not open a blank "New locality" form that offers to create it again.
 * - **"Save & view" views only a live page.** A record switched off answers 404
 *   on the site; it is saved, and the editor is told why the page is not
 *   opening.
 * - **A live record whose URL changes redirects the old address** (301), unless
 *   the editor switches that off — the rule the Pages form follows.
 * - **Ctrl/Cmd+S saves**, once per press, as it does on every other form.
 *
 * @param {object} options
 * @param {'locality'|'developer'} options.entityType the SEO entity type
 * @param {string} options.noun "Locality", as the toasts name it
 * @param {boolean} options.isEdit
 * @param {object|null} options.record the stored record, as last read or saved
 * @param {(record: object) => void} options.setRecord replaces it without a read
 * @param {ReturnType<typeof import('../../../hooks/useForm').default>} options.form
 * @param {(slug: string) => string} options.publicPath the record's page
 * @param {(id: number|string) => string} options.editPath its edit screen
 * @param {() => void} options.onSaved after every save — the master-data cache
 * @param {{current: HTMLElement|null}} options.formRef the form element
 */
export default function useRecordPage({
  entityType,
  noun,
  isEdit,
  record,
  setRecord,
  form,
  publicPath,
  editPath,
  onSaved,
  formRef,
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const canRedirect = useAdminAuth().can('seo', 'edit');
  const [redirect, setRedirect] = useState(null);
  const [redirectOld, setRedirectOld] = useState(true);
  const [refusals, setRefusals] = useState(0);

  /** The address a live record is leaving, when its URL has been changed. */
  const liveSlug = isEdit && record && record.isActive !== false ? (record.slug ?? null) : null;
  // An emptied box asks the API for the name's slug; a name with none keeps
  // the slug the record has.
  const typedSlug = form.values.slug || slugify(form.values.name ?? '') || liveSlug;
  const slugMoved = Boolean(liveSlug && typedSlug && typedSlug !== liveSlug);

  // The messages of a refused save are drawn first; then the first of them is
  // brought into view.
  useEffect(() => {
    if (refusals === 0) return;
    focusFirstError(formRef.current);
  }, [refusals, formRef]);

  // Leaving after a save waits for the guard to let go, twice over. A saved
  // form is clean, but the provider only learns that one render later, and
  // `useBlocker` re-registers the question in an effect of its own — which runs
  // after this component's, because a child's effects run before its parent's.
  // So: wait for `isBlocking` to clear, then leave on the next tick. Navigating
  // any sooner meets a blocker still holding the previous, dirty answer, and
  // asks the editor whether to discard changes that have just been written.
  const { isBlocking } = useNavigationGuard();
  useEffect(() => {
    if (!redirect || isBlocking) return undefined;
    const timer = setTimeout(() => navigate(redirect.to, { replace: redirect.replace }), 0);
    return () => clearTimeout(timer);
  }, [redirect, isBlocking, navigate]);

  const saving = useRef(false);

  const save = useCallback(
    async (after = 'stay') => {
      if (saving.current) return;

      if (!form.validateAll()) {
        toast.error('Please fix the highlighted fields.');
        setRefusals((count) => count + 1);
        return;
      }

      // Nothing has changed since the last save: say so rather than write the
      // same record again.
      if (isEdit && record && !form.dirty) {
        if (after === 'view') {
          if (record.isActive === false) toast.info(FORMS.notLive(noun));
          else if (record.slug) setRedirect({ to: publicPath(record.slug) });
          return;
        }
        toast.info(FORMS.noChanges);
        return;
      }

      saving.current = true;
      const leaving = slugMoved && canRedirect && redirectOld ? liveSlug : null;
      try {
        const saved = await form.submit();
        if (!saved) {
          setRefusals((count) => count + 1);
          return;
        }

        // The answer becomes the form and its baseline: the settled order, the
        // slug the API chose, the analysis — without a second read.
        setRecord(saved);

        // The redirect this record's `seo` asks for, against the slug the API
        // answered with — a new record has none until now (§9.6).
        await applySeoSideEffects(entityType, saved);
        if (leaving && saved.slug && saved.slug !== leaving) {
          const result = await redirectMoves(
            [[publicPath(leaving), publicPath(saved.slug)]],
            `“${saved.name}” moved (Admin → Master data).`
          );
          const { info, error } = describeMoves(result);
          if (info) toast.info(info);
          if (error) toast.error(error);
        }

        toast.success(isEdit ? TOASTS.saved(noun) : TOASTS.created(noun));
        onSaved?.();

        if (after === 'view' && saved.slug) {
          if (saved.isActive === false) {
            toast.info(FORMS.notLive(noun));
          } else {
            setRedirect({ to: publicPath(saved.slug) });
            return;
          }
        }
        // A created record moves to its own URL, replacing the add route so
        // Back does not offer to create it a second time.
        if (!isEdit && saved.id) setRedirect({ to: editPath(saved.id), replace: true });
      } finally {
        saving.current = false;
      }
    },
    [
      form,
      toast,
      isEdit,
      record,
      noun,
      publicPath,
      editPath,
      slugMoved,
      canRedirect,
      redirectOld,
      liveSlug,
      setRecord,
      entityType,
      onSaved,
    ]
  );

  // Ctrl/Cmd+S saves, once per press — a held key repeats — and not while a
  // save is running or a dialog of the form's own is open (a link being added
  // to the description). A window listener, like the article form's: it hears
  // the key after React has rendered what the key did, so a description the
  // editor hands over on the same keystroke is part of the save.
  const saveRef = useRef(save);
  saveRef.current = save;
  const submitting = form.submitting;
  const busy = useRef(submitting);
  busy.current = submitting;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 's' && event.key !== 'S') return;
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.altKey || event.shiftKey) return;
      if (event.target?.closest?.('[role="dialog"]')) return;
      event.preventDefault();
      if (event.repeat || busy.current) return;
      saveRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return { save, slugMoved, liveSlug, canRedirect, redirectOld, setRedirectOld };
}
