import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import AssignDialog from './AssignDialog';
import Button from '../../../components/ui/Button';
import Chip from '../../../components/ui/Chip';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import DataTable from '../../../components/admin/DataTable';
// `FilterBar` before `EntityPicker`, against the alphabetical order the rest of
// this block keeps: `FilterBar` pulls `MultiSelect`, and `MasterDataPage` — the
// other admin chunk holding all three — registers `MultiSelect.module.css`
// first, through its own `FilterBar`, before `MasterDataForm` reaches
// `EntityPicker`. Two chunks disagreeing about that order is a
// `mini-css-extract-plugin` conflict and `build:ci` treats it as an error
// (`components/admin/index.js` says the same).
import FilterBar from '../../../components/admin/FilterBar';
import EntityPicker from '../../../components/admin/EntityPicker';
import LostReasonDialog from './LostReasonDialog';
import PATHS from '../../../routes/paths';
import PageHeader from '../../../components/admin/PageHeader';
import leadService from '../../../services/leadService';
import propertyService from '../../../services/propertyService';
import useApiList from '../../../hooks/useApiList';
import { LeadPriorityDialog, LeadStatusDialog } from './LeadStatusMenu';
import { buildLeadColumns, renderLeadCard } from './leadColumns';
import {
  LEAD_LIST_DEFAULTS,
  LEAD_LIST_PARAM_KEYS,
  buildLeadFilterFields,
  exportParamsOf,
  hasActiveFilters,
  useAssignableUsers,
} from './leadFilters';
import { LEAD_STATUS } from '../../../config/enums';
import { csvFileName } from '../../../utils/csv';
import { downloadAuthenticated } from '../../../utils/download';
import { endpoints } from '../../../services/endpoints';
import { firstFieldMessage } from '../../../services/apiError';
import { formatNumber } from '../../../utils/format';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useLeadNotifications } from '../../../contexts/LeadNotificationsContext';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './LeadsListPage.module.css';
import { TABLES, TOASTS } from '../../../config/adminCopy';

/** The bulk actions `POST /admin/leads/bulk` accepts (§5.14). */
const BULK_ACTIONS = [
  { key: 'status', label: 'Change status', icon: 'mdi:flag-outline' },
  { key: 'assign', label: 'Assign', icon: 'mdi:account-arrow-right-outline' },
  { key: 'priority', label: 'Priority', icon: 'mdi:alert-octagon-outline' },
  {
    key: 'delete',
    label: 'Delete',
    icon: 'mdi:delete-outline',
    danger: true,
    confirm: {
      title: 'Delete the selected leads?',
      message:
        '{count} will be deleted, with the notes and the timeline of each. This cannot be undone.',
    },
  },
];

/**
 * Admin → Leads (`/admin/leads`) — the CRM list.
 *
 * Everything the table does, the API does: the filters, the sort, the page and
 * the export are query parameters `GET /admin/leads` answers, and the sales
 * scope of D15 is applied there rather than here, so a sales user's list is
 * short because the server said so and not because the browser hid rows
 * (BUG-19, NEW-22).
 *
 * The screen writes too. A status change is one press on the chip and patches
 * optimistically, rolling back if the API disagrees; "Lost" asks why first; an
 * unassigned lead offers a sales user the "Claim" button (D89); the bulk bar
 * applies status, assignee, priority or a delete to the ticked rows; and the
 * CSV comes from the export endpoint with the filters that are on screen, so
 * the file and the table always say the same thing (D46).
 *
 * The one poller in the panel (D45/D55) drives the "N new" chip and reloads
 * the table whenever it brings news — silently, keeping the scroll position,
 * because a list that jumps while it is being read is worse than a stale one.
 */
