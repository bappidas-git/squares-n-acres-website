import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import DataTable, { DEFAULT_PER_PAGE } from '../../../components/admin/DataTable';
import EntityPicker from '../../../components/admin/EntityPicker';
import FilterBar from '../../../components/admin/FilterBar';
import PageHeader from '../../../components/admin/PageHeader';
import StatusChip from '../../../components/admin/StatusChip';
// After the admin kit, out of alphabetical order: the drawer brings this
// page's stylesheet with it, and `NewsletterSubscribersPage` — which shares a
// chunk with this page — reaches that stylesheet after the kit's. Two orders
// for one chunk is a mini-css-extract "Conflicting order", which `build:ci`
// refuses.
import ApplicationDrawer from './ApplicationDrawer';
import careerService from '../../../services/careerService';
import sanitiseParams from '../../../components/admin/sanitiseParams';
import useApi from '../../../hooks/useApi';
import useApiList from '../../../hooks/useApiList';
import { JOB_APPLICATION_STATUS } from '../../../config/enums';
import { firstFieldMessage } from '../../../services/apiError';
import { formatRelative } from '../../../utils/format';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './JobApplicationsPage.module.css';
import { TABLES, TOASTS } from '../../../config/adminCopy';

/** What the table asks for before anybody touches a control (§5.6, D47). */
const LIST_DEFAULTS = { page: 1, perPage: DEFAULT_PER_PAGE, sort: 'createdAt', order: 'desc' };

/** The parameters that live in the URL, and how each is serialised (§5.6). */
const PARAM_KEYS = {
  q: 'string',
  jobId: 'string',
  status: 'csv',
  sort: 'string',
  order: 'string',
  page: 'int',
  perPage: 'int',
};

const FILTER_KEYS = ['q', 'jobId', 'status'];

/** The orders the table offers — its sortable columns. */
const SORT_KEYS = ['createdAt', 'status', 'name'];

const STATUS_FILTER = {
  key: 'status',
  type: 'multiselect',
  label: 'Status',
  placeholder: 'Any status',
  options: JOB_APPLICATION_STATUS.options,
};

/**
 * The URL's parameters as the desk may act on them (QA-61, QA-59's rule for
 * the master-data lists). `?status=bogus` drew a "Status: bogus" chip over a
 * desk narrowed to nothing; a status nobody can choose, a sort that is not a
 * column and a role that is not an id are no filter at all.
 *
 * @param {object} params
 * @returns {object}
 */
export function sanitiseApplicationParams(params) {
  const clean = sanitiseParams(params, {
    filters: [STATUS_FILTER],
    sortKeys: SORT_KEYS,
    defaults: LIST_DEFAULTS,
  });
  if (clean.jobId !== undefined && clean.jobId !== null && !/^\d+$/.test(String(clean.jobId))) {
    clean.jobId = undefined;
  }
  return clean;
}

/**
 * An application's status, as the control that changes it.
 *
 * The chip is the button, for the same reason it is in the lead table: the
 * cell shows where somebody stands and opens the five places they could stand
 * instead, which is one press rather than a trip into the panel for the
 * commonest edit on this screen.
 */
