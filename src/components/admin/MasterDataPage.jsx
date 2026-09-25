import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import Switch from '@mui/material/Switch';

import Button from '../ui/Button';
import Chip from '../ui/Chip';
import ConfirmDialog from '../ui/ConfirmDialog';
import DataTable, { DEFAULT_PER_PAGE, TableFooter } from './DataTable';
import DeleteGuardDialog from './DeleteGuardDialog';
import FilterBar from './FilterBar';
import IconButton from '../ui/IconButton';
import MasterDataForm from './MasterDataForm';
import Modal from '../ui/Modal';
import PageHeader from './PageHeader';
import RowActions from './RowActions';
import SortableList from './SortableList';
import useApiList from '../../hooks/useApiList';
import useBreakpoint from '../../hooks/useBreakpoint';
import useForm from '../../hooks/useForm';
import useLingering from '../../hooks/useLingering';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import focusFirstError from './focusFirstError';
import sanitiseParams from './sanitiseParams';
import withSlugSuggestion from './slugSuggestion';
import { DIALOGS, FORMS, TABLES, TOASTS } from '../../config/adminCopy';
import { applySeoSideEffects, validateSeoBranch } from '../seo/seoSideEffects';
import ApiError, { firstFieldMessage } from '../../services/apiError';
import { toSeoPayload, withSeoDefaults } from '../seo/seoValues';
import { tidyPhone } from '../../utils/validators';
import { useToast } from '../common/ToastProvider';

import styles from './MasterDataPage.module.css';

/** The query type each filter kind serialises as (§5.6). */
const PARAM_TYPE = {
  search: 'string',
  select: 'string',
  multiselect: 'csv',
  toggle: 'string',
};

// Moved to its own module so the screens that build their own list — the job
// applications and the newsletter (QA-61) — sanitise the same way without
// bringing this one along; re-exported for the callers that read it here.
export { sanitiseParams };
// Beside `normalizePhone`, so the forms that are not built on this screen —
// the profile page, the property form's Agent tab — tidy a number the same way
// without bringing it along (QA-61); re-exported for the callers that read it here.
export { tidyPhone };

/** `{ key: type }` for `useApiList`, derived from the filters a config declares. */
function paramKeysOf(filters = [], extra = {}) {
  const keys = { page: 'int', perPage: 'int', sort: 'string', order: 'string' };

  for (const filter of filters) {
    if (filter.type === 'daterange' || filter.type === 'number-range') {
      const [from, to] = filter.keys ?? [`${filter.key}From`, `${filter.key}To`];
      const type = filter.type === 'daterange' ? 'string' : 'int';
      keys[from] = type;
      keys[to] = type;
      continue;
    }
    keys[filter.key] = PARAM_TYPE[filter.type] ?? 'string';
  }

  return { ...keys, ...extra };
}

/**
 * The list half of a master-data screen, without any layout.
 *
 * A screen that needs a different arrangement — a split view, an extra panel —
 * calls this and lays the pieces out itself; `MasterDataPage` is the default
 * arrangement of exactly these pieces.
 *
 * @param {object} config see `MasterDataPage`
 */
