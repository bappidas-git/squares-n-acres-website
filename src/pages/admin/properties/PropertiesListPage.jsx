import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import DataTable from '../../../components/admin/DataTable';
import FilterBar from '../../../components/admin/FilterBar';
import PageHeader from '../../../components/admin/PageHeader';
import PATHS from '../../../routes/paths';
import propertyService from '../../../services/propertyService';
import useApiList from '../../../hooks/useApiList';
import { CSV_MIME, csvFileName, toCsv } from '../../../utils/csv';
import { PROPERTY_CSV_COLUMNS, buildPropertyColumns, renderPropertyCard } from './propertyColumns';
import {
  PROPERTY_LIST_DEFAULTS,
  PROPERTY_LIST_PARAM_KEYS,
  buildPropertyFilterFields,
  exportParamsOf,
  hasActiveFilters,
} from './propertyFilters';
import { downloadBlob } from '../../../utils/download';
import { firstFieldMessage } from '../../../services/apiError';
import { formatNumber } from '../../../utils/format';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useDevelopers, useLocalities, usePropertyTypes } from '../../../hooks/useMasterData';
import { useToast } from '../../../components/common/ToastProvider';
import { viewUrlOf } from './publicUrl';

import styles from './PropertiesListPage.module.css';
import { TABLES, TOASTS } from '../../../config/adminCopy';

/** The bulk actions `POST /admin/properties/bulk` accepts for properties (§5.8). */
const BULK_ACTIONS = [
  { key: 'activate', label: 'Activate', icon: 'mdi:eye-outline' },
  { key: 'deactivate', label: 'Deactivate', icon: 'mdi:eye-off-outline' },
  { key: 'feature', label: 'Feature', icon: 'mdi:star-outline' },
  { key: 'unfeature', label: 'Unfeature', icon: 'mdi:star-off-outline' },
  { key: 'verify', label: 'Verify', icon: 'mdi:check-decagram-outline' },
  { key: 'unverify', label: 'Unverify', icon: 'mdi:decagram-outline' },
  {
    key: 'delete',
    label: 'Delete',
    icon: 'mdi:delete-outline',
    danger: true,
    confirm: {
      title: 'Delete the selected properties?',
      message:
        '{count} will be deleted, and the public pages will answer 404. This cannot be undone.',
    },
  },
];

/**
 * Admin → Properties (`/admin/properties`).
 *
 * The table is server-side throughout: every filter, the sort, the page and
 * the page size are query parameters the API answers and the URL carries, so
 * the screen holds one page of rows however many listings exist (BUG-19), and
 * a filtered view is a link somebody can send (ADD-21).
 *
 * What the screen owns beyond the fetch is the writing: the three flag chips
 * patch optimistically and roll back if the API disagrees (§8.2), the bulk bar
 * applies one action to the ticked rows (§5.8), and the export repeats the
 * current filter with `perPage=all` and builds the CSV here (D44).
 *
 * A sales user has `properties.view` and nothing else (§7): they get the same
 * table, read-only — no Add, no bulk, no row writes, and flags that are labels
 * rather than switches. The export stays available to them, because it is the
 * list they are already looking at (decision in `docs/DECISIONS.md`).
 */