function ApplicationStatusMenu({ value, name, busy = false, onChange }) {
  const [anchor, setAnchor] = useState(null);

  const entry = JOB_APPLICATION_STATUS.meta[value] ?? {};
  const label = JOB_APPLICATION_STATUS.labelOf(value) || '—';
  const close = () => setAnchor(null);

  return (
    <>
      <StatusChip
        tone={entry.tone ?? 'neutral'}
        label={label}
        aria-label={`Status of ${name}: ${label}. Change it`}
        aria-haspopup="menu"
        aria-expanded={anchor ? true : undefined}
        aria-busy={busy || undefined}
        disabled={busy || undefined}
        onClick={(event) => {
          event.stopPropagation();
          setAnchor(event.currentTarget);
        }}
      />
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {JOB_APPLICATION_STATUS.entries.map((status) => (
          <MenuItem
            key={status.value}
            disableRipple
            selected={status.value === value}
            onClick={(event) => {
              event.stopPropagation();
              close();
              if (status.value !== value) onChange(status.value);
            }}
          >
            {status.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/**
 * Admin → Jobs → Applications (`/admin/jobs/applications`) — §6.11.
 *
 * Everything the table does, the API does: the job filter, the status filter,
 * the search, the sort and the page are all query parameters
 * `GET /admin/job-applications` answers, so a shared link reproduces the view
 * and a desk of four hundred applications costs one page of rows (BUG-19).
 *
 * The contract has no bulk endpoint for applications (§5.14: a list, a `PATCH`
 * and a `DELETE`), so every action here is per row. A loop of single requests
 * pretending to be a bulk action would fail halfway through and leave the desk
 * guessing which half, which is the mistake prompt 22 took out of the property
 * list.
 *
 * A résumé opens in a new tab with `rel="noopener noreferrer"`: the file is on
 * Cloudinary or on somebody's Drive, and neither may be handed a reference to
 * the admin panel's window.
 */
export default function JobApplicationsPage() {
  const toast = useToast();

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
  } = useApiList(
    (query, options) =>
      careerService.adminApplicationList(sanitiseApplicationParams(query), options),
    {
      syncToUrl: true,
      paramKeys: PARAM_KEYS,
      defaults: LIST_DEFAULTS,
    }
  );

  // What the screen shows and acts on: the URL, less what it cannot honour.
  const view = useMemo(() => sanitiseApplicationParams(params), [params]);

  // An optimistic status change is shown from here until the fetch that
  // follows it answers; a refusal takes it back out.
  const [overrides, setOverrides] = useState({});
  const [busyIds, setBusyIds] = useState([]);
  // The changes whose own answer is still on its way: a list read that lands
  // first must not put their old value back.
  const inFlight = useRef(new Set());
  // The application the panel shows. It is kept here rather than looked up in
  // the page of rows, so the panel stays open when a change takes its row out
  // of the filtered list (QA-61).
  const [open, setOpen] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    setOverrides((current) => {
      const kept = Object.fromEntries(
        Object.entries(current).filter(([id]) => inFlight.current.has(id))
      );
      return Object.keys(kept).length === Object.keys(current).length ? current : kept;
    });
  }, [items]);

  const rows = useMemo(
    () =>
      items.map((item) =>
        overrides[String(item.id)] ? { ...item, ...overrides[String(item.id)] } : item
      ),
    [items, overrides]
  );

  // The row when the page holds it — the freshest copy — else what was opened.
  const openApplication = useMemo(() => {
    if (!open) return null;
    return rows.find((row) => String(row.id) === String(open.id)) ?? open;
  }, [rows, open]);

  const patch = useCallback(
    async (row, changes, message) => {
      const id = String(row.id);
      setOverrides((current) => ({ ...current, [id]: { ...current[id], ...changes } }));
      setBusyIds((current) => [...current, id]);
      inFlight.current.add(id);

      try {
        await careerService.patchApplication(row.id, changes);
        setOpen((current) =>
          current && String(current.id) === id ? { ...current, ...changes } : current
        );
        toast.success(message);
        // The desk is read again: an application moved to "Hired" under
        // "Status: Interview" stayed in that list, and the count did not move
        // (QA-61, QA-59's rule for the master-data switches).
        refetch();
        return true;
      } catch (thrown) {
        setOverrides((current) => {
          const { [id]: _reverted, ...rest } = current;
          return rest;
        });
        if (thrown?.status === 404) {
          toast.error(TOASTS.gone(`The application from “${row.name}”`));
          setOpen((current) => (current && String(current.id) === id ? null : current));
          refetch();
        } else {
          toast.error(firstFieldMessage(thrown, 'The change could not be saved.'));
        }
        return false;
      } finally {
        inFlight.current.delete(id);
        setBusyIds((current) => current.filter((entry) => entry !== id));
      }
    },
    [toast, refetch]
  );

  const changeStatus = useCallback(
    (row, status) =>
      patch(row, { status }, `“${row.name}” moved to ${JOB_APPLICATION_STATUS.labelOf(status)}.`),
    [patch]
  );

  /**
   * After a delete: the page before when this one has just been emptied —
   * "Page 2 of 1 — no rows on this page" with no way back (QA-61, QA-56's rule
   * for pages).
   */
  const finishRemoval = (row) => {
    if (open && String(open.id) === String(row.id)) setOpen(null);
    setDeleting(null);
    const page = Number(view.page) || 1;
    if (page > 1 && rows.length <= 1) setPage(page - 1);
    else refetch();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await careerService.removeApplication(deleting.id);
      toast.success(TOASTS.deleted(`The application from “${deleting.name}”`));
      finishRemoval(deleting);
    } catch (thrown) {
      // Deleted elsewhere: what was asked for has happened (QA-61).
      if (thrown?.status === 404) {
        toast.info(TOASTS.alreadyDeleted(`The application from “${deleting.name}”`));
        finishRemoval(deleting);
        return;
      }
      toast.error(firstFieldMessage(thrown, 'The application could not be deleted.'));
      // A refusal will not become an acceptance on a second press.
      if (thrown?.status >= 400 && thrown?.status < 500) setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  /* ---------------- table ---------------- */

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Candidate',
        sortable: true,
        primary: true,
        render: (row) => (
          <span className={styles.nameCell}>
            <span className={styles.name}>{row.name}</span>
            <span className={styles.hint}>
              {[row.email, row.phone].filter(Boolean).join(' · ')}
            </span>
          </span>
        ),
      },
      {
        key: 'job',
        label: 'Role',
        mobile: true,
        render: (row) => (
          <span className={styles.text}>{row.job?.title ?? `Job #${row.jobId}`}</span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        width: '150px',
        mobile: true,
        render: (row) => (
          <ApplicationStatusMenu
            value={row.status}
            name={row.name}
            busy={busyIds.includes(String(row.id))}
            onChange={(status) => changeStatus(row, status)}
          />
        ),
      },
      {
        key: 'resumeUrl',
        label: 'Résumé',
        width: '110px',
        align: 'center',
        render: (row) =>
          row.resumeUrl ? (
            <a
              href={row.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.externalLink}
              aria-label={`Open the résumé of ${row.name} in a new tab`}
              onClick={(event) => event.stopPropagation()}
            >
              <Icon icon="mdi:file-document-outline" width="18" height="18" aria-hidden="true" />
              Open
            </a>
          ) : (
            <span className={styles.hint}>—</span>
          ),
      },
      {
        key: 'linkedinUrl',
        label: 'LinkedIn',
        width: '110px',
        align: 'center',
        hideBelow: 'lg',
        mobile: false,
        render: (row) =>
          row.linkedinUrl ? (
            <a
              href={row.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.externalLink}
              aria-label={`Open the LinkedIn profile of ${row.name} in a new tab`}
              onClick={(event) => event.stopPropagation()}
            >
              <Icon icon="mdi:linkedin" width="18" height="18" aria-hidden="true" />
              Profile
            </a>
          ) : (
            <span className={styles.hint}>—</span>
          ),
      },
      {
        key: 'createdAt',
        label: 'Applied',
        sortable: true,
        width: '130px',
        hideBelow: 'md',
        mobile: false,
        render: (row) => formatRelative(row.createdAt),
      },
    ],
    [busyIds, changeStatus]
  );

  const rowActions = useCallback((row) => {
    const actions = [
      {
        key: 'open',
        label: 'Open',
        icon: 'mdi:eye-outline',
        onClick: () => setOpen(row),
      },
    ];

    if (row.resumeUrl) {
      actions.push({
        key: 'resume',
        label: 'Open the résumé',
        icon: 'mdi:file-document-outline',
        href: row.resumeUrl,
      });
    }

    actions.push({
      key: 'delete',
      label: 'Delete',
      icon: 'mdi:delete-outline',
      danger: true,
      onClick: () => setDeleting(row),
    });

    return actions;
  }, []);

  /* ---------------- the role filter ---------------- */

  const jobId = view.jobId;

  // An application row carries its job, so the picker can usually name the
  // one the URL filters by without a request of its own. When the page holds
  // no such row — the role has no applications yet, or the other filters leave
  // none — the opening is read once, so the filter says "Property Analyst"
  // rather than nothing at all (QA-61, QA-53's rule for the lead list).
  const pageJobs = useMemo(() => items.map((item) => item.job).filter(Boolean), [items]);
  const onPage = pageJobs.some((job) => String(job.id) === String(jobId));

  const { data: filteredJob } = useApi(
    (signal) => careerService.adminJobGet(jobId, { signal }),
    [jobId ?? null],
    { enabled: Boolean(jobId) && !loading && !onPage }
  );

  const knownJobs = useMemo(
    () => (filteredJob ? [...pageJobs, filteredJob] : pageJobs),
    [pageJobs, filteredJob]
  );

  // One identity for the life of the screen: the picker searches again when it
  // changes, and a new arrow on every render asked the API after every
  // re-render of the desk (QA-61).
  const searchJobs = useCallback(
    (query, options) => careerService.adminJobList(query, options),
    []
  );

  const filterFields = useMemo(
    () => [
      { key: 'q', type: 'search', label: 'Search', placeholder: 'Name, e-mail or phone' },
      {
        key: 'jobId',
        type: 'custom',
        label: 'Role',
        width: '260px',
        render: ({ values, onChange, labelClassName, fieldClassName }) => (
          <EntityPicker
            label="Role"
            labelClassName={labelClassName}
            fieldClassName={fieldClassName}
            placeholder="Search openings…"
            multiple={false}
            // The choice is the filter bar's chip, not a second chip under the
            // box that put the row out of line (QA-61, QA-53).
            showChosen={false}
            labelKey="title"
            value={values.jobId ?? null}
            selectedRecords={knownJobs}
            fetcher={searchJobs}
            onChange={(value) => onChange({ jobId: value ? String(value) : undefined })}
          />
        ),
        // Without a chip the role filter counted as no filter: no Reset, and on
        // a phone the desk was filtered with nothing on screen saying so.
        chipLabel: (values) =>
          `Role: ${
            knownJobs.find((job) => String(job.id) === String(values.jobId))?.title ??
            `#${values.jobId}`
          }`,
      },
      STATUS_FILTER,
    ],
    [knownJobs, searchJobs]
  );

  const filtered = FILTER_KEYS.some((key) => {
    const value = view[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });

  const emptyState = useMemo(() => {
    if (view.page > 1) {
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
        title: 'No applications match',
        text: 'Nothing on the desk answers every filter you have set.',
        action: (
          <Button variant="outline" onClick={resetFilters}>
            {TABLES.resetFilters}
          </Button>
        ),
      };
    }

    return {
      title: 'No applications yet',
      text: 'Every application sent through a job page arrives here, with the résumé attached.',
    };
  }, [view.page, filtered, setPage, resetFilters]);

  return (
    <>
      <PageHeader
        title="Job applications"
        count={meta?.total}
        subtitle="Everybody who has applied through a job page, and where each of them stands."
      />

      <div className={styles.screen}>
        <FilterBar
          fields={filterFields}
          values={view}
          onChange={setFilters}
          onReset={resetFilters}
        />

        <DataTable
          caption="Job applications"
          columns={columns}
          rows={rows}
          meta={meta}
          loading={loading}
          error={error}
          onRetry={refetch}
          sort={{ field: view.sort, order: view.order }}
          onSortChange={(next) => setSort(next.field, next.order)}
          onPageChange={setPage}
          onPerPageChange={(perPage) => setFilters({ perPage })}
          onRowClick={(row) => setOpen(row)}
          rowActions={rowActions}
          rowActionsMenu
          rowActionsLabel={(row) => `Actions for ${row.name}`}
          rowHighlight={(row) => row.status === 'new'}
          emptyState={emptyState}
        />
      </div>

      <ApplicationDrawer
        application={openApplication}
        busy={Boolean(openApplication) && busyIds.includes(String(openApplication.id))}
        onClose={() => setOpen(null)}
        onStatusChange={(status) => changeStatus(openApplication, status)}
        onNotesChange={(notes) => patch(openApplication, { notes }, 'The notes were saved.')}
        onDelete={() => setDeleting(openApplication)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this application?"
        message={
          deleting
            ? `The application from “${deleting.name}” will be deleted, with the note attached to it. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        danger
        loading={deleteBusy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
