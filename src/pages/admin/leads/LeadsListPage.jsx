import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

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
// After the picker, for the same reason: the lead page, which shares this
// chunk, reaches the lead page's stylesheet only after the list's, the table's
// and the picker's.
import AddLeadDialog from './AddLeadDialog';
import LostReasonDialog from './LostReasonDialog';
import PATHS from '../../../routes/paths';
import PageHeader from '../../../components/admin/PageHeader';
import leadService from '../../../services/leadService';
import propertyService from '../../../services/propertyService';
import useApi from '../../../hooks/useApi';
import useApiList from '../../../hooks/useApiList';
import { LeadPriorityDialog, LeadStatusDialog } from './LeadStatusMenu';
import { buildLeadColumns, leadTelLink, leadWhatsappLink, renderLeadCard } from './leadColumns';
import {
  LEAD_LIST_DEFAULTS,
  LEAD_LIST_PARAM_KEYS,
  buildLeadFilterFields,
  exportParamsOf,
  hasActiveFilters,
  useAssignableUsers,
  useLeadDirectory,
} from './leadFilters';
import { LEAD_PRIORITY, LEAD_STATUS } from '../../../config/enums';
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

const rowLabel = (row) => row.name;

/**
 * The worklist chips above the table (prompt 51): the follow-up buckets a desk
 * works through every morning, counted from `meta.followUp`, and "Mine".
 */
const WORKLIST = [
  { key: 'overdue', label: 'Overdue', icon: 'mdi:alarm-note', tone: 'error' },
  { key: 'today', label: 'Due today', icon: 'mdi:calendar-today', tone: 'warning' },
  { key: 'none', label: 'No next step', icon: 'mdi:calendar-question', tone: 'neutral' },
];

/** Whether the view is the "N new" chip's own: status New and nothing else. */
const isNewOnly = (status) =>
  Array.isArray(status) && status.length === 1 && String(status[0]) === 'new';

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
 * optimistically, rolling back only what the API refused and re-reading the
 * page once it agrees; "Lost" asks why first — for one lead or for a batch; an
 * unassigned lead offers a sales user the "Claim" button (D89); the bulk bar
 * applies status, assignee, priority or a delete to the ticked rows; and the
 * CSV comes from the export endpoint with the filters and the order that are
 * on screen, so the file and the table always say the same thing (D46).
 *
 * The one poller in the panel (D45/D55) drives the "N new" chip and reloads
 * the table whenever it brings news — silently, keeping the scroll position,
 * because a list that jumps while it is being read is worse than a stale one.
 * A write made here asks it straight away, so the chip, the sidebar badge and
 * the bell agree with the table without waiting for the next tick (QA-53).
 */