export default function PropertiesListPage() {
  const { can } = useAdminAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const canCreate = can('properties', 'create');
  const canEdit = can('properties', 'edit');
  const canDelete = can('properties', 'delete');
  const canBulk = can('properties', 'bulk');
  const canDuplicate = can('properties', 'duplicate');

  // The admin filters offer inactive master data too: a listing already points
  // at the locality that was retired last week, and hiding it from the filter
  // would make that listing unfindable.
  const propertyTypes = usePropertyTypes({ activeOnly: false });
  const localities = useLocalities({ activeOnly: false });
  const developers = useDevelopers({ activeOnly: false });

  const {
    items,
    meta,
    loading,
    refreshing,
    error,
    params,
    setPage,
    setSort,
    setFilters,
    resetFilters,
    refetch,
  } = useApiList((query, options) => propertyService.adminList(query, options), {
    syncToUrl: true,
    paramKeys: PROPERTY_LIST_PARAM_KEYS,
    defaults: PROPERTY_LIST_DEFAULTS,
  });

  // An optimistic flag change is shown from here until the fetch that follows
  // it answers with the same thing; a refusal takes it back out.
  const [overrides, setOverrides] = useState({});
  const [busyIds, setBusyIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Read by the effect below without making it re-run on every busy change.
  const busyRef = useRef(new Set());
  busyRef.current = new Set(busyIds);

  // Fresh rows are the truth, except for a row whose own write is still in
  // flight: clearing every override on any answer made a second chip, clicked
  // while the first one's refetch was travelling, flicker back and forth.
  useEffect(() => {
    setOverrides((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => busyRef.current.has(id)))
    );
  }, [items]);

  const rows = useMemo(
    () =>
      items.map((item) =>
        overrides[String(item.id)] ? { ...item, ...overrides[String(item.id)] } : item
      ),
    [items, overrides]
  );

  /* ---------------- writes ---------------- */

  const setFlag = useCallback(
    async (row, field, value) => {
      const id = String(row.id);
      setOverrides((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
      setBusyIds((current) => [...current, id]);

      try {
        await propertyService.patch(row.id, { [field]: value });
        toast.success(TOASTS.flagged(`“${row.title}”`, field, value));
        // The list is sorted and filtered by the server: a row that is no
        // longer "featured" under a Featured filter, or that has just become
        // the most recently updated, moves — so the page is asked again.
        refetch();
      } catch (thrown) {
        // Only the field that was refused goes back. Taking the whole row's
        // override out used to undo an earlier chip on the same row that the
        // API had accepted.
        setOverrides((current) => {
          const { [field]: _reverted, ...kept } = current[id] ?? {};
          const { [id]: _row, ...others } = current;
          return Object.keys(kept).length > 0 ? { ...others, [id]: kept } : others;
        });
        toast.error(firstFieldMessage(thrown, 'The change could not be saved.'));
      } finally {
        setBusyIds((current) => current.filter((entry) => entry !== id));
      }
    },
    [refetch, toast]
  );

  const duplicate = useCallback(
    async (row) => {
      setDuplicatingId(row.id);
      try {
        const { data } = await propertyService.duplicate(row.id);
        toast.success(`“${row.title}” duplicated as an inactive draft.`);
        if (data?.id) navigate(PATHS.adminPropertyEdit(data.id));
        else refetch();
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'The property could not be duplicated.'));
      } finally {
        setDuplicatingId(null);
      }
    },
    [navigate, refetch, toast]
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await propertyService.remove(deleting.id);
      toast.success(`“${deleting.title}” deleted.`);
      setSelectedIds((current) => current.filter((id) => String(id) !== String(deleting.id)));
      setDeleting(null);
      refetch();
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The property could not be deleted.'));
      // A refusal will not become an acceptance on a second press.
      if (thrown?.status >= 400 && thrown?.status < 500) setDeleting(null);
      // A 404 means somebody else deleted it first: the row goes, rather than
      // staying on screen to fail again.
      if (thrown?.status === 404) refetch();
    } finally {
      setDeletingBusy(false);
    }
  };

  const runBulk = async (action, ids) => {
    setBulkBusy(true);
    try {
      const { message } = await propertyService.bulk({ ids, action });
      toast.success(message || `${ids.length} properties updated.`);
      setSelectedIds([]);
      refetch();
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The bulk action could not be applied.'));
    } finally {
      setBulkBusy(false);
    }
  };

  /**
   * The export (D44).
   *
   * It asks for the current filter again with `perPage=all`, so the file holds
   * every match rather than the twenty rows on screen, and builds the CSV in
   * the browser — there is no export endpoint to keep in step with the filters.
   */
  const exportCsv = async () => {
    setExporting(true);
    try {
      const { data } = await propertyService.adminList(exportParamsOf(params));
      const exported = Array.isArray(data) ? data : [];
      const csv = toCsv(exported, PROPERTY_CSV_COLUMNS);

      downloadBlob(new Blob([csv], { type: CSV_MIME }), csvFileName('properties'));
      toast.success(
        `${formatNumber(exported.length)} ${exported.length === 1 ? 'property' : 'properties'} exported.`
      );
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The export could not be built.'));
    } finally {
      setExporting(false);
    }
  };

  /* ---------------- table ---------------- */

  const columns = useMemo(
    () => buildPropertyColumns({ canEdit, busyIds, onToggleFlag: canEdit ? setFlag : undefined }),
    [canEdit, busyIds, setFlag]
  );

  const mobileCard = useCallback(
    (row) =>
      renderPropertyCard(row, {
        canEdit,
        busyIds,
        onToggleFlag: canEdit ? setFlag : undefined,
      }),
    [canEdit, busyIds, setFlag]
  );

  // Stable, so the memoised rows are not all re-rendered for a new arrow.
  const rowActionsLabel = useCallback((row) => `Actions for ${row.title}`, []);
  const rowLabel = useCallback((row) => row.title, []);

  /**
   * The row's actions.
   *
   * An editor gets six of them, which is a kebab rather than six 44 px icons
   * in a cell — so the labels stay short and the row is named once, on the
   * button that opens the menu. A sales user gets the single "View on site"
   * icon inline, where the label is the only name it has, so it carries the
   * listing's title itself (§8.3).
   */
  const rowActions = useCallback(
    (row) => {
      const live = row.isActive === true;
      const inMenu = canEdit;
      const named = (short, long) => (inMenu ? short : long);

      const actions = [
        {
          key: 'view',
          label: live
            ? named('View on site', `View ${row.title} on the site`)
            : named('Preview', `Preview ${row.title}`),
          icon: live ? 'mdi:open-in-new' : 'mdi:eye-outline',
          href: viewUrlOf(row.slug, live),
        },
      ];

      if (canEdit) {
        actions.push({
          key: 'edit',
          label: named('Edit', `Edit ${row.title}`),
          icon: 'mdi:pencil-outline',
          to: PATHS.adminPropertyEdit(row.id),
        });
      }

      if (canDuplicate) {
        actions.push({
          key: 'duplicate',
          label: named('Duplicate', `Duplicate ${row.title}`),
          icon: 'mdi:content-copy',
          disabled: duplicatingId !== null,
          onClick: () => duplicate(row),
        });
      }

      if (canEdit) {
        actions.push(
          {
            key: 'active',
            label: live
              ? named('Deactivate', `Deactivate ${row.title}`)
              : named('Activate', `Activate ${row.title}`),
            icon: live ? 'mdi:eye-off-outline' : 'mdi:eye-outline',
            disabled: busyIds.includes(String(row.id)),
            onClick: () => setFlag(row, 'isActive', !live),
          },
          {
            key: 'featured',
            label:
              row.isFeatured === true
                ? named('Unfeature', `Unfeature ${row.title}`)
                : named('Feature', `Feature ${row.title}`),
            icon: row.isFeatured === true ? 'mdi:star-off-outline' : 'mdi:star-outline',
            disabled: busyIds.includes(String(row.id)),
            onClick: () => setFlag(row, 'isFeatured', row.isFeatured !== true),
          }
        );
      }

      if (canDelete) {
        actions.push({
          key: 'delete',
          label: named('Delete', `Delete ${row.title}`),
          icon: 'mdi:delete-outline',
          danger: true,
          onClick: () => setDeleting(row),
        });
      }

      return actions;
    },
    [canDelete, canDuplicate, canEdit, busyIds, duplicate, duplicatingId, setFlag]
  );

  const filterFields = useMemo(
    () => buildPropertyFilterFields({ propertyTypes, localities, developers }),
    [propertyTypes, localities, developers]
  );

  const filtered = hasActiveFilters(params);
  const total = meta?.total;

  const emptyState = useMemo(() => {
    if (params.page > 1) {
      return {
        title: TABLES.emptyPage,
        text: TABLES.emptyPageText,
        action: (
          <Button variant="outline" onClick={() => setPage(1)}>
            {TABLES.firstPage}
          </Button>
        ),
      };
    }

    if (filtered) {
      return {
        title: 'No properties match',
        text: 'Nothing in the catalogue answers every filter you have set.',
        action: (
          <Button variant="outline" onClick={resetFilters}>
            {TABLES.resetFilters}
          </Button>
        ),
      };
    }

    return {
      title: 'No properties yet',
      text: 'The catalogue is empty. The first listing is the one every page of the site reads from.',
      action: canCreate ? (
        <Button to={PATHS.adminPropertyNew}>Add your first property</Button>
      ) : null,
    };
  }, [params.page, filtered, resetFilters, setPage, canCreate]);

  return (
    <>
      <PageHeader
        title="Properties"
        count={total}
        subtitle={
          canEdit
            ? 'Every listing on the site, with its status, its numbers and its SEO score.'
            : 'Read-only — you can open a listing and view it on the site.'
        }
        actions={
          <>
            <Button
              variant="outline"
              icon={<Icon icon="mdi:file-delimited-outline" width="18" height="18" />}
              loading={exporting}
              onClick={exportCsv}
            >
              Export CSV{typeof total === 'number' ? ` (${formatNumber(total)})` : ''}
            </Button>
            {canCreate ? (
              <Button
                to={PATHS.adminPropertyNew}
                icon={<Icon icon="mdi:plus" width="18" height="18" />}
              >
                Add property
              </Button>
            ) : null}
          </>
        }
      />

      <div className={styles.screen}>
        <FilterBar
          fields={filterFields}
          values={params}
          onChange={setFilters}
          onReset={resetFilters}
        />

        <DataTable
          caption="Properties"
          columns={columns}
          rows={rows}
          meta={meta}
          loading={loading}
          error={error}
          onRetry={refetch}
          sort={{ field: params.sort, order: params.order }}
          onSortChange={(next) => setSort(next.field, next.order)}
          onPageChange={setPage}
          onPerPageChange={(perPage) => setFilters({ perPage })}
          selectable={canBulk}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkActions={canBulk ? BULK_ACTIONS : []}
          bulkNounOne="property"
          bulkNounMany="properties"
          onBulkAction={runBulk}
          bulkBusy={bulkBusy}
          rowActions={rowActions}
          rowActionsMenu={canEdit}
          rowActionsLabel={rowActionsLabel}
          rowLabel={rowLabel}
          refreshing={refreshing}
          density="compact"
          mobileCard={mobileCard}
          emptyState={emptyState}
        />
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this property?"
        message={
          deleting
            ? `“${deleting.title}” will be deleted, and its public page will answer 404. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        danger
        loading={deletingBusy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
