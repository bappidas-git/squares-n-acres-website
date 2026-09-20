import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import ApplicationDrawer from './ApplicationDrawer';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import DataTable, { DEFAULT_PER_PAGE } from '../../../components/admin/DataTable';
import EntityPicker from '../../../components/admin/EntityPicker';
import FilterBar from '../../../components/admin/FilterBar';
import PageHeader from '../../../components/admin/PageHeader';
import StatusChip from '../../../components/admin/StatusChip';
import careerService from '../../../services/careerService';
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
  } = useApiList((query, options) => careerService.adminApplicationList(query, options), {
    syncToUrl: true,
    paramKeys: PARAM_KEYS,
    defaults: LIST_DEFAULTS,
  });

  // An optimistic status change is shown from here until the fetch that
  // follows it answers with the same thing; a refusal takes it back out.
  const [overrides, setOverrides] = useState({});
  const [busyIds, setBusyIds] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    setOverrides({});
  }, [items]);

  const rows = useMemo(
    () =>
      items.map((item) =>
        overrides[String(item.id)] ? { ...item, ...overrides[String(item.id)] } : item
      ),
    [items, overrides]
  );

  const openApplication = useMemo(
    () => rows.find((row) => String(row.id) === String(openId)) ?? null,
    [rows, openId]
  );

  const patch = useCallback(
    async (row, changes, message) => {
      const id = String(row.id);
      setOverrides((current) => ({ ...current, [id]: { ...current[id], ...changes } }));
      setBusyIds((current) => [...current, id]);

      try {
        await careerService.patchApplication(row.id, changes);
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
      patch(row, { status }, `“${row.name}” is now ${JOB_APPLICATION_STATUS.labelOf(status)}.`),
    [patch]
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await careerService.removeApplication(deleting.id);
      toast.success(TOASTS.deleted(`The application from “${deleting.name}”`));
      if (String(openId) === String(deleting.id)) setOpenId(null);
      setDeleting(null);
      refetch();
    } catch (thrown) {
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
        render: (row) => row.job?.title ?? `Job #${row.jobId}`,
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
        onClick: () => setOpenId(row.id),
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

  // An application row carries its job, so the picker can name the one the URL
  // filters by without a request of its own.
  const knownJobs = useMemo(() => items.map((item) => item.job).filter(Boolean), [items]);

  const filterFields = useMemo(
    () => [
      { key: 'q', type: 'search', label: 'Search', placeholder: 'Name, e-mail or phone' },
      {
        key: 'jobId',
        type: 'custom',
        label: 'Role',
        render: ({ values, onChange, labelClassName, fieldClassName }) => (
          <EntityPicker
            label="Role"
            labelClassName={labelClassName}
            fieldClassName={fieldClassName}
            placeholder="Search openings…"
            multiple={false}
            labelKey="title"
            value={values.jobId ?? null}
            selectedRecords={knownJobs}
            fetcher={(query, options) => careerService.adminJobList(query, options)}
            onChange={(value) => onChange({ jobId: value ? String(value) : undefined })}
          />
        ),
      },
      {
        key: 'status',
        type: 'multiselect',
        label: 'Status',
        placeholder: 'Any status',
        options: JOB_APPLICATION_STATUS.options,
      },
    ],
    [knownJobs]
  );

  const filtered = FILTER_KEYS.some((key) => {
    const value = params[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });

  const emptyState = useMemo(() => {
    if (params.page > 1) {
      return {
        title: TABLES.emptyPage,
        text: TABLES.emptyPageText,
      };
    }

    if (filtered) {
      return {
        title: 'No applications match',
        text: 'Nothing on the desk answers every filter you have set.',
      };
    }

    return {
      title: 'No applications yet',
      text: 'Every application sent through a job page arrives here, with the résumé attached.',
    };
  }, [params.page, filtered]);

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
          values={params}
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
          sort={{ field: params.sort, order: params.order }}
          onSortChange={(next) => setSort(next.field, next.order)}
          onPageChange={setPage}
          onPerPageChange={(perPage) => setFilters({ perPage })}
          onRowClick={(row) => setOpenId(row.id)}
          rowActions={rowActions}
          rowActionsMenu
          rowActionsLabel={(row) => `Actions for ${row.name}`}
          rowHighlight={(row) => row.status === 'new'}
          emptyState={emptyState}
        />
      </div>

      <ApplicationDrawer
        application={openApplication}
        busy={busyIds.includes(String(openId))}
        onClose={() => setOpenId(null)}
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
