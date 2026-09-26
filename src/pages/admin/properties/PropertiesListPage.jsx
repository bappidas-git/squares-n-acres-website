import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

import AvailabilityDialog from './AvailabilityDialog';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import DataTable from '../../../components/admin/DataTable';
import FilterBar from '../../../components/admin/FilterBar';
import PageHeader from '../../../components/admin/PageHeader';
import PATHS from '../../../routes/paths';
import leadService from '../../../services/leadService';
import propertyService from '../../../services/propertyService';
import useApi from '../../../hooks/useApi';
import useApiList from '../../../hooks/useApiList';
import useLingering from '../../../hooks/useLingering';
import ActivationCheckDialog from './ActivationCheckDialog';
import EditPriceDialog from './EditPriceDialog';
import { AVAILABILITY } from '../../../config/enums';
import { CSV_MIME, csvFileName, toCsv } from '../../../utils/csv';
import { publishGaps, publishProblems } from '../../../config/propertyRules';
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
import {
  useDevelopers,
  useLocalities,
  usePropertyTypes,
  useSegments,
} from '../../../hooks/useMasterData';
import { useToast } from '../../../components/common/ToastProvider';
import { team } from '../../../services/masterDataService';
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
  // `availability` with its value in the payload (prompt 51).
  { key: 'availability:available', label: 'Mark available', icon: 'mdi:check-circle-outline' },
  { key: 'availability:reserved', label: 'Mark reserved', icon: 'mdi:clock-outline' },
  { key: 'availability:sold', label: 'Mark sold', icon: 'mdi:tag-check-outline' },
  { key: 'availability:rented', label: 'Mark rented', icon: 'mdi:key-outline' },
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

const AVAILABILITY_ACTION = /^availability:(.+)$/;

