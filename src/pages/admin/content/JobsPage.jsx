import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Chip from '../../../components/ui/Chip';
import MasterDataPage from '../../../components/admin/MasterDataPage';
import PATHS from '../../../routes/paths';
import careerService from '../../../services/careerService';
import useApi from '../../../hooks/useApi';
import { EMPLOYMENT_TYPES } from '../../../config/enums';
import { formatDate, formatNumber } from '../../../utils/format';
import { schemas } from '../../../services/schemas';

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

/** Today, as the `date` input writes it. */
const today = () => new Date().toISOString().slice(0, 10);

/** `''` is not a date the API can store; an absent answer is `null` (NEW-31). */
const blankToNull = (value) => {
  const text = typeof value === 'string' ? value.trim() : value;
  return text === '' || text === undefined ? null : text;
};

/** The departments the openings actually use, for the filter's choices. */
const departmentsOf = (jobs) =>
  [...new Set((jobs ?? []).map((job) => job.department).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({ value: name, label: name }));

/**
 * Admin → Jobs (`/admin/jobs`) — the openings `/careers` lists (§6.11).
 *
 * A posting is a record with a page of its own, so the form is a screen rather
 * than a dialog (`formMode: 'page'`): a description, two ordered lists and the
 * dates an opening runs between do not fit in a modal, and the same argument
 * that gave localities and developers their own form applies here.
 *
 * The Applications column is a link, not a number: the reason to look at a
 * posting in this table is usually to read what came back from it, and the
 * count is the `applicationCount` the API computes on admin reads (§5.14).
 *
 * Deleting a posting that still has applications is refused by the API with a
 * 409 listing them (D88); `MasterDataPage` renders that list rather than a
 * toast, because "unlink these first" is an instruction, not an error.
 */
export default function JobsPage() {
  // The filter's departments are whatever the openings say they are. They are
  // re-read after every write, so a department invented in the form is offered
  // by the filter without a reload.
  const [version, setVersion] = useState(0);
  const { data: allJobs } = useApi(
    (signal) => careerService.adminJobList({ perPage: 'all' }, { signal }),
    [version],
    { initialData: [], keepPreviousData: true }
  );

  const onMutated = useCallback(() => setVersion((current) => current + 1), []);
  const departments = useMemo(() => departmentsOf(allJobs), [allJobs]);

  const config = useMemo(
    () => ({
      key: 'jobs',
      title: 'Jobs',
      subtitle: 'The openings /careers lists, and the roles applications arrive against.',
      singular: 'opening',
      service: jobsService,
      onMutated,
      schema: schemas['job.update'],
      createSchema: schemas['job.create'],
      formMode: 'page',
      defaultSort: { field: 'postedAt', order: 'desc' },
      activeToggle: true,
      usageGuard: true,
      slugBase: '/careers/',

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
            </span>
          ),
        },
        {
          key: 'department',
          label: 'Department',
          sortable: true,
          mobile: true,
          width: '150px',
          render: (row) => row.department || '—',
        },
        {
          key: 'location',
          label: 'Location',
          hideBelow: 'lg',
          mobile: false,
          render: (row) => row.location || '—',
        },
        {
          key: 'employmentType',
          label: 'Type',
          width: '140px',
          mobile: true,
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
          width: '130px',
          render: (row) =>
            row.applicationCount > 0 ? (
              <Link
                to={`${PATHS.adminJobApplications}?jobId=${row.id}`}
                className={styles.countLink}
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
          hideBelow: 'lg',
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
          options: departments,
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
            message:
              '{count} will be deleted. One that has already received applications is refused. This cannot be undone.',
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
        {
          key: 'view',
          label: `View ${row.title} on the site`,
          icon: 'mdi:open-in-new',
          href: PATHS.job(row.slug),
        },
      ],

      formFields: [
        { name: 'title', type: 'text', label: 'Role title', required: true, half: true },
        {
          name: 'slug',
          type: 'slug',
          label: 'URL',
          source: 'title',
          half: true,
          base: '/careers/',
        },
        {
          name: 'department',
          type: 'text',
          label: 'Department',
          required: true,
          half: true,
          hint: 'Sales, Marketing, Research — whatever the team is called internally.',
        },
        {
          name: 'location',
          type: 'text',
          label: 'Location',
          required: true,
          half: true,
          hint: 'Where the role is based. "Bengaluru, Karnataka" or "Remote".',
        },
        {
          name: 'employmentType',
          type: 'select',
          label: 'Employment type',
          required: true,
          options: EMPLOYMENT_TYPES.options,
          half: true,
        },
        {
          name: 'experience',
          type: 'text',
          label: 'Experience',
          half: true,
          hint: 'Optional, as a range — "2–5 years".',
        },
        {
          name: 'description',
          type: 'richtext',
          label: 'About the role',
          required: true,
          variant: 'full',
          minHeight: 280,
          hint: 'What the role is and who it suits. The bullet lists below come after it.',
        },
        {
          name: 'responsibilities',
          type: 'list',
          label: 'Responsibilities',
          singular: 'responsibility',
          addLabel: 'Add responsibility',
          hint: 'One line each, in the order they matter. Drag, or press Alt + ↑ / ↓, to reorder.',
        },
        {
          name: 'requirements',
          type: 'list',
          label: 'Requirements',
          singular: 'requirement',
          addLabel: 'Add requirement',
          hint: 'What somebody needs to bring. One line each.',
        },
        {
          name: 'salaryRange',
          type: 'text',
          label: 'Compensation',
          half: true,
          hint: 'Optional, and shown to applicants exactly as written.',
        },
        { name: 'isActive', type: 'switch', label: 'Active', half: true },
        {
          name: 'postedAt',
          type: 'date',
          label: 'Posted on',
          half: true,
          hint: 'The date the list sorts by.',
        },
        {
          name: 'closesAt',
          type: 'date',
          label: 'Applications close',
          half: true,
          hint: 'Optional. On the day after this one the role stops accepting applications.',
        },
      ],

      newValues: {
        employmentType: 'full-time',
        responsibilities: [],
        requirements: [],
        isActive: true,
        postedAt: today(),
        closesAt: null,
      },

      toPayload: (values) => ({
        ...values,
        experience: blankToNull(values.experience),
        salaryRange: blankToNull(values.salaryRange),
        postedAt: blankToNull(values.postedAt),
        closesAt: blankToNull(values.closesAt),
        responsibilities: (values.responsibilities ?? []).map((row) => row.trim()).filter(Boolean),
        requirements: (values.requirements ?? []).map((row) => row.trim()).filter(Boolean),
      }),

      /** The one rule the storage contract has no opinion about. */
      validate: (values) => {
        const errors = {};
        const posted = blankToNull(values.postedAt);
        const closes = blankToNull(values.closesAt);

        if (posted && closes && closes < posted) {
          errors.closesAt = 'An opening cannot close before it was posted.';
        }

        return errors;
      },

      emptyState: {
        title: 'No openings yet',
        text: 'Add a role and it appears on /careers with a page of its own that people can apply through.',
      },
    }),
    [departments, onMutated]
  );

  return <MasterDataPage config={config} />;
}
