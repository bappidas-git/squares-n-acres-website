import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import ApiError from '../../../services/apiError';
import PATHS from '../../../routes/paths';
import careerService from '../../../services/careerService';
import useApi from '../../../hooks/useApi';
import useForm from '../../../hooks/useForm';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';
import MovedNotice from '../master-data/MovedNotice';
import useRecordPage from '../master-data/useRecordPage';
import withSlugSuggestion from '../../../components/admin/slugSuggestion';
// The kit is imported file by file, in the order `MasterDataPage` reaches for
// the same components, as the developer and locality forms do: webpack must
// give the extracted CSS one order across the admin chunks.
import { FormFieldControl } from '../../../components/admin/MasterDataForm';
import FormSection, { FormColumn } from '../../../components/admin/FormSection';
import PageHeader from '../../../components/admin/PageHeader';
import { Button, ErrorState, Skeleton, TextField } from '../../../components/ui';
import { EMPLOYMENT_TYPES } from '../../../config/enums';
import { TOASTS } from '../../../config/adminCopy';
import { istToday } from '../../../utils/format';
import { schemas } from '../../../services/schemas';

import styles from './JobFormPage.module.css';

/** A new opening, at the values its controls read as empty. */
const BLANK = {
  title: '',
  slug: '',
  department: '',
  location: '',
  employmentType: 'full-time',
  experience: '',
  description: '',
  responsibilities: [],
  requirements: [],
  salaryRange: '',
  isActive: true,
  postedAt: null,
  closesAt: null,
};

/** The record, reduced to what this form edits. */
const toFormValues = (record) => ({
  title: record.title ?? '',
  slug: record.slug ?? '',
  department: record.department ?? '',
  location: record.location ?? '',
  employmentType: record.employmentType ?? 'full-time',
  experience: record.experience ?? '',
  description: record.description ?? '',
  responsibilities: Array.isArray(record.responsibilities) ? record.responsibilities : [],
  requirements: Array.isArray(record.requirements) ? record.requirements : [],
  salaryRange: record.salaryRange ?? '',
  isActive: record.isActive !== false,
  postedAt: record.postedAt ?? null,
  closesAt: record.closesAt ?? null,
});

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * The body the API receives: text without the spaces a paste leaves around
 * it, an optional box emptied as `null` rather than `''` (NEW-31), and the two
 * lists without their empty rows. `PUT` replaces the record whole (§5.8), and
 * this is the whole of it.
 */
export const toJobPayload = (values) => ({
  title: trimmed(values.title),
  slug: values.slug ?? '',
  department: trimmed(values.department),
  location: trimmed(values.location),
  employmentType: values.employmentType,
  experience: trimmed(values.experience) || null,
  description: values.description ?? '',
  responsibilities: (values.responsibilities ?? []).map(trimmed).filter(Boolean),
  requirements: (values.requirements ?? []).map(trimmed).filter(Boolean),
  salaryRange: trimmed(values.salaryRange) || null,
  isActive: values.isActive !== false,
  postedAt: values.postedAt || null,
  closesAt: values.closesAt || null,
});

/** The text of the description, without its markup. */
const textOf = (html) =>
  String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .trim();

/**
 * The rules the storage contract has no opinion about.
 *
 * @param {object} values
 * @returns {Record<string, string>}
 */
export function jobRules(values) {
  const errors = {};
  const posted = values.postedAt || null;
  const closes = values.closesAt || null;
  if (posted && closes && closes < posted) {
    errors.closesAt = 'An opening cannot close before it was posted.';
  }
  // An emptied editor keeps its markup — `<p></p>` — which `required` reads as
  // a description, and the page printed "About the role" over nothing.
  if (trimmed(values.description) !== '' && textOf(values.description) === '') {
    errors.description = 'Say what the role is: the description has no text in it.';
  }
  return errors;
}

/**
 * What a message calls a field, rather than its key: "The description field is
 * required." under a box called "About the role" (QA-61).
 */
const LABELS = {
  title: 'role title',
  slug: 'URL',
  description: 'role description',
  employmentType: 'employment type',
  salaryRange: 'compensation',
  postedAt: 'posting date',
  closesAt: 'closing date',
};

/**
 * `SlugField`'s availability check, in the shape it hands over. Module level
 * so its identity is stable: the field debounces on it.
 */
const checkJobSlug = (slug, { excludeId, signal } = {}) =>
  careerService.checkJobSlug({ slug, excludeId }, { signal });

/** The departments the openings already use, for the box's suggestions. */
const departmentsOf = (jobs) =>
  [...new Set((Array.isArray(jobs) ? jobs : []).map((job) => job.department).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right)
  );