export default function LeadsListPage() {
  const { can } = useAdminAuth();
  const toast = useToast();
  const { newLeadCount, refreshKey, markSeen } = useLeadNotifications();

  const canAssign = can('leads', 'assign');
  const canDelete = can('leads', 'delete');
  const canBulk = can('leads', 'bulk');
  const canExport = can('leads', 'export');
  const canClaim = can('leads', 'claim');

  const { users } = useAssignableUsers({ enabled: canAssign });

  const {
    items,
    meta,
    loading,
    error,
    params,
    setPage,
    setSort,
    setFilters,
    resetFilters,
    refetch,
  } = useApiList((query, options) => leadService.adminList(query, options), {
    syncToUrl: true,
    paramKeys: LEAD_LIST_PARAM_KEYS,
    defaults: LEAD_LIST_DEFAULTS,
  });

  // An optimistic status change is shown from here until the fetch that
  // follows it answers with the same thing; a refusal takes it back out.
  const [overrides, setOverrides] = useState({});
  const [busyIds, setBusyIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [claimingId, setClaimingId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [statusDialog, setStatusDialog] = useState(null);
  const [assignDialog, setAssignDialog] = useState(null);
  const [priorityDialog, setPriorityDialog] = useState(null);
  const [lostDialog, setLostDialog] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  useEffect(() => {
    setOverrides({});
  }, [items]);

  // The first render is not news: the poller's opening answer would otherwise
  // reload a table that has only just loaded.
  const seenRefresh = useRef(refreshKey);
  useEffect(() => {
    if (seenRefresh.current === refreshKey) return;
    seenRefresh.current = refreshKey;
    refetch();
  }, [refreshKey, refetch]);

  const rows = useMemo(
    () =>
      items.map((item) =>
        overrides[String(item.id)] ? { ...item, ...overrides[String(item.id)] } : item
      ),
    [items, overrides]
  );

  /* ---------------- writes ---------------- */

  const patchLead = useCallback(
    async (row, changes, message) => {
      const id = String(row.id);
      setOverrides((current) => ({ ...current, [id]: { ...current[id], ...changes } }));
      setBusyIds((current) => [...current, id]);

      try {
        await leadService.patch(row.id, changes);
        toast.success(message);
        return true;
      } catch (thrown) {
        setOverrides((current) => {
          const { [id]: _reverted, ...rest } = current;
          return rest;
        });
        toast.error(firstFieldMessage(thrown, 'The change could not be saved.'));
        return false;
      } finally {
        setBusyIds((current) => current.filter((entry) => entry !== id));
      }
    },
    [toast]
  );

  const changeStatus = useCallback(
    (row, status) =>
      patchLead(row, { status }, `“${row.name}” is now ${LEAD_STATUS.labelOf(status)}.`),
    [patchLead]
  );

  const claim = useCallback(
    async (row) => {
      setClaimingId(row.id);
      try {
        await leadService.claim(row.id);
        toast.success(`“${row.name}” is yours.`);
        refetch();
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'This lead could not be claimed.'));
        if (thrown?.status === 409) refetch();
      } finally {
        setClaimingId(null);
      }
    },
    [refetch, toast]
  );

  const runBulk = useCallback(
    async (action, ids, payload) => {
      setDialogBusy(true);
      try {
        const { message } = await leadService.bulk({ ids, action, payload });
        toast.success(message || TOASTS.updatedCount(ids.length, 'lead'));
        setSelectedIds([]);
        refetch();
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'The bulk action could not be applied.'));
      } finally {
        setDialogBusy(false);
      }
    },
    [refetch, toast]
  );

  const onBulkAction = useCallback(
    (action, ids) => {
      if (action === 'delete') {
        runBulk('delete', ids);
        return;
      }
      if (action === 'status') setStatusDialog({ ids });
      if (action === 'assign') setAssignDialog({ ids });
      if (action === 'priority') setPriorityDialog({ ids });
    },
    [runBulk]
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    setDialogBusy(true);
    try {
      await leadService.remove(deleting.id);
      toast.success(TOASTS.deleted(`“${deleting.name}”`));
      setSelectedIds((current) => current.filter((id) => String(id) !== String(deleting.id)));
      setDeleting(null);
      refetch();
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The lead could not be deleted.'));
      // A refusal will not become an acceptance on a second press.
      if (thrown?.status >= 400 && thrown?.status < 500) setDeleting(null);
    } finally {
      setDialogBusy(false);
    }
  };

  /**
   * The export (D46).
   *
   * `GET /admin/leads/export` repeats the filters that are on screen and
   * writes every matching row — the browser builds nothing, which is how the
   * Property column stopped being empty and a message with a newline in it
   * stopped breaking the file (NEW-22).
   */
  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadAuthenticated(
        endpoints.adminLeads.exportCsv,
        exportParamsOf(params),
        csvFileName('leads'),
        { type: 'text/csv;charset=utf-8' }
      );
      toast.success(TOASTS.csvReady);
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The export could not be built.'));
    } finally {
      setExporting(false);
    }
  };

  /* ---------------- table ---------------- */

  const columnOptions = useMemo(
    () => ({
      busyIds,
      onStatusChange: changeStatus,
      onLost: (row) => setLostDialog({ row }),
      canClaim,
      onClaim: claim,
      claimingId,
    }),
    [busyIds, changeStatus, canClaim, claim, claimingId]
  );

  const columns = useMemo(() => buildLeadColumns(columnOptions), [columnOptions]);
  const mobileCard = useCallback((row) => renderLeadCard(row, columnOptions), [columnOptions]);

  const rowActions = useCallback(
    (row) => {
      const tel = row.phone ? `tel:${String(row.phone).replace(/[^\d+]/g, '')}` : null;
      const actions = [
        { key: 'view', label: 'View', icon: 'mdi:open-in-new', to: PATHS.adminLead(row.id) },
      ];

      if (tel) actions.push({ key: 'call', label: 'Call', icon: 'mdi:phone-outline', href: tel });

      actions.push({
        key: 'status',
        label: 'Change status',
        icon: 'mdi:flag-outline',
        onClick: () => setStatusDialog({ row }),
      });

      if (canAssign) {
        actions.push({
          key: 'assign',
          label: 'Assign',
          icon: 'mdi:account-arrow-right-outline',
          onClick: () => setAssignDialog({ row }),
        });
      }

      if (canDelete) {
        actions.push({
          key: 'delete',
          label: 'Delete',
          icon: 'mdi:delete-outline',
          danger: true,
          onClick: () => setDeleting(row),
        });
      }

      return actions;
    },
    [canAssign, canDelete]
  );

  // A lead row carries its property, so the picker can name the one the URL
  // filters by without a request of its own.
  const knownProperties = useMemo(
    () => items.map((item) => item.property).filter(Boolean),
    [items]
  );

  const filterFields = useMemo(
    () =>
      buildLeadFilterFields({
        users,
        canAssign,
        renderProperty: ({ values, onChange, labelClassName, fieldClassName }) => (
          <EntityPicker
            label="Property"
            labelClassName={labelClassName}
            fieldClassName={fieldClassName}
            placeholder="Search listings…"
            multiple={false}
            labelKey="title"
            value={values.propertyId ?? null}
            selectedRecords={knownProperties}
            fetcher={(query, options) => propertyService.adminList(query, options)}
            onChange={(value) => onChange({ propertyId: value ? String(value) : undefined })}
          />
        ),
      }),
    [users, canAssign, knownProperties]
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
        title: 'No leads match',
        text: 'Nothing in the pipeline answers every filter you have set.',
        action: (
          <Button variant="outline" onClick={resetFilters}>
            {TABLES.resetFilters}
          </Button>
        ),
      };
    }

    return {
      title: 'No leads yet',
      text: 'Every form on the site ends here. The first enquiry will open this list.',
    };
  }, [params.page, filtered, resetFilters, setPage]);

  const bulkTarget = statusDialog ?? assignDialog ?? priorityDialog;
  const targetCount = bulkTarget?.ids?.length ?? 0;
  const targetLabel = `${targetCount} ${targetCount === 1 ? 'lead' : 'leads'}`;

  return (
    <>
      <PageHeader
        title="Leads"
        count={total}
        subtitle="Every enquiry the site has captured, with where it stands and whose it is."
        actions={
          <>
            {newLeadCount > 0 ? (
              <span className={styles.newGroup}>
                <Chip tone="info" icon={<Icon icon="mdi:new-box" width="14" height="14" />}>
                  {`${formatNumber(newLeadCount)} new`}
                </Chip>
                <Button variant="ghost" size="sm" onClick={markSeen}>
                  Mark all seen
                </Button>
              </span>
            ) : null}
            {canExport ? (
              <Button
                variant="outline"
                icon={<Icon icon="mdi:file-delimited-outline" width="18" height="18" />}
                loading={exporting}
                onClick={exportCsv}
              >
                Export CSV{typeof total === 'number' ? ` (${formatNumber(total)})` : ''}
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
          caption="Leads"
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
          bulkNounOne="lead"
          bulkNounMany="leads"
          onBulkAction={onBulkAction}
          bulkBusy={dialogBusy}
          rowActions={rowActions}
          rowActionsMenu
          rowActionsLabel={(row) => `Actions for ${row.name}`}
          rowHighlight={(row) => row.status === 'new'}
          mobileCard={mobileCard}
          emptyState={emptyState}
        />
      </div>

      <LeadStatusDialog
        open={Boolean(statusDialog)}
        title={
          statusDialog?.row ? `Change the status of “${statusDialog.row.name}”` : 'Change status'
        }
        message={
          statusDialog?.ids ? `${targetLabel} will move to the status you choose.` : undefined
        }
        initialStatus={statusDialog?.row?.status ?? 'new'}
        loading={dialogBusy}
        onClose={() => setStatusDialog(null)}
        onConfirm={async (status) => {
          const target = statusDialog;
          setStatusDialog(null);
          if (target?.ids) {
            await runBulk('status', target.ids, { status });
            return;
          }
          if (!target?.row) return;
          if (status === 'lost') {
            setLostDialog({ row: target.row });
            return;
          }
          changeStatus(target.row, status);
        }}
      />

      <LeadPriorityDialog
        open={Boolean(priorityDialog)}
        title="Set the priority"
        message={
          priorityDialog?.ids ? `${targetLabel} will take the priority you choose.` : undefined
        }
        loading={dialogBusy}
        onClose={() => setPriorityDialog(null)}
        onConfirm={async (priority) => {
          const target = priorityDialog;
          setPriorityDialog(null);
          if (target?.ids) await runBulk('priority', target.ids, { priority });
        }}
      />

      <AssignDialog
        open={Boolean(assignDialog)}
        title={
          assignDialog?.row ? `Assign “${assignDialog.row.name}”` : 'Assign the selected leads'
        }
        message={assignDialog?.ids ? `${targetLabel} will be handed over.` : undefined}
        users={users}
        value={assignDialog?.row?.assignedTo ?? null}
        loading={dialogBusy}
        onClose={() => setAssignDialog(null)}
        onConfirm={async (assignedTo) => {
          const target = assignDialog;
          setAssignDialog(null);
          if (target?.ids) {
            await runBulk('assign', target.ids, { assignedTo });
            return;
          }
          if (!target?.row) return;
          const name = users.find((entry) => String(entry.id) === String(assignedTo))?.name;
          await patchLead(
            target.row,
            { assignedTo },
            name ? `“${target.row.name}” is now ${name}’s.` : `“${target.row.name}” is unassigned.`
          );
          refetch();
        }}
      />

      <LostReasonDialog
        open={Boolean(lostDialog)}
        name={lostDialog?.row?.name}
        loading={dialogBusy}
        onClose={() => setLostDialog(null)}
        onConfirm={async (lostReason) => {
          const target = lostDialog;
          setLostDialog(null);
          if (!target?.row) return;
          await patchLead(
            target.row,
            { status: 'lost', lostReason },
            `“${target.row.name}” was marked as lost.`
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this lead?"
        message={
          deleting
            ? `“${deleting.name}” will be deleted, with its notes and its timeline. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        danger
        loading={dialogBusy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