export function useMasterDataCrud(config) {
  const {
    key: collectionKey,
    service,
    columns = [],
    filters = [],
    defaultSort = { field: 'createdAt', order: 'desc' },
    paramKeys: extraParamKeys,
    onMutated,
    flagMessage,
  } = config;

  const toast = useToast();

  const defaults = useMemo(
    () => ({
      page: 1,
      perPage: DEFAULT_PER_PAGE,
      sort: defaultSort.field,
      order: defaultSort.order,
    }),
    [defaultSort.field, defaultSort.order]
  );

  const paramKeys = useMemo(() => paramKeysOf(filters, extraParamKeys), [filters, extraParamKeys]);

  // The orders a request may name: the sortable columns, and the default one.
  const sortKeys = useMemo(
    () => [
      ...new Set([
        defaultSort.field,
        ...columns.filter((column) => column.sortable).map((column) => column.key),
      ]),
    ],
    [columns, defaultSort.field]
  );
  const sanitise = useCallback(
    (params) => sanitiseParams(params, { filters, sortKeys, defaults }),
    [filters, sortKeys, defaults]
  );

  const list = useApiList((params, opts) => service.list(sanitise(params), opts), {
    syncToUrl: true,
    paramKeys,
    defaults,
  });

  const view = useMemo(() => sanitise(list.params), [sanitise, list.params]);

  // A filter's options can arrive after the list was asked for — the jobs'
  // departments are read from the openings themselves — and they change what
  // the URL means: `?department=Sales` was judged against no departments, the
  // list was asked for every opening, and it went on showing all of them under
  // a "Department: Sales" chip (QA-61). Judged again, the list is asked again
  // when the answer differs and the URL has not moved.
  const paramsKey = JSON.stringify(list.params);
  const viewKey = JSON.stringify(view);
  const judged = useRef({ paramsKey, viewKey });
  const { refetch: refetchList } = list;
  useEffect(() => {
    const before = judged.current;
    judged.current = { paramsKey, viewKey };
    if (before.paramsKey === paramsKey && before.viewKey !== viewKey) refetchList();
  }, [paramsKey, viewKey, refetchList]);

  // An optimistic toggle writes here first; a failed call takes it back out.
  // Keeping it beside the fetched rows means a switch answers instantly without
  // the whole table reloading behind it (§8.2).
  const [overrides, setOverrides] = useState({});
  const [busyIds, setBusyIds] = useState([]);
  // The switches whose own answer is still on its way, read when the rows are
  // replaced: a re-read that lands first must not put their old value back.
  const inFlight = useRef(new Set());

  useEffect(() => {
    setOverrides((current) => {
      const kept = Object.fromEntries(
        Object.entries(current).filter(([id]) => inFlight.current.has(id))
      );
      return Object.keys(kept).length === Object.keys(current).length ? current : kept;
    });
  }, [list.items]);

  const rows = useMemo(
    () =>
      list.items.map((item) =>
        overrides[String(item.id)] ? { ...item, ...overrides[String(item.id)] } : item
      ),
    [list.items, overrides]
  );

  /**
   * Flips one field of one record, showing the new value at once and putting
   * the old one back if the API disagrees.
   */
  const { refetch } = list;

  const patchField = useCallback(
    async (row, field, value) => {
      const id = String(row.id);
      setOverrides((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
      setBusyIds((current) => [...current, id]);
      inFlight.current.add(id);

      try {
        await service.patch(row.id, { [field]: value });
        onMutated?.(collectionKey);
        // The switch moved before the request went out; this is the receipt
        // that it landed, in the same words every other list uses (§8.2).
        const label = `“${labelOf(row, columns)}”`;
        toast.success(flagMessage?.(label, field, value) ?? TOASTS.flagged(label, field, value));
        // The list is read again: a FAQ switched off under "Status: Active"
        // stayed in that list, unticked, and the count above it did not move
        // (QA-59). The new value stays on screen until the answer lands.
        refetch();
      } catch (thrown) {
        setOverrides((current) => {
          const { [id]: _reverted, ...rest } = current;
          return rest;
        });
        if (thrown?.status === 404) {
          // Deleted elsewhere since the list was read: the row goes (QA-61).
          toast.error(TOASTS.gone(`“${labelOf(row, columns)}”`));
          refetch();
        } else {
          toast.error(firstFieldMessage(thrown, 'The change could not be saved.'));
        }
      } finally {
        inFlight.current.delete(id);
        setBusyIds((current) => current.filter((entry) => entry !== id));
      }
    },
    [service, toast, onMutated, collectionKey, columns, refetch, flagMessage]
  );

  return {
    ...list,
    view,
    rows,
    busyIds,
    patchField,
    setOverrides,
    defaults,
  };
}

/** "Website" → "website"; a label that capitalises inside ("LinkedIn", "URL") keeps it. */
const inSentence = (label) =>
  /[A-Z]/.test(label.slice(1)) ? label : `${label.charAt(0).toLowerCase()}${label.slice(1)}`;

/**
 * What a message calls a field whose key is not the word its label is — "The
 * socialLinks.linkedin must be a valid URL." reads "The LinkedIn address must
 * be a valid URL.", and `avatarUrl` is the "photograph" the form labels it
 * (QA-55).
 *
 * A key that is a word, but not the label's, is named by its label too: the
 * testimonial form said "The message field is required." under a box called
 * "Quote", "The whatsapp must be…" under "WhatsApp", and the job form "The
 * description field is required." under "About the role" (QA-61). A key that
 * reads as its label ("name" under "Name") is left alone.
 *
 * A field whose label does not read inside a sentence names itself for one
 * with `messageLabel`: "The interest rate from (% p.a.) field is required."
 * reads "The lowest interest rate field is required." (QA-60).
 *
 * @param {Array<{name?: string, label?: string, messageLabel?: string, type?: string}>} fields
 * @returns {Record<string, string>}
 */
export function labelsOf(fields) {
  const labelled = (field) => {
    if (field.messageLabel) return field.messageLabel;
    const label = inSentence(field.label);
    // A box for a link is named after where it points: "the LinkedIn
    // address", not "the LinkedIn".
    return field.type === 'url' ? `${label} address` : label;
  };

  return Object.fromEntries(
    (Array.isArray(fields) ? fields : [])
      .filter((field) => field?.name && typeof (field.messageLabel ?? field.label) === 'string')
      .map((field) => [field.name, labelled(field)])
      .filter(([name, label]) => /[.A-Z]/.test(name) || label !== name)
  );
}

/**
 * A complete master-data screen from one configuration object.
 *
 * Localities, cities, property types, amenities, badges, developers, banks,
 * FAQs, testimonials, team members, partners, users — they differ in columns,
 * fields and rules, not in behaviour, so they share one implementation and
 * prompts 14–17 write configurations rather than screens.
 *
 * @param {object} props
 * @param {object} props.config
 * @param {string} props.config.key
 * @param {string} props.config.title
 * @param {string} props.config.singular
 * @param {{list, get?, create, update?, patch, remove, bulk?, checkSlug?}} props.config.service
 * @param {Array<object>} props.config.columns `DataTable` columns; a column's
 *   `render(row, { patchField, busy, canEdit })` gets the list's own writer, so
 *   a cell can be a toggle (`showOnHome`) and not only a value
 * @param {Array<object>} [props.config.filters] `FilterBar` fields
 * @param {Array<object>|(record: object|null) => Array<object>} props.config.formFields
 * @param {Record<string, object>} [props.config.schema] a `src/services/schemas` descriptor
 * @param {Record<string, object>} [props.config.createSchema] when create differs from update
 * @param {'dialog'|'page'} [props.config.formMode]
 * @param {() => void} [props.config.onCreate] navigate instead of opening the form
 * @param {(row: object) => void} [props.config.onEdit] navigate instead of opening the form
 * @param {{field: string, order: 'asc'|'desc'}} [props.config.defaultSort]
 * @param {boolean} [props.config.orderable] drag to reorder while sorted by `order`
 * @param {boolean} [props.config.appendNew] a new record's Order box proposes
 *   the end of the collection instead of the form's default — master data,
 *   which the site lists in that order (QA-60). FAQs and the other content
 *   lists keep QA-59's rule: created at 0, a record is first
 * @param {(row: object) => React.ReactNode} [props.config.renderOrderItem] the reorder row
 * @param {boolean} [props.config.activeToggle]
 * @param {boolean} [props.config.featuredToggle]
 * @param {boolean} [props.config.rowActionsMenu] the table's row actions in a
 *   menu rather than a row of icons — a screen with four of them (the jobs:
 *   edit, applications, view, delete) left its first column a word wide (QA-61)
 * @param {Array<object>} [props.config.bulkActions]
 * @param {boolean} [props.config.usageGuard] render the 409 dialog (D88)
 * @param {{one?: string, many?: string}} [props.config.guardHint] the line under
 *   that dialog's list, for a single delete and a bulk one — where "remove the
 *   reference" is not the way out: an opening's applications are not unlinked,
 *   the opening is switched off instead (QA-61)
 * @param {boolean} [props.config.canEdit] false renders the screen read-only
 * @param {(row: object) => boolean} [props.config.canDelete] false leaves a
 *   row's delete action out — a built-in segment the API would refuse anyway
 * @param {(row: object) => boolean} [props.config.canToggleActive] false locks a
 *   row's Active switch — your own account on the Users screen, which the API
 *   refuses to switch off (QA-64)
 * @param {(row: object) => string} [props.config.deleteMessage] the delete
 *   confirmation's sentence when removing the record does more than remove it —
 *   a user's leads are unassigned (QA-64)
 * @param {(label: string, field: string, value: boolean) => string|undefined}
 *   [props.config.flagMessage] what a toggle's toast says instead of the house
 *   wording — an account "can no longer sign in", not "is no longer live" (QA-64)
 * @param {(collection: string) => void} [props.config.onMutated] after every
 *   successful write, with `config.key` — `MasterDataContext.refresh` for the
 *   collections the public site caches
 * @param {string} [props.config.subtitle] the line under the `<h1>`
 * @param {'compact'|'full'|false} [props.config.seoPanel] renders the SEO panel
 *   under the fields, bound to the record's `seo` branch (D87)
 * @param {string} [props.config.seoEntityType] which `SEO_ENTITY_TYPES` member
 *   the records are — required when `seoPanel` is set
 * @param {React.ReactNode} [props.config.formFooter] rendered below the fields
 * @param {(row: object) => {key: string, label: React.ReactNode}|null} [props.config.groupBy]
 *   heading rows inside the table, applied only while `groupSort` is the sort
 * @param {string} [props.config.groupSort] the sort `groupBy` belongs to
 * @param {string} [props.config.reorderHint] replaces the drag list's own line
 * @param {(values: object, row: object|null) => Promise<object|null>} [props.config.confirmSave]
 *   asked before a save; a returned `{message, usedBy, confirmLabel}` becomes a
 *   confirm over the records the change reaches (D88)
 * @param {(saved: object, row: object|null, helpers: {toast: object}) => Promise<void>|void}
 *   [props.config.afterSave] runs after a successful save, with the record the
 *   API answered and the one the form opened on — a property type whose URL
 *   moved redirects the old one
 * @param {(row: object) => Array<object>} [props.config.extraRowActions]
 * @param {(values: object, row: object|null) => object} [props.config.toPayload]
 * @param {(row: object) => object} [props.config.toFormValues]
 */
export default function MasterDataPage({ config }) {
  const {
    key: collectionKey,
    title,
    subtitle,
    singular,
    plural = String(config.title ?? '').toLowerCase(),
    service,
    columns = [],
    filters = [],
    formFields: formFieldsProp = [],
    formFooter,
    seoPanel = false,
    seoEntityType,
    schema,
    createSchema,
    formMode = 'dialog',
    onCreate,
    onEdit,
    onMutated,
    confirmSave,
    afterSave,
    defaultSort,
    groupBy,
    groupSort,
    orderable = false,
    appendNew = false,
    reorderHint,
    renderOrderItem,
    activeToggle = true,
    featuredToggle = false,
    rowActionsMenu = false,
    bulkActions = [],
    usageGuard = true,
    guardHint,
    canEdit = true,
    canDelete,
    canToggleActive,
    deleteMessage,
    emptyState,
    newValues = {},
    extraRowActions,
    toPayload,
    toFormValues,
    validate: customValidate,
  } = config;

  const toast = useToast();
  const { isMobile } = useBreakpoint();
  const crud = useMasterDataCrud(config);
  const {
    rows,
    meta,
    loading,
    error,
    refetch,
    view: params,
    busyIds,
    patchField,
    setFilters,
    setPage,
    setParams,
    resetFilters,
  } = crud;

  const [editing, setEditing] = useState(null); // `{}` for a new record
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [guard, setGuard] = useState(null);
  const [saveWarning, setSaveWarning] = useState(null);
  const [checkingSave, setCheckingSave] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Where a new record of a screen that `appendNew`s goes when its Order box
  // is left alone: after the last one (QA-60). The box used to read 0, which
  // the API reads as "first", so a new amenity headed every listing's amenity
  // block and a new segment became the property form's first choice.
  const [newPosition, setNewPosition] = useState(null);
  // Asks for the first field in error to be brought into view, once the
  // messages of a refused save have been drawn (QA-60).
  const [refusals, setRefusals] = useState(0);
  const formRef = useRef(null);
  // Set when a save finds the record deleted elsewhere (QA-61): there is
  // nothing left to save it into, so the dialog closes and the list is read.
  const goneRef = useRef(false);

  // What each dialog draws: its state, or what it showed while it fades out.
  // Whether it acts is still asked of the state — a closing dialog is inert.
  const [shown, releaseEditing] = useLingering(editing);
  const [shownDeleting, releaseDeleting] = useLingering(deleting);
  const [shownGuard, releaseGuard] = useLingering(guard);
  const [shownWarning, releaseWarning] = useLingering(saveWarning);

  const isNew = Boolean(editing) && !editing.id;
  const activeSchema = isNew ? (createSchema ?? schema) : schema;

  // A screen whose fields depend on the record — the users form disables an
  // admin's own role select — passes a function instead of a list.
  const formFields = useMemo(
    () => (typeof formFieldsProp === 'function' ? formFieldsProp(shown) : formFieldsProp),
    [formFieldsProp, shown]
  );

  const hasOrderField = useMemo(
    () => formFields.some((field) => field.name === 'order'),
    [formFields]
  );

  const initialValues = useMemo(() => {
    if (!editing) return {};
    const base = editing.id
      ? toFormValues
        ? toFormValues(editing)
        : pickFields(editing, formFields)
      : {
          ...defaultsFromFields(formFields),
          ...newValues,
          ...(hasOrderField && newPosition !== null ? { order: newPosition } : {}),
        };

    // The panel reads fifty fields of §9.6 and must never meet `undefined`; a
    // screen without a panel keeps the values it always had.
    return seoPanel ? { ...base, seo: withSeoDefaults(editing.seo) } : base;
  }, [editing, formFields, newValues, toFormValues, seoPanel, hasOrderField, newPosition]);

  /** The body the API receives, with the `seo` branch when the panel is on. */
  const normalize = useCallback(
    (values) => {
      // The text boxes are sent without the spaces a paste leaves around them,
      // as the API stores them (QA-60), so " A " is checked as the one letter
      // it is before it is sent; a phone number as the ten digits every other
      // number is stored as, however it was typed (QA-61).
      const tidy = tidyPhones(trimText(values, formFields), formFields);
      const payload = toPayload ? toPayload(tidy, editing) : tidy;
      if (!seoPanel) return payload;
      // D34: one URL — `seo.slug` always mirrors the record's own.
      return { ...payload, seo: toSeoPayload(tidy.seo, payload.slug ?? tidy.slug ?? '') };
    },
    [toPayload, editing, seoPanel, formFields]
  );

  /**
   * The screen's own rules, plus the panel's blockers when it is on.
   *
   * A number box's own bounds come first: the bank form declared 5–20 % a
   * year and 50–95 % of the value, and took 25 % and 99 %, because a form
   * that validates itself (`noValidate`) never asks the browser (QA-60). A
   * screen's own rule for the same field still has the last word.
   */
  const validate = useCallback(
    (values) => ({
      ...rangeErrors(values, formFields),
      ...(customValidate ? (customValidate(values, editing) ?? {}) : {}),
      ...(seoPanel ? validateSeoBranch(values.seo) : {}),
    }),
    [customValidate, editing, seoPanel, formFields]
  );

  const labels = useMemo(() => labelsOf(formFields), [formFields]);

  const form = useForm({
    initialValues,
    schema: activeSchema,
    validate,
    normalize,
    labels,
    onSubmit: async (payload) => {
      try {
        if (editing?.id) return await service.update(editing.id, payload);
        return await service.create(payload);
      } catch (thrown) {
        // "Not found" named nothing, and the dialog stayed open over a record
        // that no longer existed, with no way forward (QA-61).
        if (editing?.id && thrown?.status === 404) {
          goneRef.current = true;
          throw new ApiError({
            status: 404,
            message: TOASTS.gone(`This ${singular}`),
            original: thrown,
          });
        }
        throw await withSlugSuggestion(thrown, payload.slug, {
          checkSlug: service.checkSlug,
          excludeId: editing?.id ?? null,
        });
      }
    },
  });

  // A refused save draws its messages first; then the first one is brought
  // into view, with the cursor in its field.
  useEffect(() => {
    if (refusals === 0) return;
    focusFirstError(formRef.current);
  }, [refusals]);

  // A new `editing` record is a new form: `useForm` holds its own state, so the
  // values are handed over when the dialog changes what it is editing — and
  // only then. Reading them from a ref is what keeps a caller that rebuilds its
  // `config` object on every render from wiping a half-typed form.
  const editingKey = editing ? (editing.id ?? 'new') : null;
  const initialRef = useRef(initialValues);
  initialRef.current = initialValues;
  const { reset } = form;
  useEffect(() => {
    if (editingKey === null) return;
    reset(initialRef.current);
  }, [editingKey, reset]);

  useUnsavedChanges(Boolean(editing) && form.dirty);

  const closeForm = () => {
    setConfirmDiscard(false);
    setSaveWarning(null);
    setEditing(null);
  };

  /** Escape, the backdrop and "Cancel" all ask first when there is work to lose. */
  const requestClose = () => {
    // A dialog that is fading out is already closed.
    if (!editing || form.submitting) return;
    if (form.dirty) {
      setConfirmDiscard(true);
      return;
    }
    closeForm();
  };

  /**
   * Validates, writes, and tells the rest of the app what changed.
   *
   * @returns {Promise<boolean>} whether the record was saved
   */
  const persist = async () => {
    // A closing dialog keeps its buttons where they were, under a pointer that
    // may click again — and with `editing` gone, a submit would create a copy
    // of the record just saved.
    if (!editing) return false;
    // "Save changes" on a record nobody changed wrote it anyway and said
    // "saved" (QA-59); the API wrote nothing, the list re-read itself for
    // nothing. It says so instead, and the dialog closes as a save would.
    if (editing.id && !form.dirty) {
      toast.info(FORMS.noChanges);
      closeForm();
      return true;
    }
    const answer = await form.submit();
    if (!answer) {
      if (goneRef.current) {
        goneRef.current = false;
        closeForm();
        onMutated?.(collectionKey);
        refetch();
        return false;
      }
      setRefusals((count) => count + 1);
      return false;
    }
    // The service answers the envelope; the record is its `data`. Handed the
    // envelope, the SEO side effect found no slug on it and never wrote the
    // redirect a property type's panel asked for (QA-60).
    const saved = answer?.data ?? answer;
    // The redirect this record's `seo` asks for, against the slug the API
    // answered with — a new record has none until now (§9.6).
    if (seoPanel && seoEntityType) await applySeoSideEffects(seoEntityType, saved);
    if (afterSave) {
      try {
        await afterSave(saved, editing, { toast });
      } catch (thrown) {
        // A side effect never turns a save that happened into a failure.
        console.warn('A step after the save did not complete.', thrown);
      }
    }
    toast.success(
      editing?.id ? TOASTS.saved(capitalise(singular)) : TOASTS.created(capitalise(singular))
    );
    closeForm();
    onMutated?.(collectionKey);
    refetch();
    return true;
  };

  /**
   * "Save", with the one question a form cannot answer on its own.
   *
   * `confirmSave` looks the change up against what already points at the
   * record — moving a property type to another segment is allowed, but twelve
   * listings keep the type and not the move — and the answer is a dialog, not
   * a refusal.
   */
  const save = async () => {
    if (!editing) return;
    if (!confirmSave) {
      await persist();
      return;
    }

    if (!form.validateAll()) {
      setRefusals((count) => count + 1);
      return;
    }

    setCheckingSave(true);
    try {
      const warning = await confirmSave(form.values, editing);
      if (warning) {
        setSaveWarning(warning);
        return;
      }
    } catch (_thrown) {
      // The check is advisory: a lookup that fails must not block the save.
    } finally {
      setCheckingSave(false);
    }

    await persist();
  };

  /**
   * After a delete: the previous page when this one has just been emptied,
   * rather than an empty table saying "No FAQs yet" over a list that still has
   * FAQs on the page before it (QA-56's rule for pages, QA-59).
   *
   * @param {number} removed how many of the rows on screen went
   */
  const afterRemoval = (removed) => {
    const page = Number(params.page) || 1;
    if (page > 1 && removed >= rows.length) setPage(page - 1);
    else refetch();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await service.remove(deleting.id);
      toast.success(TOASTS.deleted(`“${labelOf(deleting, columns)}”`));
      setDeleting(null);
      setSelectedIds((current) => current.filter((id) => String(id) !== String(deleting.id)));
      onMutated?.(collectionKey);
      afterRemoval(1);
    } catch (thrown) {
      // Deleted elsewhere since the list was read: what was asked for has
      // happened. It said "Not found" and left the row on screen, to be
      // deleted again with the same answer (QA-61).
      if (thrown?.status === 404) {
        toast.info(TOASTS.alreadyDeleted(`“${labelOf(deleting, columns)}”`));
        setDeleting(null);
        setSelectedIds((current) => current.filter((id) => String(id) !== String(deleting.id)));
        onMutated?.(collectionKey);
        afterRemoval(1);
        return;
      }
      // 409 is not a failure to report as one: it is a list of what to unlink
      // first, and the dialog is where that list belongs (D88).
      if (usageGuard && thrown?.status === 409) {
        const usedBy = thrown.data?.usedBy ?? [];
        const label = labelOf(deleting, columns);
        setDeleting(null);
        setGuard({
          title: label,
          // "This item is in use." named nothing; the dialog names the record.
          // A refusal with no usages is a protected record, and the API's
          // sentence is the reason (a built-in segment).
          message: usedBy.length > 0 ? `“${label}” is still used by:` : thrown.message,
          usedBy,
          hint: guardHint?.one,
        });
      } else {
        toast.error(firstFieldMessage(thrown, 'The record could not be deleted.'));
        // A refusal (403, 422 — "you cannot delete your own account") will not
        // become an acceptance on a second press, so the confirm gets out of
        // the way; a dropped connection or a 500 might, so it stays for a retry.
        if (thrown?.status >= 400 && thrown?.status < 500) setDeleting(null);
      }
    } finally {
      setDeletingBusy(false);
    }
  };

  const runBulk = async (action, ids) => {
    if (!service.bulk) return;
    setBulkBusy(true);
    try {
      const { data, message } = await service.bulk({ ids, action });
      // "0 FAQs updated." over a selection that was already inactive read like
      // a failure (QA-59): the API changed nothing because nothing needed it.
      if (action !== 'delete' && data?.affected === 0) {
        toast.info(
          ALREADY[action]
            ? `Nothing to change: the selected ${plural} were already ${ALREADY[action]}.`
            : 'Nothing to change.'
        );
      } else {
        toast.success(message || TOASTS.updatedCount(ids.length, 'record'));
      }
      setSelectedIds([]);
      onMutated?.(collectionKey);
      if (action === 'delete') afterRemoval(ids.length);
      else refetch();
    } catch (thrown) {
      // A bulk delete refused over what still points at the selection is the
      // single delete's 409, several times over: it belongs in the same dialog,
      // naming each record and what holds it. It was a toast reading "Used by
      // 1 page" over three selected FAQs (QA-59). The selection stays, so the
      // ones in the way can be unticked and the rest deleted.
      if (usageGuard && action === 'delete' && thrown?.status === 409) {
        const refused = Array.isArray(thrown.data?.refused) ? thrown.data.refused : [];
        setGuard({
          title: `${ids.length} ${ids.length === 1 ? singular : plural}`,
          message: thrown.message,
          usedBy: thrown.data?.usedBy ?? [],
          refused,
          hint:
            guardHint?.many ?? 'Untick these to delete the rest, or remove each reference first.',
        });
      } else {
        toast.error(firstFieldMessage(thrown, 'The bulk action could not be applied.'));
      }
    } finally {
      setBulkBusy(false);
    }
  };

  /**
   * Opening the form.
   *
   * A screen whose add and edit screens are real URLs — localities, and the
   * modules that follow it — passes `onCreate` / `onEdit` and navigates; every
   * other screen edits in place, in the dialog or on the same route.
   */
  const startCreate = useCallback(async () => {
    if (onCreate) {
      onCreate();
      return;
    }
    // The end of the collection, not of the page or the filter on screen: an
    // unfiltered list's total is the collection's, a filtered one asks.
    let position = null;
    if (hasOrderField && appendNew) {
      const filtered = filters.some((filter) => isFilterSet(params, filter));
      if (!filtered && Number.isFinite(meta?.total)) {
        position = meta.total + 1;
      } else {
        try {
          const envelope = await service.list({ perPage: 1 });
          if (Number.isFinite(envelope?.meta?.total)) position = envelope.meta.total + 1;
        } catch {
          // The form's own default stands.
        }
      }
    }
    setNewPosition(position);
    setEditing({});
  }, [onCreate, hasOrderField, appendNew, filters, params, meta, service]);
  const startEdit = useCallback((row) => (onEdit ? onEdit(row) : setEditing(row)), [onEdit]);

  /* ---------------- reordering ---------------- */

  // The order the editor left the rows in, while the moves that made it are
  // being saved — keyed to the view it was made in, so a filter changed
  // meanwhile shows its own rows and not these.
  const viewKey = JSON.stringify(params);
  const [pendingOrder, setPendingOrder] = useState(null);
  const moveQueue = useRef(Promise.resolve());
  const movesLeft = useRef(0);
  const queueGeneration = useRef(0);

  const orderedRows = pendingOrder && pendingOrder.key === viewKey ? pendingOrder.rows : rows;

  // A move not yet written goes with the tab: closing or reloading it while
  // one is on its way asks first. Leaving for another screen loses nothing —
  // the moves already made are written after the screen has gone.
  const movesPending = pendingOrder !== null;
  useEffect(() => {
    if (!movesPending) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [movesPending]);

  /**
   * Writes one new position.
   *
   * A move is a single `PATCH { order }` on the row that travelled, placing it
   * where the row it landed on sits: `neighbour.order` to come before it,
   * `neighbour.order + 1` to come after. The API settles the rest of the
   * collection back to `1..n` (§5.8, D98).
   *
   * Saying "where that one is" rather than "these are the new numbers" is what
   * makes a drag correct while the table is filtered and on page two alike: the
   * rows on screen are a slice of the collection, and the records this editor
   * cannot see keep their relative positions (NEW-23).
   *
   * Since QA-59 the move also names that row — `before` or `after` its id —
   * and three things follow from it:
   *
   * - **The row moves at once.** The list shows the new order before the API
   *   answers. It used to snap back and jump a moment later, and the focus
   *   that followed a keyboard move landed on the neighbour still sitting in
   *   the row's old place — so a second Alt+↓ moved the neighbour back up.
   * - **Moves are written one at a time, in the order they were made.** A
   *   second move sent before the list had re-read carried the numbers of the
   *   first; three quick Alt+↓ moved three different FAQs.
   * - **A tie is no longer ambiguous.** "Before the one holding 0" was before
   *   every record holding 0; "before that one" is exactly one place.
   *
   * A move that fails drops the ones queued behind it — they were made on top
   * of a list that no longer holds — and the list is read again.
   */
  const reorder = (next, move) => {
    const shownRows = orderedRows;
    const row = move?.item;
    const neighbour = move ? shownRows[move.to] : null;
    if (!row || !neighbour) return;

    const up = move.to < move.from;
    const anchor = Number(neighbour.order);
    const offset = ((meta?.page ?? 1) - 1) * (meta?.perPage ?? DEFAULT_PER_PAGE);
    const order = Number.isFinite(anchor) ? (up ? anchor : anchor + 1) : offset + move.to + 1;
    const body = { order, [up ? 'before' : 'after']: neighbour.id };

    setPendingOrder({ key: viewKey, rows: next });

    const generation = queueGeneration.current;
    movesLeft.current += 1;

    moveQueue.current = moveQueue.current
      .then(async () => {
        if (generation !== queueGeneration.current) return;
        try {
          await service.patch(row.id, body);
        } catch (thrown) {
          queueGeneration.current += 1;
          toast.error(
            thrown?.status === 404
              ? TOASTS.gone(`“${labelOf(row, columns)}”`)
              : firstFieldMessage(thrown, 'The new order could not be saved.')
          );
        }
      })
      .then(async () => {
        movesLeft.current -= 1;
        if (movesLeft.current > 0) return;
        onMutated?.(collectionKey);
        await refetch();
        // A move made while the list was being read keeps its own order.
        if (movesLeft.current === 0) setPendingOrder(null);
      });
  };

  /* ---------------- table columns ---------------- */

  const tableColumns = useMemo(() => {
    const extra = [];

    if (featuredToggle) {
      extra.push({
        key: 'isFeatured',
        label: 'Featured',
        width: '96px',
        mobile: true,
        align: 'center',
        hideBelow: 'md',
        render: (row) => (
          <IconButton
            label={
              row.isFeatured
                ? `Remove ${labelOf(row, columns)} from featured`
                : `Feature ${labelOf(row, columns)}`
            }
            size="sm"
            disabled={!canEdit || busyIds.includes(String(row.id))}
            onClick={() => patchField(row, 'isFeatured', !row.isFeatured)}
          >
            <Icon
              icon={row.isFeatured ? 'mdi:star' : 'mdi:star-outline'}
              width="20"
              height="20"
              className={row.isFeatured ? styles.starOn : styles.starOff}
            />
          </IconButton>
        ),
      });
    }

    if (activeToggle) {
      extra.push({
        key: 'isActive',
        label: 'Active',
        width: '92px',
        mobile: true,
        render: (row) => (
          <Switch
            size="small"
            disableRipple
            checked={row.isActive !== false}
            disabled={
              !canEdit ||
              busyIds.includes(String(row.id)) ||
              (canToggleActive ? !canToggleActive(row) : false)
            }
            onClick={(event) => event.stopPropagation()}
            onChange={() => patchField(row, 'isActive', row.isActive === false)}
            // `slotProps.input` replaces MUI's own defaults for that slot, and
            // `role: 'switch'` is one of them — a toggle that reports itself as a
            // checkbox is a worse answer than the one MUI ships.
            slotProps={{
              input: { role: 'switch', 'aria-label': `${labelOf(row, columns)} is active` },
            }}
          />
        ),
      });
    }

    // A configured column may need to write, not only to read: the "Home"
    // switch of the FAQ table is a `PATCH { showOnHome }`, the same optimistic
    // round trip the `Active` column above makes. The list state it needs
    // lives here, so it is handed to `render` rather than looked up by the
    // configuration, which has no way to reach it.
    const declared = columns.map((column) =>
      column.render
        ? {
            ...column,
            render: (row) =>
              column.render(row, {
                patchField,
                busy: busyIds.includes(String(row.id)),
                canEdit,
              }),
          }
        : column
    );

    return [...declared, ...extra];
  }, [columns, activeToggle, featuredToggle, canEdit, canToggleActive, busyIds, patchField]);

  const rowActions = useCallback(
    (row) => [
      ...(canEdit
        ? [
            {
              key: 'edit',
              label: `Edit ${labelOf(row, columns)}`,
              icon: 'mdi:pencil-outline',
              onClick: () => startEdit(row),
            },
          ]
        : []),
      ...(extraRowActions?.(row) ?? []),
      ...(canEdit && (canDelete ? canDelete(row) : true)
        ? [
            {
              key: 'delete',
              label: `Delete ${labelOf(row, columns)}`,
              icon: 'mdi:delete-outline',
              danger: true,
              onClick: () => setDeleting(row),
            },
          ]
        : []),
    ],
    [canEdit, canDelete, columns, extraRowActions, startEdit]
  );

  // What a row's checkbox is called: "Select How much home loan am I eligible
  // for?", not "Select row 9" (QA-59).
  const rowLabel = useCallback((row) => String(labelOf(row, columns)), [columns]);

  // Reordering replaces the table only while the list is in the order it is
  // reordering: dragging a row of a list sorted by name would be writing
  // positions nobody can see. Upside down (`?order=desc`) is not that order
  // either — "up" there is down in the collection, and every move wrote its
  // opposite (QA-59) — so it stays a table, sorted as asked.
  const reordering =
    orderable &&
    params.sort === 'order' &&
    params.order !== 'desc' &&
    !loading &&
    !error &&
    rows.length > 0;

  // What "Table view" sorts by: the first order the columns offer that is not
  // the one the drag list is already showing.
  const tableSort = useMemo(() => {
    // The screen's own table when it has one besides the drag list: the
    // amenities' is grouped by category, and "Table view" opened a list sorted
    // by name, with the groups gone (QA-60).
    if (defaultSort?.field && defaultSort.field !== 'order') {
      return { sort: defaultSort.field, order: defaultSort.order === 'desc' ? 'desc' : 'asc' };
    }
    const column = columns.find((entry) => entry.sortable && entry.key !== 'order');
    return column ? { sort: column.key, order: 'asc' } : null;
  }, [columns, defaultSort?.field, defaultSort?.order]);

  // The way into the drag list from the table: on a phone the table is cards,
  // with no "Order" header to press, and after "Table view" there was no way
  // back but the address bar (QA-59).
  const reorderButton =
    orderable && canEdit && !reordering ? (
      <Button
        variant="outline"
        size="sm"
        icon={<Icon icon="mdi:swap-vertical" width="18" height="18" />}
        onClick={() => setParams({ sort: 'order', order: 'asc' })}
      >
        {TABLES.reorder}
      </Button>
    ) : null;

  // The group headings belong to one sort — the rows have to arrive grouped for
  // "a new key" to mean "a new group" (§6 of prompt 15).
  const grouping = groupBy && (!groupSort || params.sort === groupSort) ? groupBy : undefined;

  const saving = form.submitting || checkingSave;

  /**
   * Ctrl/Cmd+S saves the form (QA-59), as it saves every full-page form since
   * QA-55: it opened the browser's "Save page as" over the dialog. Once per
   * press — a held key repeats — and not while a save is already running or a
   * confirm is up over the form, nor from a dialog of the form's own (a link
   * being added to the answer).
   *
   * A window listener, like the article form's: it hears the key after React
   * has rendered what the key did, so an answer the editor hands over on the
   * same keystroke is part of the save.
   */
  const saveRef = useRef(save);
  saveRef.current = save;
  const shortcutBlocked = useRef(false);
  shortcutBlocked.current = saving || confirmDiscard || Boolean(saveWarning);
  const formOpen = Boolean(editing);

  useEffect(() => {
    if (!formOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 's' && event.key !== 'S') return;
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.altKey || event.shiftKey) return;
      const dialog = event.target?.closest?.('[role="dialog"]');
      if (dialog && !dialog.querySelector('[data-master-data-form]')) return;
      event.preventDefault();
      if (event.repeat || shortcutBlocked.current) return;
      saveRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formOpen]);

  const activeFilterCount = filters.reduce(
    (count, filter) => count + (isFilterSet(params, filter) ? 1 : 0),
    0
  );

  const formBody = (
    // The mark Ctrl/Cmd+S looks for: a key pressed in a dialog that does not
    // hold it is that dialog's own (QA-59).
    <div data-master-data-form ref={formRef}>
      <MasterDataForm
        fields={formFields}
        form={form}
        disabled={form.submitting}
        checkSlug={service.checkSlug}
        excludeId={shown?.id}
        slugBase={config.slugBase}
        seoPanel={seoPanel}
        seoEntityType={seoEntityType}
        seoRecord={shown}
      >
        {typeof formFooter === 'function' ? formFooter(shown) : formFooter}
      </MasterDataForm>
    </div>
  );

  /**
   * The "this reaches further than the form shows" confirm: the same usage list
   * a 409 renders, asked before the write instead of after it.
   */
  const saveGuard = (
    <DeleteGuardDialog
      open={Boolean(saveWarning)}
      heading={shownWarning?.heading ?? 'Check before saving'}
      title={shownWarning?.title}
      message={shownWarning?.message}
      usedBy={shownWarning?.usedBy ?? []}
      hint={shownWarning?.hint ?? ''}
      confirmLabel={shownWarning?.confirmLabel ?? FORMS.saveAnyway}
      loading={form.submitting}
      onClose={() => setSaveWarning(null)}
      onConfirm={async () => {
        // Cancelled, the warning fades out over a form that is still open: a
        // click that lands on its button then would save what was declined.
        if (!saveWarning) return;
        // The dialog stays up while the write is in flight and closes with the
        // form on success; a refusal lands on the field behind it, so it gets
        // out of the way instead.
        if (!(await persist())) setSaveWarning(null);
      }}
      onExited={releaseWarning}
    />
  );

  /* ---------------- the page ---------------- */

  if (formMode === 'page' && editing) {
    return (
      <>
        <PageHeader
          title={editing.id ? `Edit ${singular}` : `New ${singular}`}
          actions={
            <>
              <Button variant="ghost" onClick={requestClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} loading={saving}>
                Save
              </Button>
            </>
          }
        />
        {formBody}
        {saveGuard}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        count={meta?.total}
        actions={
          canEdit ? (
            <Button icon={<Icon icon="mdi:plus" width="18" height="18" />} onClick={startCreate}>
              Add {singular}
            </Button>
          ) : null
        }
      />

      {filters.length > 0 ? (
        <div className={styles.filters}>
          <FilterBar
            fields={filters}
            values={params}
            activeCount={activeFilterCount}
            onChange={setFilters}
            onReset={resetFilters}
          >
            {reorderButton}
          </FilterBar>
        </div>
      ) : reorderButton ? (
        <div className={styles.viewBar}>{reorderButton}</div>
      ) : null}

      {reordering ? (
        <div className={styles.reorder}>
          <div className={styles.reorderHead}>
            <p className={styles.reorderHint}>
              {keysTogether(
                reorderHint ??
                  'Drag a row by its handle, or use its arrows, to change the order they appear in. With the keyboard: focus a row and press Alt + ↑ / ↓.'
              )}
            </p>
            {/* The drag list replaces the table, headers and all, so it owes
                the editor the way back that a column header would have been. */}
            {tableSort ? (
              <Button
                variant="outline"
                size="sm"
                className={styles.viewButton}
                icon={<Icon icon="mdi:table" width="18" height="18" />}
                onClick={() => setParams(tableSort)}
              >
                {TABLES.tableView}
              </Button>
            ) : null}
          </div>
          <SortableList
            items={orderedRows}
            disabled={!canEdit}
            label={`${title}, in order`}
            getLabel={(row) => labelOf(row, columns)}
            onReorder={reorder}
            renderItem={(row) => (
              // The screen this list is the first view of used to offer no way
              // to edit or delete a record from it (QA-59): the row carries the
              // table's own actions, and says when it is not live.
              <span className={styles.reorderItem}>
                <span className={styles.reorderRow}>
                  {renderOrderItem ? renderOrderItem(row) : labelOf(row, columns)}
                </span>
                {activeToggle && row.isActive === false ? (
                  <Chip tone="neutral" className={styles.reorderChip}>
                    {TABLES.inactive}
                  </Chip>
                ) : null}
                <span className={styles.reorderActions}>
                  <RowActions
                    actions={rowActions(row)}
                    compact={isMobile}
                    menuLabel={`Actions for ${labelOf(row, columns)}`}
                  />
                </span>
              </span>
            )}
          />
          <TableFooter
            meta={meta}
            rowCount={orderedRows.length}
            onPageChange={setPage}
            onPerPageChange={(perPage) => setParams({ perPage })}
          />
        </div>
      ) : (
        <DataTable
          columns={tableColumns}
          rows={rows}
          meta={meta}
          loading={loading}
          error={error}
          onRetry={refetch}
          sort={{ field: params.sort, order: params.order }}
          onSortChange={({ field, order }) => setParams({ sort: field, order })}
          onPageChange={setPage}
          onPerPageChange={(perPage) => setParams({ perPage })}
          selectable={canEdit && bulkActions.length > 0}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkActions={bulkActions}
          bulkNounOne={singular}
          bulkNounMany={plural}
          bulkBusy={bulkBusy}
          onBulkAction={runBulk}
          rowActions={rowActions}
          rowActionsMenu={rowActionsMenu}
          rowActionsLabel={(row) => `Actions for ${labelOf(row, columns)}`}
          rowLabel={rowLabel}
          groupBy={grouping}
          caption={title}
          emptyState={
            (Number(params.page) || 1) > 1 && (meta?.total ?? 0) > 0
              ? {
                  // `?page=9` of a one-page list, or the last page emptied
                  // under someone else's delete: there are records, just not
                  // here — "No FAQs yet · Add your first FAQ" said otherwise
                  // (QA-56's rule for pages, QA-59).
                  title: TABLES.emptyPage,
                  text: TABLES.emptyPageText,
                  action: (
                    <Button variant="outline" onClick={() => setPage(1)}>
                      {TABLES.firstPage}
                    </Button>
                  ),
                }
              : {
                  // A filtered list is not an empty collection: "No localities
                  // yet" over "No records match the current filters" told an
                  // operator two contradictory things at once (prompt 43 §4.1).
                  title:
                    activeFilterCount > 0
                      ? `No ${plural} match`
                      : (emptyState?.title ?? `No ${plural} yet`),
                  text:
                    activeFilterCount > 0
                      ? TABLES.emptyFiltered
                      : (emptyState?.text ?? `Add the first ${singular} to get started.`),
                  // §8.2: "Add your first …", and only for somebody who may
                  // (`canEdit` is §7's `can(area, 'create')`, resolved by the screen).
                  action:
                    activeFilterCount > 0 ? (
                      <Button variant="outline" onClick={resetFilters}>
                        {TABLES.resetFilters}
                      </Button>
                    ) : canEdit ? (
                      <Button onClick={startCreate}>Add your first {singular}</Button>
                    ) : null,
                }
          }
        />
      )}

      {formMode === 'dialog' ? (
        <Modal
          open={Boolean(editing)}
          onClose={requestClose}
          mobile="fullscreen"
          size="md"
          title={shown?.id ? `Edit ${singular}` : `New ${singular}`}
          footer={
            <>
              <Button variant="ghost" onClick={requestClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} loading={saving}>
                {shown?.id ? 'Save changes' : `Create ${singular}`}
              </Button>
            </>
          }
          slotProps={{ transition: { onExited: releaseEditing } }}
        >
          {shown ? formBody : null}
        </Modal>
      ) : null}

      {/* `confirmDelete` does nothing once `deleting` is gone, so a second
          "Delete" while this fades out deletes nothing. */}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={DIALOGS.deleteTitle(singular)}
        message={
          shownDeleting
            ? (deleteMessage?.(shownDeleting) ??
              DIALOGS.deleteMessage(labelOf(shownDeleting, columns)))
            : ''
        }
        confirmLabel={DIALOGS.deleteConfirm}
        danger
        loading={deletingBusy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        onExited={releaseDeleting}
      />

      <ConfirmDialog
        open={confirmDiscard}
        title={DIALOGS.discardTitle}
        message={DISCARD_MESSAGE}
        confirmLabel={DIALOGS.discardConfirm}
        cancelLabel={DIALOGS.discardCancel}
        danger
        onClose={() => setConfirmDiscard(false)}
        // "Keep editing" fades this out over a form still open, with "Discard"
        // beside the pointer: a click on it then must not throw the edits away.
        onConfirm={() => {
          if (confirmDiscard) closeForm();
        }}
      />

      <DeleteGuardDialog
        open={Boolean(guard)}
        title={shownGuard?.title}
        message={shownGuard?.message}
        usedBy={shownGuard?.usedBy ?? []}
        refused={shownGuard?.refused ?? []}
        hint={shownGuard?.hint}
        onClose={() => setGuard(null)}
        onExited={releaseGuard}
      />

      {saveGuard}
    </>
  );
}

/** What a bulk action's records already were when it changed none of them. */
const ALREADY = {
  activate: 'active',
  deactivate: 'inactive',
  feature: 'featured',
  unfeature: 'not featured',
};

/**
 * A key combination kept on one line: the hint broke after "Alt + ↑" and put
 * "/ ↓." on a line of its own (QA-61).
 *
 * @param {string} text
 * @returns {string}
 */
export const keysTogether = (text) =>
  String(text).replace(/Alt \+ ↑ \/ ↓/g, 'Alt\u00a0+\u00a0↑\u00a0/\u00a0↓');

/** What `Escape` on a dirty dialog asks before throwing the edits away. */
const DISCARD_MESSAGE = 'The changes you made to this record have not been saved.';

const capitalise = (value) => String(value).charAt(0).toUpperCase() + String(value).slice(1);

/** The human name of a record: its primary column, then the usual suspects. */
function labelOf(row, columns) {
  const primary = columns.find((column) => column.primary);
  const value = primary ? row[primary.key] : undefined;
  return value ?? row?.name ?? row?.title ?? row?.question ?? row?.email ?? `#${row?.id}`;
}

/**
 * What "empty" is for each kind of control. The distinction that matters is
 * `''` versus `null`: a URL box holds `''` while it is untouched, but an
 * untouched optional URL is not an empty URL — it is no URL (§5.5).
 */
const EMPTY_BY_TYPE = {
  switch: () => true,
  multiselect: () => [],
  tags: () => [],
  number: () => null,
  image: () => null,
  url: () => null,
  phone: () => null,
  date: () => null,
};

/** A blank record: every field at the value its control reads as empty. */
function defaultsFromFields(fields) {
  const values = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(field, 'defaultValue')) {
      values[field.name] = field.defaultValue;
      continue;
    }
    if (EMPTY_BY_TYPE[field.type]) {
      values[field.name] = EMPTY_BY_TYPE[field.type]();
      continue;
    }
    values[field.name] = field.type === 'entity' ? (field.multiple === false ? null : []) : '';
  }
  return values;
}

/** The record, reduced to the fields the form actually edits. */
function pickFields(record, fields) {
  const values = {};
  for (const field of fields) {
    values[field.name] = record[field.name];
  }
  return values;
}

/** The controls whose value is text a person typed, and so is sent trimmed. */
const TEXT_TYPES = new Set(['text', 'textarea', undefined]);

/**
 * The form's values with every text box trimmed (QA-60) — what the API
 * stores, Laravel's `TrimStrings`, so the form checks what will be kept.
 *
 * @param {object} values
 * @param {Array<{name: string, type?: string}>} fields
 * @returns {object} a copy, or `values` itself when nothing needed trimming
 */
export function trimText(values, fields) {
  let copy = null;
  for (const field of Array.isArray(fields) ? fields : []) {
    if (!TEXT_TYPES.has(field.type) || String(field.name).includes('.')) continue;
    const value = values?.[field.name];
    if (typeof value !== 'string' || value === value.trim()) continue;
    copy = copy ?? { ...values };
    copy[field.name] = value.trim();
  }
  return copy ?? values;
}

/**
 * The form's values with every phone box as {@link tidyPhone} writes it.
 *
 * @param {object} values
 * @param {Array<{name: string, type?: string}>} fields
 * @returns {object} a copy, or `values` itself when nothing changed
 */
export function tidyPhones(values, fields) {
  let copy = null;
  for (const field of Array.isArray(fields) ? fields : []) {
    if (field.type !== 'phone' || String(field.name).includes('.')) continue;
    const value = values?.[field.name];
    const tidy = tidyPhone(value);
    if (tidy === value) continue;
    copy = copy ?? { ...values };
    copy[field.name] = tidy;
  }
  return copy ?? values;
}

/** "5" or "0.05", without the float noise of a step. */
const plain = (number) => String(Number(number.toFixed(4)));

/**
 * A number box's own bounds, as messages (QA-60): the bank form's "5–20 % a
 * year" was an attribute nobody read. An empty box is the schema's business.
 *
 * @param {object} values
 * @param {Array<{name: string, type?: string, min?: number, max?: number}>} fields
 * @returns {Record<string, string>}
 */
export function rangeErrors(values, fields) {
  const errors = {};
  for (const field of Array.isArray(fields) ? fields : []) {
    if (field.type !== 'number') continue;
    const value = values?.[field.name];
    if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) {
      continue;
    }
    const number = Number(value);
    const hasMin = Number.isFinite(field.min);
    const hasMax = Number.isFinite(field.max);
    if ((hasMin && number < field.min) || (hasMax && number > field.max)) {
      errors[field.name] =
        hasMin && hasMax
          ? `Use a value between ${plain(field.min)} and ${plain(field.max)}.`
          : hasMin
            ? `Use a value of ${plain(field.min)} or more.`
            : `Use a value of ${plain(field.max)} or less.`;
    }
  }
  return errors;
}

/** Whether a filter currently holds a value (for the "Reset" affordance). */
function isFilterSet(params, filter) {
  if (filter.type === 'daterange' || filter.type === 'number-range') {
    const [from, to] = filter.keys ?? [`${filter.key}From`, `${filter.key}To`];
    return Boolean(params[from]) || Boolean(params[to]);
  }
  const value = params[filter.key];
  return (
    value !== undefined &&
    value !== null &&
    value !== '' &&
    !(Array.isArray(value) && !value.length)
  );
}