export default function LeadsListPage() {
  const { can } = useAdminAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const {
    newLeadCount,
    refreshKey,
    hasUnseen,
    markSeen,
    refresh: refreshNotifications,
  } = useLeadNotifications();

  const canAssign = can('leads', 'assign');
  const canDelete = can('leads', 'delete');
  const canBulk = can('leads', 'bulk');
  const canExport = can('leads', 'export');
  const canClaim = can('leads', 'claim');

  const { users } = useAssignableUsers({ enabled: canAssign });
  // The Assigned filter names deactivated colleagues too (prompt 51).
  const { users: directory } = useLeadDirectory({ enabled: canAssign });
  const [adding, setAdding] = useState(false);

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
  } = useApiList((query, options) => leadService.adminList(query, options), {
    syncToUrl: true,
    paramKeys: LEAD_LIST_PARAM_KEYS,
    defaults: LEAD_LIST_DEFAULTS,
  });

  // An optimistic change is shown from here until the fetch that follows it
  // answers with the same thing; a refusal takes back the fields it refused.
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

  /** A write went through: the page and the poller both re-read. */
  const afterWrite = useCallback(() => {
    refetch();
    refreshNotifications();
  }, [refetch, refreshNotifications]);

  /* ---------------- writes ---------------- */

  /**
   * One lead's PATCH, shown before it is answered.
   *
   * `shown` is what the row displays meanwhile — the assignee's name as well
   * as the id that is sent. On success the page is re-read (a status change
   * that raced a background reload used to stay on screen as the old one); a
   * refusal takes back only the fields this change put there, so a second
   * change still in flight on the same row keeps its own.
   */
  const patchLead = useCallback(
    async (row, changes, message, shown = changes) => {
      const id = String(row.id);
      setOverrides((current) => ({ ...current, [id]: { ...current[id], ...shown } }));
      setBusyIds((current) => [...current, id]);

      try {
        await leadService.patch(row.id, changes);
        toast.success(message);
        afterWrite();
        return true;
      } catch (thrown) {
        setOverrides((current) => {
          const { [id]: mine, ...rest } = current;
          const kept = Object.fromEntries(
            Object.entries(mine ?? {}).filter(([field]) => !(field in shown))
          );
          return Object.keys(kept).length > 0 ? { ...rest, [id]: kept } : rest;
        });
        toast.error(firstFieldMessage(thrown, 'The change could not be saved.'));
        // Deleted, or taken out of this user's scope, by somebody else.
        if (thrown?.status === 404) refetch();
        return false;
      } finally {
        setBusyIds((current) => current.filter((entry) => entry !== id));
      }
    },
    [afterWrite, refetch, toast]
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
        if (thrown?.status === 409 || thrown?.status === 404) refetch();
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
        const { data, message } = await leadService.bulk({ ids, action, payload });
        // Nothing needed changing — every selected lead already had that
        // status or owner — is not a green "0 leads updated." (prompt 51).
        if (data?.affected === 0) toast.info('No leads needed changing.');
        else toast.success(message || TOASTS.updatedCount(ids.length, 'lead'));
        setSelectedIds([]);
        afterWrite();
        return true;
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'The bulk action could not be applied.'));
        return false;
      } finally {
        setDialogBusy(false);
      }
    },
    [afterWrite, toast]
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
      afterWrite();
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The lead could not be deleted.'));
      // A refusal will not become an acceptance on a second press.
      if (thrown?.status >= 400 && thrown?.status < 500) setDeleting(null);
      if (thrown?.status === 404) refetch();
    } finally {
      setDialogBusy(false);
    }
  };

  /** "Lost", for the lead or the batch the reason dialog was opened for. */
  const confirmLost = async (lostReason) => {
    const target = lostDialog;
    if (!target) return;

    if (target.ids) {
      if (await runBulk('status', target.ids, { status: 'lost', lostReason })) setLostDialog(null);
      return;
    }

    // The dialog stays open until the API agrees, so a refused reason is
    // still there to correct rather than typed again.
    setDialogBusy(true);
    const saved = await patchLead(
      target.row,
      { status: 'lost', lostReason },
      `“${target.row.name}” was marked as lost.`
    );
    setDialogBusy(false);
    if (saved) setLostDialog(null);
  };

  /**
   * The export (D46).
   *
   * `GET /admin/leads/export` repeats the filters and the order that are on
   * screen and writes every matching row — the browser builds nothing, which
   * is how the Property column stopped being empty and a message with a
   * newline in it stopped breaking the file (NEW-22).
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
      const tel = leadTelLink(row);
      const wa = leadWhatsappLink(row);
      const actions = [
        { key: 'view', label: 'View', icon: 'mdi:open-in-new', to: PATHS.adminLead(row.id) },
      ];

      if (tel) actions.push({ key: 'call', label: 'Call', icon: 'mdi:phone-outline', href: tel });
      if (wa) actions.push({ key: 'whatsapp', label: 'WhatsApp', icon: 'mdi:whatsapp', href: wa });

      actions.push(
        {
          key: 'status',
          label: 'Change status',
          icon: 'mdi:flag-outline',
          onClick: () => setStatusDialog({ row }),
        },
        {
          key: 'priority',
          label: 'Set priority',
          icon: 'mdi:alert-octagon-outline',
          onClick: () => setPriorityDialog({ row }),
        }
      );

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

  /* ---------------- the property filter ---------------- */

  const propertyId = params.propertyId;

  // A lead row carries its property, so the picker can usually name the one
  // the URL filters by without a request of its own. When the page holds no
  // such row — the other filters leave nothing — the listing is read once, so
  // the filter still says "Lakeview Heights" rather than "#1" (QA-53).
  const pageProperties = useMemo(() => items.map((item) => item.property).filter(Boolean), [items]);
  const onPage = pageProperties.some((property) => String(property.id) === String(propertyId));

  const { data: filteredProperty } = useApi(
    (signal) => propertyService.adminGet(propertyId, { signal }),
    [propertyId ?? null],
    { enabled: Boolean(propertyId) && !loading && !onPage }
  );

  const knownProperties = useMemo(
    () => (filteredProperty ? [...pageProperties, filteredProperty] : pageProperties),
    [pageProperties, filteredProperty]
  );

  const searchProperties = useCallback(
    (query, options) => propertyService.adminList(query, options),
    []
  );

  const filterFields = useMemo(
    () =>
      buildLeadFilterFields({
        users: directory.length > 0 ? directory : users,
        canAssign,
        propertyTitle: (id) =>
          knownProperties.find((property) => String(property.id) === String(id))?.title ?? null,
        renderProperty: ({ values, onChange, labelClassName, fieldClassName }) => (
          <EntityPicker
            label="Property"
            labelClassName={labelClassName}
            fieldClassName={fieldClassName}
            placeholder="Search listings…"
            multiple={false}
            showChosen={false}
            labelKey="title"
            value={values.propertyId ?? null}
            selectedRecords={knownProperties}
            fetcher={searchProperties}
            onChange={(value) => onChange({ propertyId: value ? String(value) : undefined })}
          />
        ),
      }),
    [directory, users, canAssign, knownProperties, searchProperties]
  );

  /* ---------------- states ---------------- */

  const filtered = hasActiveFilters(params);
  const total = meta?.total;
  const inverted = Boolean(params.from && params.to && params.from > params.to);

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

    // A link or a typed address can still carry a range the bar would not
    // let anybody pick; say so, rather than "nothing matches".
    if (inverted) {
      return {
        title: 'No leads match',
        text: 'The Created range ends before it starts.',
        action: (
          <Button
            variant="outline"
            onClick={() => setFilters({ from: params.to, to: params.from })}
          >
            Swap the dates
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
  }, [params.page, params.from, params.to, inverted, filtered, resetFilters, setFilters, setPage]);

  /* ---------------- dialogs ---------------- */

  const worklist = meta?.followUp ?? null;
  const mine = params.assignedTo === 'me';

  const bulkTarget = statusDialog ?? assignDialog ?? priorityDialog;
  const targetCount = bulkTarget?.ids?.length ?? 0;
  const targetLabel = `${targetCount} ${targetCount === 1 ? 'lead' : 'leads'}`;
  const newOnly = isNewOnly(params.status);

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
                {/* The count is the way to the leads it counts: one press
                    narrows the table to them, a second shows every lead again
                    (QA-53). */}
                <Chip
                  tone="info"
                  selected={newOnly}
                  pressed={newOnly}
                  icon={<Icon icon="mdi:new-box" width="14" height="14" />}
                  title={newOnly ? 'Show every lead' : 'Show only the new leads'}
                  onClick={() => setFilters({ status: newOnly ? undefined : ['new'] })}
                >
                  {`${formatNumber(newLeadCount)} new`}
                </Chip>
                {/* "Seen" is the bell's dot, and the button stays only while
                    there is something it has not been told about: it used to
                    sit here doing nothing visible (QA-53). */}
                {hasUnseen ? (
                  <Button variant="ghost" size="sm" onClick={markSeen}>
                    Mark all seen
                  </Button>
                ) : null}
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
            <Button
              icon={<Icon icon="mdi:account-plus-outline" width="18" height="18" />}
              onClick={() => setAdding(true)}
            >
              Add lead
            </Button>
          </>
        }
      />

      <div className={styles.screen}>
        {/* The morning's work, one press each (prompt 51). The counts are the
            view's, every other filter applied. */}
        <div className={styles.worklist} role="group" aria-label="Follow-up worklist">
          {WORKLIST.map((bucket) => {
            const on = params.followUp === bucket.key;
            const count = worklist?.[bucket.key];
            return (
              <Chip
                key={bucket.key}
                tone={bucket.tone}
                selected={on}
                pressed={on}
                icon={<Icon icon={bucket.icon} width="14" height="14" />}
                onClick={() => setFilters({ followUp: on ? undefined : bucket.key })}
              >
                {typeof count === 'number'
                  ? `${bucket.label} (${formatNumber(count)})`
                  : bucket.label}
              </Chip>
            );
          })}
          <Chip
            tone="info"
            selected={mine}
            pressed={mine}
            icon={<Icon icon="mdi:account-outline" width="14" height="14" />}
            onClick={() => setFilters({ assignedTo: mine ? undefined : 'me' })}
          >
            Mine
          </Chip>
        </div>

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
          refreshing={refreshing}
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
          rowLabel={rowLabel}
          rowHighlight={(row) => row.status === 'new'}
          mobileCard={mobileCard}
          emptyState={emptyState}
          density="compact"
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
        requireChange={Boolean(statusDialog?.row)}
        loading={dialogBusy}
        onClose={() => setStatusDialog(null)}
        onConfirm={async (status) => {
          const target = statusDialog;
          setStatusDialog(null);
          // Lost asks why, one lead or twenty (QA-53).
          if (status === 'lost') {
            setLostDialog(target?.ids ? { ids: target.ids } : { row: target?.row });
            return;
          }
          if (target?.ids) {
            await runBulk('status', target.ids, { status });
            return;
          }
          if (target?.row) changeStatus(target.row, status);
        }}
      />

      <LeadPriorityDialog
        open={Boolean(priorityDialog)}
        title={
          priorityDialog?.row
            ? `Set the priority of “${priorityDialog.row.name}”`
            : 'Set the priority'
        }
        message={
          priorityDialog?.ids ? `${targetLabel} will take the priority you choose.` : undefined
        }
        initialPriority={priorityDialog?.row?.priority ?? 'medium'}
        requireChange={Boolean(priorityDialog?.row)}
        loading={dialogBusy}
        onClose={() => setPriorityDialog(null)}
        onConfirm={async (priority) => {
          const target = priorityDialog;
          setPriorityDialog(null);
          if (target?.ids) {
            await runBulk('priority', target.ids, { priority });
            return;
          }
          if (target?.row) {
            await patchLead(
              target.row,
              { priority },
              `“${target.row.name}” is now ${LEAD_PRIORITY.labelOf(priority)} priority.`
            );
          }
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
        current={assignDialog?.row?.assignedUser ?? null}
        requireChange={Boolean(assignDialog?.row)}
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
          const owner = users.find((entry) => String(entry.id) === String(assignedTo)) ?? null;
          // The row shows the new owner's name straight away, not the old one
          // until the re-read comes back.
          await patchLead(
            target.row,
            { assignedTo },
            owner
              ? `“${target.row.name}” is now ${owner.name}’s.`
              : `“${target.row.name}” is unassigned.`,
            { assignedTo, assignedUser: owner ? { id: owner.id, name: owner.name } : null }
          );
        }}
      />

      <AddLeadDialog
        open={adding}
        canAssign={canAssign}
        users={users}
        onClose={() => setAdding(false)}
        onCreated={(lead) => {
          setAdding(false);
          toast.success(`“${lead.name}” is in the leads.`);
          afterWrite();
          navigate(PATHS.adminLead(lead.id));
        }}
      />

      <LostReasonDialog
        open={Boolean(lostDialog)}
        name={lostDialog?.row?.name}
        count={lostDialog?.ids?.length}
        loading={dialogBusy}
        onClose={() => setLostDialog(null)}
        onConfirm={confirmLost}
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
