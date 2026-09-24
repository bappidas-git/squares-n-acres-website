import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Chip from '../../../components/ui/Chip';
import MasterDataPage from '../../../components/admin/MasterDataPage';
import PATHS from '../../../routes/paths';
import careerService from '../../../services/careerService';
import useApi from '../../../hooks/useApi';
import { EMPLOYMENT_TYPES } from '../../../config/enums';
import { formatDate, formatNumber, istToday } from '../../../utils/format';

import styles from './contentConfigs.module.css';

/** The careers endpoints in the shape `MasterDataPage` expects a service. */
const jobsService = {
  list: (params, opts) => careerService.adminJobList(params, opts),
  get: (id, opts) => careerService.adminJobGet(id, opts),
  create: (body, opts) => careerService.createJob(body, opts),
  update: (id, body, opts) => careerService.updateJob(id, body, opts),
  patch: (id, body, opts) => careerService.patchJob(id, body, opts),
  remove: (id, opts) => careerService.removeJob(id, opts),
  bulk: (body, opts) => careerService.bulkJobs(body, opts),
  checkSlug: (slug, { excludeId, signal } = {}) =>
    careerService.checkJobSlug({ slug, excludeId }, { signal }),
};

/** The departments the openings actually use, for the filter's choices. */
const departmentsOf = (jobs) =>
  [...new Set((jobs ?? []).map((job) => job.department).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({ value: name, label: name }));

/**
 * Whether an opening's closing day has passed — in IST, as the API reads it
 * (D22). Such an opening is off /careers and takes no applications, and the
 * table said nothing of it: an active opening with a date in the Closes column
 * (QA-61).
 *
 * @param {object} row
 * @param {string} [today] `yyyy-mm-dd`
 * @returns {boolean}
 */
export const hasClosed = (row, today = istToday()) =>
  Boolean(row?.closesAt) && String(row.closesAt).slice(0, 10) < today;

/**
 * Admin → Jobs (`/admin/jobs`) — the openings `/careers` lists (§6.11).
 *
 * A posting is a record with a page of its own, so it is edited on a page of
 * its own, with an address: `/admin/jobs/add` and `/admin/jobs/edit/:id`
 * (`JobFormPage`, QA-61). It used to be edited in place of this list, on this
 * list's address, which Back, a reload and the sidebar all lost.
 *
 * The Applications column is a link, not a number: the reason to look at a
 * posting in this table is usually to read what came back from it, and the
 * count is the `applicationCount` the API computes on admin reads (§5.14).
 *
 * Deleting a posting that still has applications is refused by the API with a
 * 409 listing them (D88); `MasterDataPage` renders that list rather than a
 * toast, and says what to do instead — switch the opening off, which keeps its
 * applications on the desk.
 */
export default function JobsPage() {
  const navigate = useNavigate();

  // The filter's departments are whatever the openings say they are. They are
  // re-read after every write, so a department switched or deleted away leaves
  // the filter without a reload.
  const [version, setVersion] = useState(0);
  // Until the first answer the filter has no departments to judge the URL's
  // by, and says so: `?department=Sales` is asked for as it stands rather than
  // dropped as unknown (QA-61).
  const [departmentsKnown, setDepartmentsKnown] = useState(false);
  const { data: allJobs } = useApi(
    (signal) => careerService.adminJobList({ perPage: 'all' }, { signal }),
    [version],
    { initialData: [], keepPreviousData: true, onSuccess: () => setDepartmentsKnown(true) }
  );

  const onMutated = useCallback(() => setVersion((current) => current + 1), []);
  const departments = useMemo(() => departmentsOf(allJobs), [allJobs]);

  const config = useMemo(
    () => ({
      key: 'jobs',
      title: 'Jobs',
      subtitle: 'The openings /careers lists, and the roles applications arrive against.',
      singular: 'opening',
      // "2 jobs will be deleted" under "Delete the selected openings?" (QA-61).
      plural: 'openings',
      service: jobsService,
      onMutated,
      onCreate: () => navigate(PATHS.adminJobNew),
      onEdit: (row) => navigate(PATHS.adminJobEdit(row.id)),
      defaultSort: { field: 'postedAt', order: 'desc' },
      activeToggle: true,
      usageGuard: true,
      // Four actions in a row of icons left the Role column a word wide, and
      // a title ran to four lines at 1 440 px (QA-61).
      rowActionsMenu: true,
      guardHint: {
        one: 'An opening keeps the applications it has received. To take it down, switch it off instead: it leaves /careers and stops taking applications, and its applications stay on the desk.',
        many: 'Untick these to delete the rest, or switch them off instead — an opening keeps the applications it has received.',
      },

      columns: [
        {
          key: 'title',
          label: 'Role',
          sortable: true,
          primary: true,
          render: (row) => (
            <span className={styles.nameCell}>
              <span className={styles.name}>{row.title}</span>
              <span className={styles.hint}>/careers/{row.slug}</span>
              {/* In the cell every width shows, a phone's card included: the
                  opening is off /careers and takes no applications (QA-61). */}
              {row.isActive !== false && hasClosed(row) ? (
                <Chip tone="neutral">Closed {formatDate(row.closesAt)}</Chip>
              ) : null}
            </span>
          ),
        },
        {
          key: 'department',
          label: 'Department',
          sortable: true,
          mobile: true,
          width: '150px',
          render: (row) => <span className={styles.text}>{row.department || '—'}</span>,
        },
        {
          key: 'location',
          label: 'Location',
          // Eight columns and the row's menu left the role a word wide at
          // 1 440 px (QA-61); the role is what the row is read for.
          hideBelow: 'xl',
          mobile: false,
          render: (row) => <span className={styles.text}>{row.location || '—'}</span>,
        },
        {
          key: 'employmentType',
          label: 'Type',
          width: '140px',
          // A card has room for three: the department, the applications and
          // the Active switch come before the type.
          mobile: false,
          render: (row) =>
            row.employmentType ? (
              <Chip tone="info">{EMPLOYMENT_TYPES.labelOf(row.employmentType)}</Chip>
            ) : (
              '—'
            ),
        },
        {
          key: 'applicationCount',
          label: 'Applications',
          align: 'right',
          width: '120px',
          // The count is what the phone's card is looked at for as well: it was
          // left off it (QA-61).
          mobile: true,
          render: (row) =>
            row.applicationCount > 0 ? (
              <Link
                to={`${PATHS.adminJobApplications}?jobId=${row.id}`}
                className={styles.countLink}
                aria-label={`${formatNumber(row.applicationCount)} ${
                  row.applicationCount === 1 ? 'application' : 'applications'
                } for ${row.title}`}
                onClick={(event) => event.stopPropagation()}
              >
                {formatNumber(row.applicationCount)}
              </Link>
            ) : (
              <span className={styles.hint}>0</span>
            ),
        },
        {
          key: 'postedAt',
          label: 'Posted',
          sortable: true,
          width: '130px',
          hideBelow: 'md',
          mobile: false,
          render: (row) => (row.postedAt ? formatDate(row.postedAt) : '—'),
        },
        {
          key: 'closesAt',
          label: 'Closes',
          width: '130px',
          hideBelow: 'xl',
          mobile: false,
          render: (row) => (row.closesAt ? formatDate(row.closesAt) : 'Open-ended'),
        },
      ],

      filters: [
        { key: 'q', type: 'search', label: 'Search', placeholder: 'Role, department or location' },
        {
          key: 'department',
          type: 'select',
          label: 'Department',
          placeholder: 'All departments',
          options: departmentsKnown ? departments : null,
        },
        {
          key: 'employmentType',
          type: 'select',
          label: 'Type',
          placeholder: 'All types',
          options: EMPLOYMENT_TYPES.options,
        },
        {
          key: 'isActive',
          type: 'toggle',
          label: 'Status',
          trueLabel: 'Active',
          falseLabel: 'Inactive',
          placeholder: 'Any status',
        },
      ],

      bulkActions: [
        { key: 'activate', label: 'Activate', icon: 'mdi:eye-outline' },
        { key: 'deactivate', label: 'Deactivate', icon: 'mdi:eye-off-outline' },
        {
          key: 'delete',
          label: 'Delete',
          icon: 'mdi:delete-outline',
          danger: true,
          confirm: {
            title: 'Delete the selected openings?',
            // "One that has already received applications is refused." — the
            // API refuses the whole batch, not the one (QA-61, QA-59's rule).
            message:
              '{count} will be deleted. If any of them has received applications, none is deleted and you are told which. This cannot be undone.',
          },
        },
      ],

      extraRowActions: (row) => [
        {
          key: 'applications',
          label: `Applications for ${row.title}`,
          icon: 'mdi:account-multiple-outline',
          to: `${PATHS.adminJobApplications}?jobId=${row.id}`,
        },
        // Only a live opening has a page: a switched-off one answers 404
        // (QA-61, QA-60's rule for localities and developers).
        ...(row.isActive !== false && row.slug
          ? [
              {
                key: 'view',
                label: `View ${row.title} on the site`,
                icon: 'mdi:open-in-new',
                href: PATHS.job(row.slug),
              },
            ]
          : []),
      ],

      emptyState: {
        title: 'No openings yet',
        text: 'Add a role and it appears on /careers with a page of its own that people can apply through.',
      },
    }),
    [departments, departmentsKnown, onMutated, navigate]
  );

  return <MasterDataPage config={config} />;
}
