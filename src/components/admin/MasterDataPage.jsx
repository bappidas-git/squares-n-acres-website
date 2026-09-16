import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import Switch from '@mui/material/Switch';

import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import DataTable, { DEFAULT_PER_PAGE } from './DataTable';
import DeleteGuardDialog from './DeleteGuardDialog';
import FilterBar from './FilterBar';
import IconButton from '../ui/IconButton';
import MasterDataForm from './MasterDataForm';
import Modal from '../ui/Modal';
import PageHeader from './PageHeader';
import SortableList from './SortableList';
import useApiList from '../../hooks/useApiList';
import useForm from '../../hooks/useForm';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import { firstFieldMessage } from '../../services/apiError';
import { useToast } from '../common/ToastProvider';

import styles from './MasterDataPage.module.css';

/** The query type each filter kind serialises as (§5.6). */
const PARAM_TYPE = {
  search: 'string',
  select: 'string',
  multiselect: 'csv',
  toggle: 'string',
};

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
    filters = [],
    defaultSort = { field: 'createdAt', order: 'desc' },
    paramKeys: extraParamKeys,
    onMutated,
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

  const list = useApiList((params, opts) => service.list(params, opts), {
    syncToUrl: true,
    paramKeys,
    defaults,
  });

  // An optimistic toggle writes here first; a failed call takes it back out.
  // Keeping it beside the fetched rows means a switch answers instantly without
  // the whole table reloading behind it (§8.2).
  const [overrides, setOverrides] = useState({});
  const [busyIds, setBusyIds] = useState([]);

  useEffect(() => {
    setOverrides({});
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
  const patchField = useCallback(
    async (row, field, value) => {
      const id = String(row.id);
      setOverrides((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
      setBusyIds((current) => [...current, id]);

      try {
        await service.patch(row.id, { [field]: value });
        onMutated?.(collectionKey);
      } catch (thrown) {
        setOverrides((current) => {
          const { [id]: _reverted, ...rest } = current;
          return rest;
        });
        toast.error(firstFieldMessage(thrown, 'The change could not be saved.'));
      } finally {
        setBusyIds((current) => current.filter((entry) => entry !== id));
      }
    },
    [service, toast, onMutated, collectionKey]
  );

  return {
    ...list,
    rows,
    busyIds,
    patchField,
    setOverrides,
    defaults,
  };
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
 * @param {(row: object) => React.ReactNode} [props.config.renderOrderItem] the reorder row
 * @param {boolean} [props.config.activeToggle]
 * @param {boolean} [props.config.featuredToggle]
 * @param {Array<object>} [props.config.bulkActions]
 * @param {boolean} [props.config.usageGuard] render the 409 dialog (D88)
 * @param {boolean} [props.config.canEdit] false renders the screen read-only
 * @param {(collection: string) => void} [props.config.onMutated] after every
 *   successful write, with `config.key` — `MasterDataContext.refresh` for the
 *   collections the public site caches
 * @param {string} [props.config.subtitle] the line under the `<h1>`
 * @param {React.ReactNode} [props.config.formFooter] rendered below the fields
 * @param {(row: object) => {key: string, label: React.ReactNode}|null} [props.config.groupBy]
 *   heading rows inside the table, applied only while `groupSort` is the sort
 * @param {string} [props.config.groupSort] the sort `groupBy` belongs to
 * @param {string} [props.config.reorderHint] replaces the drag list's own line
 * @param {(values: object, row: object|null) => Promise<object|null>} [props.config.confirmSave]
 *   asked before a save; a returned `{message, usedBy, confirmLabel}` becomes a
 *   confirm over the records the change reaches (D88)
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
    service,
    columns = [],
    filters = [],
    formFields: formFieldsProp = [],
    formFooter,
    schema,
    createSchema,
    formMode = 'dialog',
    onCreate,
    onEdit,
    onMutated,
    confirmSave,
    groupBy,
    groupSort,
    orderable = false,
    reorderHint,
    renderOrderItem,
    activeToggle = true,
    featuredToggle = false,
    bulkActions = [],
    usageGuard = true,
    canEdit = true,
    emptyState,
    newValues = {},
    extraRowActions,
    toPayload,
    toFormValues,
    validate: customValidate,
  } = config;

  const toast = useToast();
  const crud = useMasterDataCrud(config);
  const {
    rows,
    meta,
    loading,
    error,
    refetch,
    params,
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

  const isNew = Boolean(editing) && !editing.id;
  const activeSchema = isNew ? (createSchema ?? schema) : schema;

  // A screen whose fields depend on the record — the users form disables an
  // admin's own role select — passes a function instead of a list.
  const formFields = useMemo(
    () => (typeof formFieldsProp === 'function' ? formFieldsProp(editing) : formFieldsProp),
    [formFieldsProp, editing]
  );

  const initialValues = useMemo(() => {
    if (!editing) return {};
    if (!editing.id) return { ...defaultsFromFields(formFields), ...newValues };
    return toFormValues ? toFormValues(editing) : pickFields(editing, formFields);
  }, [editing, formFields, newValues, toFormValues]);

  const form = useForm({
    initialValues,
    schema: activeSchema,
    validate: customValidate ? (values) => customValidate(values, editing) : undefined,
    normalize: toPayload ? (values) => toPayload(values, editing) : undefined,
    onSubmit: async (payload) => {
      if (editing?.id) return service.update(editing.id, payload);
      return service.create(payload);
    },
  });

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
    if (form.submitting) return;
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
    const saved = await form.submit();
    if (!saved) return false;
    toast.success(`${capitalise(singular)} ${editing?.id ? 'updated' : 'created'}.`);
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
    if (!confirmSave) {
      await persist();
      return;
    }

    if (!form.validateAll()) return;

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

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await service.remove(deleting.id);
      toast.success(`${capitalise(singular)} deleted.`);
      setDeleting(null);
      setSelectedIds((current) => current.filter((id) => String(id) !== String(deleting.id)));
      onMutated?.(collectionKey);
      refetch();
    } catch (thrown) {
      // 409 is not a failure to report as one: it is a list of what to unlink
      // first, and the dialog is where that list belongs (D88).
      if (usageGuard && thrown?.status === 409) {
        setDeleting(null);
        setGuard({
          title: labelOf(deleting, columns),
          message: thrown.message,
          usedBy: thrown.data?.usedBy ?? [],
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
      const { message } = await service.bulk({ ids, action });
      toast.success(message || `${ids.length} records updated.`);
      setSelectedIds([]);
      onMutated?.(collectionKey);
      refetch();
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The bulk action could not be applied.'));
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
  const startCreate = useCallback(() => (onCreate ? onCreate() : setEditing({})), [onCreate]);
  const startEdit = useCallback((row) => (onEdit ? onEdit(row) : setEditing(row)), [onEdit]);

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
   */
  const reorder = async (next, move) => {
    const row = move?.item;
    const neighbour = move ? rows[move.to] : null;
    if (!row || !neighbour) return;

    const anchor = Number(neighbour.order);
    const offset = ((meta?.page ?? 1) - 1) * (meta?.perPage ?? DEFAULT_PER_PAGE);
    const order = Number.isFinite(anchor)
      ? move.to < move.from
        ? anchor
        : anchor + 1
      : offset + move.to + 1;

    try {
      await service.patch(row.id, { order });
      onMutated?.(collectionKey);
      refetch();
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The new order could not be saved.'));
      refetch();
    }
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
            disabled={!canEdit || busyIds.includes(String(row.id))}
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
  }, [columns, activeToggle, featuredToggle, canEdit, busyIds, patchField]);

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
      ...(canEdit
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
    [canEdit, columns, extraRowActions, startEdit]
  );

  // Reordering replaces the table only while the list is in the order it is
  // reordering: dragging a row of a list sorted by name would be writing
  // positions nobody can see.
  const reordering = orderable && params.sort === 'order' && !loading && !error && rows.length > 0;

  // What "back to the table" sorts by: the first order the columns offer that
  // is not the one the drag list is already showing.
  const tableSort = useMemo(() => {
    const column = columns.find((entry) => entry.sortable && entry.key !== 'order');
    return column ? { sort: column.key, order: 'asc' } : null;
  }, [columns]);

  // The group headings belong to one sort — the rows have to arrive grouped for
  // "a new key" to mean "a new group" (§6 of prompt 15).
  const grouping = groupBy && (!groupSort || params.sort === groupSort) ? groupBy : undefined;

  const saving = form.submitting || checkingSave;

  const activeFilterCount = filters.reduce(
    (count, filter) => count + (isFilterSet(params, filter) ? 1 : 0),
    0
  );

  const formBody = (
    <MasterDataForm
      fields={formFields}
      form={form}
      disabled={form.submitting}
      checkSlug={service.checkSlug}
      excludeId={editing?.id}
      slugBase={config.slugBase}
    >
      {typeof formFooter === 'function' ? formFooter(editing) : formFooter}
    </MasterDataForm>
  );

  /**
   * The "this reaches further than the form shows" confirm: the same usage list
   * a 409 renders, asked before the write instead of after it.
   */
  const saveGuard = (
    <DeleteGuardDialog
      open={Boolean(saveWarning)}
      heading={saveWarning?.heading ?? 'Check before saving'}
      title={saveWarning?.title}
      message={saveWarning?.message}
      usedBy={saveWarning?.usedBy ?? []}
      hint={saveWarning?.hint ?? ''}
      confirmLabel={saveWarning?.confirmLabel ?? 'Save anyway'}
      loading={form.submitting}
      onClose={() => setSaveWarning(null)}
      onConfirm={async () => {
        // The dialog stays up while the write is in flight and closes with the
        // form on success; a refusal lands on the field behind it, so it gets
        // out of the way instead.
        if (!(await persist())) setSaveWarning(null);
      }}
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
          />
        </div>
      ) : null}

      {reordering ? (
        <div className={styles.reorder}>
          <div className={styles.reorderHead}>
            <p className={styles.reorderHint}>
              {reorderHint ??
                'Drag a row, or focus it and press Alt + ↑ / ↓, to change the order they appear in.'}
            </p>
            {/* The drag list replaces the table, headers and all, so it owes
                the editor the way back that a column header would have been. */}
            {tableSort ? (
              <Button
                variant="outline"
                size="sm"
                icon={<Icon icon="mdi:table" width="18" height="18" />}
                onClick={() => setParams(tableSort)}
              >
                Back to the table
              </Button>
            ) : null}
          </div>
          <SortableList
            items={rows}
            disabled={!canEdit}
            label={`${title}, in order`}
            getLabel={(row) => labelOf(row, columns)}
            onReorder={reorder}
            renderItem={(row) => (
              <span className={styles.reorderRow}>
                {renderOrderItem ? renderOrderItem(row) : labelOf(row, columns)}
              </span>
            )}
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
          bulkBusy={bulkBusy}
          onBulkAction={runBulk}
          rowActions={rowActions}
          groupBy={grouping}
          caption={title}
          emptyState={{
            title: emptyState?.title ?? `No ${title.toLowerCase()} yet`,
            text:
              activeFilterCount > 0
                ? 'No records match the current filters.'
                : (emptyState?.text ?? `Add the first ${singular} to get started.`),
            action:
              activeFilterCount > 0 ? (
                <Button variant="outline" onClick={resetFilters}>
                  Reset filters
                </Button>
              ) : canEdit ? (
                <Button onClick={startCreate}>Add {singular}</Button>
              ) : null,
          }}
        />
      )}

      {formMode === 'dialog' ? (
        <Modal
          open={Boolean(editing)}
          onClose={requestClose}
          mobile="fullscreen"
          size="md"
          title={editing?.id ? `Edit ${singular}` : `New ${singular}`}
          footer={
            <>
              <Button variant="ghost" onClick={requestClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} loading={saving}>
                {editing?.id ? 'Save changes' : `Create ${singular}`}
              </Button>
            </>
          }
        >
          {editing ? formBody : null}
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${singular}?`}
        message={
          deleting ? `“${labelOf(deleting, columns)}” will be removed. This cannot be undone.` : ''
        }
        confirmLabel="Delete"
        danger
        loading={deletingBusy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard unsaved changes?"
        message={DISCARD_MESSAGE}
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        danger
        onClose={() => setConfirmDiscard(false)}
        onConfirm={closeForm}
      />

      <DeleteGuardDialog
        open={Boolean(guard)}
        title={guard?.title}
        message={guard?.message}
        usedBy={guard?.usedBy ?? []}
        onClose={() => setGuard(null)}
      />

      {saveGuard}
    </>
  );
}

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