/** A row the publish rules refuse, as the activation check lists it — or `null`. */
function notReadyOf(row) {
  const gaps = publishGaps(publishProblems(row), row);
  return gaps.length > 0 ? { id: row.id, title: row.title, gaps } : null;
}

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
  const segments = useSegments({ activeOnly: false });
  const propertyTypes = usePropertyTypes({ activeOnly: false });
  const localities = useLocalities({ activeOnly: false });
  const developers = useDevelopers({ activeOnly: false });
  // The advisors, for the Advisor filter the Team list links to (prompt 51).
  // A sales user cannot read the team's admin list; the filter still works
  // from a link, named by its id.
  const { data: agentRows } = useApi(
    (signal) => team.adminList({ perPage: 'all', sort: 'name' }, { signal }),
    [],
    { enabled: can('content', 'view'), initialData: [] }
  );
  const agents = useMemo(() => (Array.isArray(agentRows) ? agentRows : []), [agentRows]);

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
  // "Availability…" and "Edit price…" from the row menu (prompt 51).
  const [availabilityFor, setAvailabilityFor] = useState(null);
  const [pricingFor, setPricingFor] = useState(null);
  const [rowBusy, setRowBusy] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  // Listings an "Activate" would put on the site without what the publish
  // rules ask for — the eye toggle's one row, or the bulk bar's several.
  const [activationCheck, setActivationCheck] = useState(null);
  const [shownCheck, releaseCheck] = useLingering(activationCheck);
  // The delete confirmation keeps its sentence while it fades out (QA-54).
  const [shownDeleting, releaseDeleting] = useLingering(deleting);

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

  // Read by `setFlag` at the moment it answers, so a filter changed while the
  // `PATCH` was travelling is the one it asks about.
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const setFlag = useCallback(
    async (row, field, value) => {
      const id = String(row.id);

      // Publishing asks the form's own rules first: the eye toggle and the row
      // menu used to put a listing with no photograph, no description and no
      // price on the site, because they never went through the form (QA-62).
      if (field === 'isActive' && value === true) {
        const refused = notReadyOf(row);
        if (refused) {
          setActivationCheck({ total: 1, notReady: [refused], readyIds: [] });
          return;
        }
      }

      setOverrides((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
      setBusyIds((current) => [...current, id]);

      try {
        const envelope = await propertyService.patch(row.id, { [field]: value });
        const saved = envelope?.data ?? {};
        toast.success(
          field === 'isFeatured' && value === true && row.isActive !== true
            ? TOASTS.featuredUnpublished(`“${row.title}”`)
            : TOASTS.flagged(`“${row.title}”`, field, value)
        );

        // A view narrowed by this very flag no longer holds the row, so it is
        // asked again. Any other view keeps the row where it is, with what the
        // server answered: refetching re-sorted the default "Updated" order,
        // the row just edited jumped to the top, and the toggle now under the
        // pointer belonged to another listing — a second click changed that
        // one instead (QA-62).
        const narrowed = paramsRef.current?.[field];
        if (narrowed !== undefined && narrowed !== null && narrowed !== '') {
          refetch();
        } else {
          setOverrides((current) => ({
            ...current,
            [id]: {
              ...current[id],
              [field]: saved[field] ?? value,
              ...(saved.updatedAt ? { updatedAt: saved.updatedAt } : null),
              ...(saved.publishedAt !== undefined ? { publishedAt: saved.publishedAt } : null),
            },
          }));
        }
      } catch (thrown) {
        // Only the field that was refused goes back. Taking the whole row's
        // override out used to undo an earlier chip on the same row that the
        // API had accepted.
        setOverrides((current) => {
          const { [field]: _reverted, ...kept } = current[id] ?? {};
          const { [id]: _row, ...others } = current;
          return Object.keys(kept).length > 0 ? { ...others, [id]: kept } : others;
        });
        if (thrown?.status === 404) {
          // Deleted in another tab or by another editor: "Not found" named
          // nothing, and the row stayed on screen to fail again.
          toast.error(TOASTS.gone(`“${row.title}”`));
          refetch();
        } else if (Array.isArray(thrown?.data?.notReady)) {
          // The API's own refusal — the row was emptied in another tab since
          // this page read it — says what is missing, in the same dialog.
          setActivationCheck({ total: 1, notReady: thrown.data.notReady, readyIds: [] });
          refetch();
        } else {
          toast.error(firstFieldMessage(thrown, 'The change could not be saved.'));
        }
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

  /**
   * After rows are deleted: the page they were on, or the one before it when
   * they were all it held — deleting the last listings of page 2 used to leave
   * "Page 2 of 1 — no rows on this page" behind (the articles list does the
   * same, QA-55).
   */
  const afterRemoval = (removed) => {
    const page = Number(params.page) || 1;
    if (page > 1 && removed >= rows.length) setPage(page - 1);
    else refetch();
  };

  // What still points at the listing about to be deleted: the leads keep a
  // snapshot of its name, and the confirm says so (prompt 51).
  const { meta: leadRefs } = useApi(
    (signal) => leadService.adminList({ propertyId: deleting.id, perPage: 1 }, { signal }),
    [deleting?.id ?? null],
    { enabled: Boolean(deleting) }
  );
  const referencingLeads = deleting ? (leadRefs?.total ?? 0) : 0;

  /**
   * A change made from a row's dialog — availability, price — sent as a PATCH
   * of those fields alone, the row showing what the API answered. A view that
   * the change takes the row out of is asked again.
   */
  const patchRow = async (row, body, message) => {
    const id = String(row.id);
    setRowBusy(true);
    try {
      const envelope = await propertyService.patch(row.id, body);
      const saved = envelope?.data ?? {};
      toast.success(message);
      const narrowed = Object.keys(body).some((key) => {
        const value = paramsRef.current?.[key];
        return value !== undefined && value !== null && value !== '';
      });
      if (narrowed) {
        refetch();
      } else {
        setOverrides((current) => ({
          ...current,
          [id]: {
            ...current[id],
            ...Object.fromEntries(Object.keys(body).map((key) => [key, saved[key] ?? body[key]])),
            ...(saved.updatedAt ? { updatedAt: saved.updatedAt } : null),
          },
        }));
      }
      return true;
    } catch (thrown) {
      if (thrown?.status === 404) {
        toast.error(TOASTS.gone(`“${row.title}”`));
        refetch();
        return true;
      }
      toast.error(firstFieldMessage(thrown, 'The change could not be saved.'));
      return false;
    } finally {
      setRowBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await propertyService.remove(deleting.id);
      toast.success(`“${deleting.title}” deleted.`);
      setSelectedIds((current) => current.filter((id) => String(id) !== String(deleting.id)));
      setDeleting(null);
      afterRemoval(1);
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

  const applyBulk = async (action, ids, payload) => {
    setBulkBusy(true);
    try {
      const { data, message } = await propertyService.bulk({
        ids,
        action,
        ...(payload ? { payload } : null),
      });
      if (action === 'availability' && data?.affected === 0) {
        toast.info(
          `Nothing to change: the selected listings were already ${AVAILABILITY.labelOf(
            payload?.availability
          ).toLowerCase()}.`
        );
      } else {
        toast.success(message || `${ids.length} properties updated.`);
      }
      setSelectedIds([]);
      if (action === 'delete') afterRemoval(ids.length);
      else refetch();
    } catch (thrown) {
      if (action === 'activate' && Array.isArray(thrown?.data?.notReady)) {
        // Refused whole by the API: a row changed since this page read it.
        setActivationCheck({ total: ids.length, notReady: thrown.data.notReady, readyIds: [] });
        refetch();
      } else {
        toast.error(firstFieldMessage(thrown, 'The bulk action could not be applied.'));
      }
    } finally {
      setBulkBusy(false);
    }
  };

  /**
   * The bulk actions, with "Activate" asking first what the API would refuse:
   * the rules the form enforces hold for a batch too (`config/propertyRules`,
   * QA-62). The rows on screen carry what the rules read, so the editor hears
   * which listing lacks what, and may activate the ones that are ready.
   */
  const runBulk = async (action, ids) => {
    const availability = AVAILABILITY_ACTION.exec(action);
    if (availability) {
      await applyBulk('availability', ids, { availability: availability[1] });
      return;
    }
    if (action === 'activate') {
      const chosen = new Set(ids.map(String));
      // A listing already live is left as it is — activating it again changes
      // nothing — so only the others are asked the rules.
      const candidates = rows.filter((row) => chosen.has(String(row.id)) && !row.isActive);
      const notReady = candidates.map(notReadyOf).filter(Boolean);

      if (notReady.length > 0) {
        const refused = new Set(notReady.map((entry) => String(entry.id)));
        setActivationCheck({
          total: ids.length,
          notReady,
          readyIds: candidates.map((row) => row.id).filter((id) => !refused.has(String(id))),
        });
        return;
      }
    }
    await applyBulk(action, ids);
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
          },
          // The two edits a live listing gets most, without the form (prompt 51).
          {
            key: 'availability',
            label: named('Availability…', `Availability of ${row.title}`),
            icon: 'mdi:tag-outline',
            disabled: busyIds.includes(String(row.id)),
            onClick: () => setAvailabilityFor(row),
          },
          {
            key: 'price',
            label: named('Edit price…', `Edit the price of ${row.title}`),
            icon: 'mdi:currency-inr',
            disabled: busyIds.includes(String(row.id)),
            onClick: () => setPricingFor(row),
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
    () => buildPropertyFilterFields({ segments, propertyTypes, localities, developers, agents }),
    [segments, propertyTypes, localities, developers, agents]
  );

  const filtered = hasActiveFilters(params);
  // A request that failed leaves the last answer's `meta` behind: the header
  // said "40" and the export offered forty rows over "Something went wrong"
  // for a filter that had never been answered (QA-62).
  const total = error ? undefined : meta?.total;

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
              // Nothing to export is not an export: the button used to hand
              // over a file of headings and say "0 properties exported".
              disabled={total === 0}
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
          shownDeleting
            ? `“${shownDeleting.title}” will be deleted, and its public page will answer 404. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        danger
        loading={deletingBusy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        onExited={releaseDeleting}
      >
        {referencingLeads > 0 ? (
          <p className={styles.deleteNote}>
            {`${formatNumber(referencingLeads)} ${
              referencingLeads === 1 ? 'lead references' : 'leads reference'
            } this listing — they keep a snapshot of its name.`}
          </p>
        ) : null}
        {deleting && canEdit ? (
          <>
            <p className={styles.deleteNote}>
              To take it off the site and keep it, deactivate it; a sale or a let is better recorded
              than deleted.
            </p>
            <div className={styles.deleteAlternatives}>
              {deleting.isActive === true ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={deletingBusy}
                  onClick={() => {
                    const row = deleting;
                    setDeleting(null);
                    setFlag(row, 'isActive', false);
                  }}
                >
                  Deactivate instead
                </Button>
              ) : null}
              {['sold', 'rented'].includes(deleting.availability) ? null : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={deletingBusy}
                  onClick={() => {
                    const row = deleting;
                    const closed = row.listingType === 'sale' ? 'sold' : 'rented';
                    setDeleting(null);
                    patchRow(
                      row,
                      { availability: closed },
                      `“${row.title}” is now ${AVAILABILITY.labelOf(closed)}.`
                    );
                  }}
                >
                  {deleting.listingType === 'sale' ? 'Mark sold instead' : 'Mark rented instead'}
                </Button>
              )}
            </div>
          </>
        ) : null}
      </ConfirmDialog>

      <AvailabilityDialog
        property={availabilityFor}
        loading={rowBusy}
        onClose={() => setAvailabilityFor(null)}
        onConfirm={async (availability) => {
          const row = availabilityFor;
          const saved = await patchRow(
            row,
            { availability },
            `“${row.title}” is now ${AVAILABILITY.labelOf(availability)}.`
          );
          if (saved) setAvailabilityFor(null);
        }}
      />

      <EditPriceDialog
        property={pricingFor}
        loading={rowBusy}
        onClose={() => setPricingFor(null)}
        onConfirm={async (body, headline) => {
          const row = pricingFor;
          const saved = await patchRow(row, body, `“${row.title}”: ${headline}.`);
          if (saved) setPricingFor(null);
        }}
      />

      <ActivationCheckDialog
        open={Boolean(activationCheck)}
        check={shownCheck}
        onClose={() => setActivationCheck(null)}
        onExited={releaseCheck}
        onActivateReady={() => {
          const ids = activationCheck?.readyIds ?? [];
          setActivationCheck(null);
          if (ids.length > 0) applyBulk('activate', ids);
        }}
      />
    </>
  );
}