/**
 * Admin → Jobs → add / edit (`/admin/jobs/add`, `/admin/jobs/edit/:id`).
 *
 * An opening is a page of its own — a description, two ordered lists and the
 * dates it runs between — and until QA-61 it was edited in place of the list,
 * on the list's own address: Back from it left the Jobs screen altogether, a
 * reload dropped it, the sidebar's "Jobs" did nothing while it was open, and
 * an opening could not be linked to. It has an address now, and what the
 * developer and locality forms do (`useRecordPage`, QA-60): it saves in place,
 * says when there is nothing to save, keeps a Save within reach at the foot of
 * the page, and — when a live opening's URL changes — offers to send its old
 * address on, which job boards and shared links still point at.
 */
export default function JobFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const formRef = useRef(null);
  const departmentsId = useId();
  // Set when a save finds the opening deleted elsewhere: there is nothing left
  // to edit, and nothing to guard.
  const [gone, setGone] = useState(false);

  const {
    data: record,
    loading,
    error,
    refetch,
    setData: setRecord,
  } = useApi((signal) => careerService.adminJobGet(id, { signal }), [id], { enabled: isEdit });

  // The departments the other openings use, offered as the box is typed in:
  // "Sales" and "sales " were two departments to the filter (QA-61).
  const { data: allJobs } = useApi(
    (signal) => careerService.adminJobList({ perPage: 'all' }, { signal }),
    [],
    { initialData: [] }
  );
  const departments = useMemo(() => departmentsOf(allJobs), [allJobs]);

  // Posted today — Bengaluru's today (QA-61).
  const [blank] = useState(() => ({ ...BLANK, postedAt: istToday() }));

  const form = useForm({
    initialValues: blank,
    schema: isEdit ? schemas['job.update'] : schemas['job.create'],
    normalize: toJobPayload,
    labels: LABELS,
    validate: jobRules,
    onSubmit: async (payload) => {
      try {
        const envelope = isEdit
          ? await careerService.updateJob(id, payload)
          : await careerService.createJob(payload);
        return envelope?.data ?? null;
      } catch (thrown) {
        if (isEdit && thrown?.status === 404) {
          setGone(true);
          throw new ApiError({ status: 404, message: TOASTS.gone('This opening') });
        }
        throw await withSlugSuggestion(thrown, payload.slug, {
          checkSlug: checkJobSlug,
          excludeId: id ?? null,
        });
      }
    },
  });

  const { reset, values, setField } = form;

  // A loaded record becomes the form and its baseline, so an untouched form is
  // never reported as dirty. A saved one does the same, from the API's answer.
  useEffect(() => {
    if (!record) return;
    reset(toFormValues(record));
  }, [record, reset]);

  useUnsavedChanges(form.dirty && !gone);

  const { save, slugMoved, liveSlug, canRedirect, redirectOld, setRedirectOld } = useRecordPage({
    entityType: null,
    noun: 'Opening',
    labelField: 'title',
    section: 'Jobs',
    isEdit,
    record,
    setRecord,
    form,
    publicPath: PATHS.job,
    editPath: PATHS.adminJobEdit,
    formRef,
  });

  const title = isEdit ? (record?.title ?? 'Edit opening') : 'New opening';
  const breadcrumbs = [{ label: 'Jobs', to: PATHS.adminJobs }, { label: title }];

  if (gone) {
    return (
      <>
        <PageHeader title="Edit opening" breadcrumbs={breadcrumbs} />
        <ErrorState
          title="This opening no longer exists"
          text="It was deleted elsewhere while this page was open, so the changes had nowhere to go."
          action={
            <Button variant="outline" to={PATHS.adminJobs}>
              Back to jobs
            </Button>
          }
        />
      </>
    );
  }

  if (isEdit && loading) {
    return (
      <>
        <PageHeader title="Edit opening" breadcrumbs={breadcrumbs} />
        <div className={styles.loading} role="status" aria-busy="true" aria-live="polite">
          <span className={styles.srOnly}>Loading the opening…</span>
          <FormSection title="The role">
            <FormColumn half>
              <Skeleton variant="rounded" height={64} />
            </FormColumn>
            <FormColumn half>
              <Skeleton variant="rounded" height={64} />
            </FormColumn>
            <FormColumn>
              <Skeleton variant="rounded" height={280} />
            </FormColumn>
          </FormSection>
        </div>
      </>
    );
  }

  if (isEdit && (error || !record)) {
    return (
      <>
        <PageHeader title="Edit opening" breadcrumbs={breadcrumbs} />
        <ErrorState
          title="We could not load this opening"
          text={error?.message}
          onRetry={refetch}
          action={
            error?.status === 404 ? (
              <Button variant="outline" to={PATHS.adminJobs}>
                Back to jobs
              </Button>
            ) : undefined
          }
        />
      </>
    );
  }

  const actions = (
    <>
      <Button variant="ghost" to={PATHS.adminJobs} disabled={form.submitting}>
        Cancel
      </Button>
      <Button variant="outline" onClick={() => save('view')} disabled={form.submitting}>
        Save &amp; view
      </Button>
      <Button onClick={() => save()} loading={form.submitting}>
        Save
      </Button>
    </>
  );

  const field = (descriptor) => (
    <FormFieldControl
      field={descriptor}
      form={form}
      disabled={form.submitting}
      checkSlug={checkJobSlug}
      excludeId={id}
    />
  );

  return (
    <>
      <PageHeader
        title={title}
        breadcrumbs={breadcrumbs}
        actions={<div className={styles.headerActions}>{actions}</div>}
      />

      <form
        ref={formRef}
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <FormSection
          title="The role"
          description="What the opening is called, where it sits and how it is employed — the lines at the top of its page on /careers."
        >
          <FormColumn half>
            {field({ name: 'title', type: 'text', label: 'Role title', required: true })}
          </FormColumn>
          <FormColumn half id="job-slug">
            {field({
              name: 'slug',
              type: 'slug',
              label: 'URL',
              source: 'title',
              base: '/careers/',
            })}
            {slugMoved ? (
              <MovedNotice
                from={PATHS.job(liveSlug)}
                canRedirect={canRedirect}
                checked={redirectOld}
                disabled={form.submitting}
                onChange={setRedirectOld}
              />
            ) : null}
          </FormColumn>

          <FormColumn half>
            <TextField
              label="Department"
              required
              list={departmentsId}
              autoComplete="off"
              maxLength={120}
              value={values.department ?? ''}
              error={form.errors.department}
              disabled={form.submitting}
              hint="Sales, Marketing, Research — pick one the other openings use, or name a new one."
              onChange={(event) => setField('department', event.target.value)}
              onBlur={() => form.handleBlur('department')}
            />
            <datalist id={departmentsId}>
              {departments.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </FormColumn>
          <FormColumn half>
            {field({
              name: 'location',
              type: 'text',
              label: 'Location',
              required: true,
              hint: 'Where the role is based. "Bengaluru, Karnataka" or "Remote".',
            })}
          </FormColumn>

          <FormColumn half>
            {field({
              name: 'employmentType',
              type: 'select',
              label: 'Employment type',
              required: true,
              options: EMPLOYMENT_TYPES.options,
            })}
          </FormColumn>
          <FormColumn half>
            {field({
              name: 'experience',
              type: 'text',
              label: 'Experience',
              hint: 'Optional, as a range — "2–5 years".',
            })}
          </FormColumn>

          <FormColumn half>
            {field({
              name: 'salaryRange',
              type: 'text',
              label: 'Compensation',
              hint: 'Optional, and shown to applicants exactly as written.',
            })}
          </FormColumn>
        </FormSection>

        <FormSection
          title="About the role"
          description="The description first, then the two lists — in the order they appear on the page."
        >
          <FormColumn>
            {field({
              name: 'description',
              type: 'richtext',
              label: 'About the role',
              required: true,
              variant: 'full',
              minHeight: 280,
              hint: 'What the role is and who it suits. The bullet lists below come after it.',
            })}
          </FormColumn>
          <FormColumn>
            {field({
              name: 'responsibilities',
              type: 'list',
              label: 'Responsibilities',
              singular: 'responsibility',
              addLabel: 'Add responsibility',
              hint: 'One line each, in the order they matter. Drag, or press Alt + ↑ / ↓, to reorder.',
            })}
          </FormColumn>
          <FormColumn>
            {field({
              name: 'requirements',
              type: 'list',
              label: 'Requirements',
              singular: 'requirement',
              addLabel: 'Add requirement',
              hint: 'What somebody needs to bring. One line each.',
            })}
          </FormColumn>
        </FormSection>

        <FormSection
          title="Publishing"
          description="Whether the opening is on /careers, and the dates it runs between."
        >
          <FormColumn>
            {field({
              name: 'isActive',
              type: 'switch',
              label: 'Active',
              hint: 'An inactive opening leaves /careers, its page answers 404, and it takes no applications.',
            })}
          </FormColumn>
          <FormColumn half>
            {field({
              name: 'postedAt',
              type: 'date',
              label: 'Posted on',
              hint: 'The date the list sorts by.',
            })}
          </FormColumn>
          <FormColumn half>
            {field({
              name: 'closesAt',
              type: 'date',
              label: 'Applications close',
              hint: 'Optional. The last day the role takes applications; after it, the opening leaves /careers.',
            })}
          </FormColumn>
        </FormSection>

        <div className={styles.actionBar}>{actions}</div>
      </form>
    </>
  );
}
