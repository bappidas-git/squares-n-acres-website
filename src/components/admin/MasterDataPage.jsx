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
    service,
    filters = [],
    defaultSort = { field: 'createdAt', order: 'desc' },
    paramKeys: extraParamKeys,
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
    [service, toast]
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
 * @param {Array<object>} props.config.columns `DataTable` columns
 * @param {Array<object>} [props.config.filters] `FilterBar` fields
 * @param {Array<object>|(record: object|null) => Array<object>} props.config.formFields
 * @param {Record<string, object>} [props.config.schema] a `src/services/schemas` descriptor
 * @param {Record<string, object>} [props.config.createSchema] when create differs from update
 * @param {'dialog'|'page'} [props.config.formMode]
 * @param {{field: string, order: 'asc'|'desc'}} [props.config.defaultSort]
 * @param {boolean} [props.config.orderable] drag to reorder, saved as `order`
 * @param {boolean} [props.config.activeToggle]
 * @param {boolean} [props.config.featuredToggle]
 * @param {Array<object>} [props.config.bulkActions]
 * @param {boolean} [props.config.usageGuard] render the 409 dialog (D88)
 * @param {boolean} [props.config.canEdit] false renders the screen read-only
 * @param {(row: object) => Array<object>} [props.config.extraRowActions]
 * @param {(values: object, row: object|null) => object} [props.config.toPayload]
 * @param {(row: object) => object} [props.config.toFormValues]
 */
export default function MasterDataPage({ config }) {
  const {
    title,
    singular,
    service,
    columns = [],
    filters = [],
    formFields: formFieldsProp = [],
    schema,
    createSchema,
    formMode = 'dialog',
    orderable = false,
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

  const save = async () => {
    const saved = await form.submit();
    if (!saved) return;
    toast.success(`${capitalise(singular)} ${editing?.id ? 'updated' : 'created'}.`);
    setEditing(null);
    refetch();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await service.remove(deleting.id);
      toast.success(`${capitalise(singular)} deleted.`);
      setDeleting(null);
      setSelectedIds((current) => current.filter((id) => String(id) !== String(deleting.id)));
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
      refetch();
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The bulk action could not be applied.'));
    } finally {
      setBulkBusy(false);
    }
  };

  const reorder = async (next) => {
    try {
      await Promise.all(
        next.map((row, index) =>
          row.order === index ? Promise.resolve() : service.patch(row.id, { order: index })
        )
      );
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

    return [...columns, ...extra];
  }, [columns, activeToggle, featuredToggle, canEdit, busyIds, patchField]);

  const rowActions = useCallback(
    (row) => [
      ...(canEdit
        ? [
            {
              key: 'edit',
              label: `Edit ${labelOf(row, columns)}`,
              icon: 'mdi:pencil-outline',
              onClick: () => setEditing(row),
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
    [canEdit, columns, extraRowActions]
  );

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
              <Button variant="ghost" onClick={requestClose} disabled={form.submitting}>
                Cancel
              </Button>
              <Button onClick={save} loading={form.submitting}>
                Save
              </Button>
            </>
          }
        />
        {formBody}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        count={meta?.total}
        actions={
          canEdit ? (
            <Button
              icon={<Icon icon="mdi:plus" width="18" height="18" />}
              onClick={() => setEditing({})}
            >
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

      {orderable && !loading && !error && rows.length > 0 ? (
        <div className={styles.reorder}>
          <p className={styles.reorderHint}>
            Drag a row, or focus it and press Alt + ↑ / ↓, to change the order they appear in.
          </p>
          <SortableList
            items={rows}
            disabled={!canEdit}
            label={`${title}, in order`}
            getLabel={(row) => labelOf(row, columns)}
            onReorder={reorder}
            renderItem={(row) => <span className={styles.reorderRow}>{labelOf(row, columns)}</span>}
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
                <Button onClick={() => setEditing({})}>Add {singular}</Button>
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
              <Button variant="ghost" onClick={requestClose} disabled={form.submitting}>
                Cancel
              </Button>
              <Button onClick={save} loading={form.submitting}>
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
