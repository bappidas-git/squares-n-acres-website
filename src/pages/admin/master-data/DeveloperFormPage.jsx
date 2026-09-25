import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useParams } from 'react-router-dom';

import PATHS from '../../../routes/paths';
import useApi from '../../../hooks/useApi';
import useForm from '../../../hooks/useForm';
import MovedNotice from './MovedNotice';
import useRecordPage from './useRecordPage';
import useRowKeys from '../../../components/admin/useRowKeys';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';
import withSlugSuggestion from '../../../components/admin/slugSuggestion';
// The kit is imported file by file, in the order `MasterDataPage` reaches for
// the same components: the barrel's own order disagrees with it, and webpack
// then cannot give the extracted CSS one order across the admin chunks.
import MultiSelect from '../../../components/admin/MultiSelect';
import { FormFieldControl } from '../../../components/admin/MasterDataForm';
import FormSection, { FormColumn } from '../../../components/admin/FormSection';
import SeoPanel from '../../../components/seo/SeoPanel';
import PageHeader from '../../../components/admin/PageHeader';
import RichTextField from '../../../components/editor/RichTextField';
import SortableList from '../../../components/admin/SortableList';
import {
  Alert,
  Button,
  ErrorState,
  IconButton,
  NumberField,
  Skeleton,
  TextField,
  TextareaField,
} from '../../../components/ui';
import { adminCrud, developers } from '../../../services/masterDataService';
import { validateSeoBranch } from '../../../components/seo/seoSideEffects';
import {
  createSeo,
  toSeoPaths,
  toSeoPayload,
  withSeoDefaults,
} from '../../../components/seo/seoValues';
import { schemas } from '../../../services/schemas';
import { URL_PATTERN } from '../../../utils/validation';
import { useMasterData } from '../../../contexts/MasterDataContext';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './DeveloperFormPage.module.css';
import { FORMS } from '../../../config/adminCopy';

const developerService = adminCrud(developers);

/** The API's cap on `shortDescription` (§6.5), shown as a live counter. */
const SHORT_DESCRIPTION_MAX = 300;

/** The window an "established" year can sensibly fall in, narrower than §6.5's. */
const EARLIEST_YEAR = 1950;
const CURRENT_YEAR = new Date().getFullYear();

/** A new developer, at the values its controls read as empty. */
const BLANK = {
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  logoUrl: '',
  coverImageUrl: '',
  establishedYear: null,
  headquarters: '',
  website: '',
  totalProjects: null,
  ongoingProjects: null,
  completedProjects: null,
  reraIds: [],
  highlights: [],
  isFeatured: false,
  isActive: true,
  order: 0,
  seo: createSeo(),
  updatedAt: null,
};

/** The record, reduced to what this form edits. */
const toFormValues = (record) => ({
  name: record.name ?? '',
  slug: record.slug ?? '',
  shortDescription: record.shortDescription ?? '',
  description: record.description ?? '',
  logoUrl: record.logoUrl ?? '',
  coverImageUrl: record.coverImageUrl ?? '',
  establishedYear: record.establishedYear ?? null,
  headquarters: record.headquarters ?? '',
  website: record.website ?? '',
  totalProjects: record.totalProjects ?? null,
  ongoingProjects: record.ongoingProjects ?? null,
  completedProjects: record.completedProjects ?? null,
  reraIds: Array.isArray(record.reraIds) ? record.reraIds : [],
  highlights: Array.isArray(record.highlights) ? record.highlights : [],
  isFeatured: Boolean(record.isFeatured),
  isActive: record.isActive !== false,
  order: record.order ?? 0,
  // Every field of §9.6 present, whatever the record was saved with.
  seo: withSeoDefaults(record.seo),
  // Read-only, never sent back: the panel prints it as "last modified".
  updatedAt: record.updatedAt ?? null,
});

const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * `SlugField`'s availability check, in the shape it hands over.
 *
 * Module level so its identity is stable: the field debounces on it, and a new
 * arrow on every render would ask the API after every keystroke of the name.
 */
const checkDeveloperSlug = (slug, { excludeId, signal } = {}) =>
  developerService.checkSlug(slug, { excludeId, signal });

/**
 * What the SEO analysers call a field, and where it is on this screen. Every
 * id names a block below: none of them used to exist, so a hint that pointed
 * at the profile, the images or the highlights did nothing when pressed (QA-60).
 */
const FIELD_TARGET = {
  content: 'developer-description',
  tableOfContents: 'developer-description',
  images: 'developer-images',
  highlights: 'developer-highlights',
  slug: 'developer-slug',
};

/**
 * What a message calls a field whose key is not a word (QA-60): "The
 * totalProjects must be at least 0." reads "The total projects must be at
 * least 0.", as in every dialog of the panel since QA-55.
 */
const LABELS = {
  shortDescription: 'short description',
  logoUrl: 'logo',
  coverImageUrl: 'cover image',
  establishedYear: 'year established',
  totalProjects: 'total projects',
  ongoingProjects: 'ongoing projects',
  completedProjects: 'completed projects',
  reraIds: 'RERA registrations',
  'seo.slug': 'URL',
};

/** Brings the block a hint names into view, and focuses the first control in it. */
function focusField(path) {
  const element = document.getElementById(FIELD_TARGET[path] ?? '');
  if (!element) return;

  const control = element.querySelector('input, textarea, select, [contenteditable="true"]');
  control?.focus?.();
  element.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
}

/**
 * Admin → Master data → Developers → add / edit
 * (`/admin/master-data/developers/add|edit/:id`).
 *
 * A builder is a page, not a lookup row: the profile, the logo, the cover, the
 * counts, the registrations and the highlights need a screen rather than a
 * dialog, which is why the list navigates here instead of opening
 * `MasterDataForm`.
 *
 * Only the name is required — the property form's quick-create (prompt 20)
 * posts exactly that and the API fills the rest — so every other section can be
 * left empty and the public page simply renders less.
 *
 * `PUT` replaces the whole record (§5.8) and this form does not edit the `seo`
 * branch — prompt 36 does. So the branch the API returned is carried back with
 * the save; without it, saving a builder would wipe its SEO.
 */
export default function DeveloperFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const toast = useToast();
  const { refresh: refreshMasterData } = useMasterData();
  const formRef = useRef(null);

  const {
    data: record,
    loading,
    error,
    refetch,
    setData: setRecord,
  } = useApi((signal) => developerService.get(id, { signal }), [id], { enabled: isEdit });

  const toPayload = useCallback(
    (values) => ({
      name: trimmed(values.name),
      slug: values.slug ?? '',
      shortDescription: values.shortDescription ?? '',
      description: values.description ?? '',
      logoUrl: values.logoUrl || null,
      coverImageUrl: values.coverImageUrl || null,
      establishedYear: numberOrNull(values.establishedYear),
      headquarters: trimmed(values.headquarters) || null,
      website: trimmed(values.website) || null,
      totalProjects: numberOrNull(values.totalProjects),
      ongoingProjects: numberOrNull(values.ongoingProjects),
      completedProjects: numberOrNull(values.completedProjects),
      reraIds: (values.reraIds ?? []).map(String),
      highlights: (values.highlights ?? []).map(trimmed).filter(Boolean),
      isFeatured: Boolean(values.isFeatured),
      isActive: values.isActive !== false,
      order: Number(values.order) || 0,
      // D34: one URL — `seo.slug` always mirrors the record's own.
      seo: toSeoPayload(values.seo, values.slug ?? ''),
    }),
    []
  );

  const form = useForm({
    initialValues: BLANK,
    schema: isEdit ? schemas['developer.update'] : schemas['developer.create'],
    normalize: toPayload,
    labels: LABELS,
    validate: extraRules,
    onSubmit: async (payload) => {
      try {
        const envelope = isEdit
          ? await developerService.update(id, payload)
          : await developerService.create(payload);
        return envelope?.data ?? null;
      } catch (thrown) {
        throw await withSlugSuggestion(thrown, payload.slug, {
          checkSlug: developerService.checkSlug,
          excludeId: id ?? null,
        });
      }
    },
  });

  const { reset, values, setField, setComputed } = form;

  // A loaded record becomes the form and its baseline, so an untouched form is
  // never reported as dirty. A saved one does the same, from the API's answer.
  useEffect(() => {
    if (!record) return;
    reset(toFormValues(record));
  }, [record, reset]);

  // A new developer goes after the last one unless the editor says otherwise
  // (QA-60): the box read 0, which the API reads as "first". Written as
  // computed, so the form does not claim to have been changed.
  const orderRef = useRef(values.order);
  orderRef.current = values.order;
  useEffect(() => {
    if (isEdit) return undefined;
    const controller = new AbortController();
    developerService
      .list({ perPage: 1 }, { signal: controller.signal })
      .then((envelope) => {
        const total = envelope?.meta?.total;
        if (!Number.isFinite(total) || orderRef.current !== BLANK.order) return;
        setComputed({ order: total + 1 });
      })
      .catch(() => {
        // The default stands.
      });
    return () => controller.abort();
  }, [isEdit, setComputed]);

  useUnsavedChanges(form.dirty);

  const { save, slugMoved, liveSlug, canRedirect, redirectOld, setRedirectOld } = useRecordPage({
    entityType: 'developer',
    noun: 'Developer',
    isEdit,
    record,
    setRecord,
    form,
    publicPath: PATHS.builder,
    editPath: PATHS.adminDeveloperEdit,
    // The property form's developer select reads the cached list (D93).
    onSaved: () => refreshMasterData('developers'),
    formRef,
  });

  // Advisory, never a refusal: the three counts are what the builder publishes
  // about itself and the API stores whatever it is told (§6.5). A negative
  // count is the field's own error to report, not a sum to compare (QA-60).
  const countWarning = useMemo(() => {
    const total = numberOrNull(values.totalProjects);
    const parts = [numberOrNull(values.ongoingProjects), numberOrNull(values.completedProjects)];
    if (total === null || parts.every((part) => part === null)) return null;
    if (total < 0 || parts.some((part) => part !== null && part < 0)) return null;
    const sum = parts.reduce((carry, part) => carry + (part ?? 0), 0);
    return sum > total
      ? `Ongoing and completed add up to ${sum}, which is more than the ${total} total projects. That saves, but check the figures before it reaches the site.`
      : null;
  }, [values.totalProjects, values.ongoingProjects, values.completedProjects]);

  const title = isEdit ? (record?.name ?? 'Edit developer') : 'New developer';

  const actions = (
    <>
      <Button variant="ghost" to={PATHS.adminDevelopers} disabled={form.submitting}>
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

  if (isEdit && loading) {
    return (
      <>
        <PageHeader title="Edit developer" />
        <div className={styles.loading} role="status" aria-busy="true" aria-live="polite">
          <span className={styles.srOnly}>Loading the developer…</span>
          <FormSection title="Basics">
            <FormColumn half>
              <Skeleton variant="rounded" height={64} />
            </FormColumn>
            <FormColumn half>
              <Skeleton variant="rounded" height={64} />
            </FormColumn>
            <FormColumn>
              <Skeleton variant="rounded" height={96} />
            </FormColumn>
            <FormColumn>
              <Skeleton variant="rounded" height={220} />
            </FormColumn>
          </FormSection>
        </div>
      </>
    );
  }

  if (isEdit && (error || !record)) {
    return (
      <>
        <PageHeader title="Edit developer" />
        <ErrorState
          title="We could not load this developer"
          text={error?.message}
          onRetry={refetch}
          action={
            error?.status === 404 ? (
              <Button variant="outline" to={PATHS.adminDevelopers}>
                Back to developers
              </Button>
            ) : undefined
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        breadcrumbs={[{ label: 'Developers', to: PATHS.adminDevelopers }, { label: title }]}
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
          title="Basics"
          description="The name is the only thing a developer needs; everything below it makes the page longer."
        >
          <FormColumn half>
            <FormFieldControl
              field={{ name: 'name', type: 'text', label: 'Name', required: true }}
              form={form}
              disabled={form.submitting}
            />
          </FormColumn>
          <FormColumn half id="developer-slug">
            <FormFieldControl
              field={{
                name: 'slug',
                type: 'slug',
                label: 'URL',
                source: 'name',
                base: '/builders/',
              }}
              form={form}
              disabled={form.submitting}
              checkSlug={developerService.checkSlug}
              excludeId={id}
            />
            {slugMoved ? (
              <MovedNotice
                from={PATHS.builder(liveSlug)}
                canRedirect={canRedirect}
                checked={redirectOld}
                disabled={form.submitting}
                onChange={setRedirectOld}
              />
            ) : null}
          </FormColumn>

          <FormColumn>
            <TextareaField
              label="Short description"
              rows={3}
              maxLength={SHORT_DESCRIPTION_MAX}
              value={values.shortDescription ?? ''}
              error={form.errors.shortDescription}
              disabled={form.submitting}
              hint={`${(values.shortDescription ?? '').length}/${SHORT_DESCRIPTION_MAX} characters — the sentence under the name on cards and at the top of the builder page.`}
              onChange={(event) => setField('shortDescription', event.target.value)}
              onBlur={() => form.handleBlur('shortDescription')}
            />
          </FormColumn>

          <FormColumn id="developer-description">
            <RichTextField
              label="Description"
              variant="full"
              minHeight={320}
              value={values.description ?? ''}
              error={form.errors.description}
              disabled={form.submitting}
              helper="The profile itself — what they build, where, and what they are known for."
              onChange={(html) => setField('description', html)}
            />
          </FormColumn>

          <FormColumn half id="developer-images">
            <FormFieldControl
              field={{ name: 'logoUrl', type: 'image', label: 'Logo', hint: 'logo' }}
              form={form}
              disabled={form.submitting}
            />
          </FormColumn>
          <FormColumn half>
            <FormFieldControl
              field={{ name: 'coverImageUrl', type: 'image', label: 'Cover image', hint: 'hero' }}
              form={form}
              disabled={form.submitting}
            />
          </FormColumn>
        </FormSection>

        <FormSection
          title="Facts"
          description="Only what the builder publishes about itself — anything left empty is left off the page."
        >
          <FormColumn half>
            <NumberField
              label="Established"
              min={EARLIEST_YEAR}
              max={CURRENT_YEAR}
              step={1}
              value={values.establishedYear ?? ''}
              error={form.errors.establishedYear}
              disabled={form.submitting}
              hint={`A year between ${EARLIEST_YEAR} and ${CURRENT_YEAR}.`}
              onChange={(event) => setField('establishedYear', numberOrNull(event.target.value))}
              onBlur={() => form.handleBlur('establishedYear')}
            />
          </FormColumn>
          <FormColumn half>
            <TextField
              label="Headquarters"
              value={values.headquarters ?? ''}
              error={form.errors.headquarters}
              disabled={form.submitting}
              maxLength={150}
              placeholder="Bengaluru, Karnataka"
              hint="Shown under the name in the hero."
              onChange={(event) => setField('headquarters', event.target.value)}
              onBlur={() => form.handleBlur('headquarters')}
            />
          </FormColumn>

          <FormColumn>
            <FormFieldControl
              field={{
                name: 'website',
                type: 'url',
                label: 'Website',
                hint: 'The builder’s own site, with the protocol — https://example.com. It is linked as nofollow.',
              }}
              form={form}
              disabled={form.submitting}
            />
          </FormColumn>

          <FormColumn half>
            <NumberField
              label="Total projects"
              min={0}
              step={1}
              value={values.totalProjects ?? ''}
              error={form.errors.totalProjects}
              disabled={form.submitting}
              onChange={(event) => setField('totalProjects', numberOrNull(event.target.value))}
              onBlur={() => form.handleBlur('totalProjects')}
            />
          </FormColumn>
          <FormColumn half>
            <NumberField
              label="Ongoing projects"
              min={0}
              step={1}
              value={values.ongoingProjects ?? ''}
              error={form.errors.ongoingProjects}
              disabled={form.submitting}
              onChange={(event) => setField('ongoingProjects', numberOrNull(event.target.value))}
              onBlur={() => form.handleBlur('ongoingProjects')}
            />
          </FormColumn>
          <FormColumn half>
            <NumberField
              label="Completed projects"
              min={0}
              step={1}
              value={values.completedProjects ?? ''}
              error={form.errors.completedProjects}
              disabled={form.submitting}
              onChange={(event) => setField('completedProjects', numberOrNull(event.target.value))}
              onBlur={() => form.handleBlur('completedProjects')}
            />
          </FormColumn>

          {countWarning ? (
            // Advisory: a refused save does not stop on it.
            <FormColumn data-advisory="">
              <Alert tone="warning">{countWarning}</Alert>
            </FormColumn>
          ) : null}

          <FormColumn>
            <MultiSelect
              label="RERA registrations"
              options={[]}
              value={values.reraIds ?? []}
              creatable
              disabled={form.submitting}
              error={form.errors.reraIds}
              hint="One registration number per chip. Type one and choose “Add …”."
              placeholder="PRM/KA/RERA/1251/446/PR/…"
              onCreate={(input) => {
                const code = String(input).trim().slice(0, 80);
                if (code.length < 4) {
                  toast.warning('A RERA registration number is longer than that.');
                  return null;
                }
                return { value: code, label: code };
              }}
              onChange={(next) => setField('reraIds', next)}
            />
          </FormColumn>
        </FormSection>

        <FormSection title="Highlights">
          <FormColumn id="developer-highlights">
            <HighlightsField
              values={values.highlights ?? []}
              errors={form.errors}
              disabled={form.submitting}
              onChange={(next) => setField('highlights', next)}
            />
          </FormColumn>
        </FormSection>

        <FormSection title="Status">
          <FormColumn half>
            <FormFieldControl
              field={{
                name: 'isFeatured',
                type: 'switch',
                label: 'Featured',
                hint: 'Featured builders fill the "Top builders" row on the home page.',
              }}
              form={form}
              disabled={form.submitting}
            />
          </FormColumn>
          <FormColumn half>
            <FormFieldControl
              field={{
                name: 'isActive',
                type: 'switch',
                label: 'Active',
                hint: 'An inactive developer is hidden from the site and its page answers 404.',
              }}
              form={form}
              disabled={form.submitting}
            />
          </FormColumn>
          <FormColumn half>
            <FormFieldControl
              field={{
                name: 'order',
                type: 'number',
                label: 'Order',
                min: 0,
                // A position (QA-59): the API places the record there, moves
                // the rest, and the form reads the settled number back.
                hint: `${FORMS.orderHint} Dragging a row in the list changes it too.`,
              }}
              form={form}
              disabled={form.submitting}
            />
          </FormColumn>
        </FormSection>

        <FormSection
          title="Search engines"
          description="The phrase this page targets, what a result prints, and the share cards. The robots directives, the redirect and the structured data are in the sections below it (§9)."
        >
          <FormColumn>
            <SeoPanel
              entityType="developer"
              entity={values}
              seo={values.seo}
              variant="compact"
              errors={form.errors}
              disabled={form.submitting}
              excludeId={id}
              checkSlug={checkDeveloperSlug}
              slugBase="/builders/"
              onFocusField={focusField}
              onSlugChange={(slug) => setField('slug', slug)}
              onChange={(patch, meta) => {
                // The analysis writing its own score back is not an edit, so it
                // moves the baseline with the value and the form stays clean
                // until somebody actually changes something (`setComputed`).
                if (meta?.computed) {
                  form.setComputed(toSeoPaths(patch));
                  return;
                }
                // One dotted path at a time: `useForm.setField` composes on the
                // current values, so an edit and the analysis landing behind it
                // cannot overwrite each other.
                for (const [path, value] of Object.entries(toSeoPaths(patch))) {
                  setField(path, value);
                }
              }}
            />
          </FormColumn>
        </FormSection>

        <div className={styles.actionBar}>{actions}</div>
      </form>
    </>
  );
}

/**
 * The rules the schema is deliberately wider than, and the SEO panel's own.
 *
 * §6.5 allows any year from 1800 and any URL the `url` type accepts; an
 * editor typing into this form wants to hear "1950 to this year" and
 * "include https://" rather than the generic refusals those produce. The panel
 * adds JSON-LD that would invalidate the page's script tag, a redirect with
 * nowhere to send anybody, and an address past 500 characters.
 */
function extraRules(values) {
  const errors = { ...validateSeoBranch(values.seo) };

  const year = numberOrNull(values.establishedYear);
  if (year !== null && (year < EARLIEST_YEAR || year > CURRENT_YEAR)) {
    errors.establishedYear = `Give a year between ${EARLIEST_YEAR} and ${CURRENT_YEAR}.`;
  }

  const website = trimmed(values.website);
  if (website && !URL_PATTERN.test(website)) {
    errors.website = 'Include the protocol — https://example.com.';
  }

  return errors;
}

/** What the builder is known for, in the order they are shown. */
function HighlightsField({ values, errors, disabled, onChange }) {
  // Keyed so a moved row keeps the focus, not its neighbour (QA-60).
  const rowKeys = useRowKeys(values.length);
  const rows = values.map((text, index) => ({ id: rowKeys.keys[index], text }));

  const update = (index, text) => onChange(values.map((row, at) => (at === index ? text : row)));
  const remove = (index) => {
    rowKeys.remove(index);
    onChange(values.filter((_row, at) => at !== index));
  };

  return (
    <fieldset className={styles.repeater}>
      <legend className={styles.repeaterLegend}>Highlights</legend>
      <p className={styles.repeaterHint}>
        One line each — they render as a checked list beside the profile.
      </p>

      {values.length > 0 ? (
        <SortableList
          items={rows}
          disabled={disabled}
          label="Highlights, in order"
          getId={(item) => item.id}
          getLabel={(item, index) => item.text || `Highlight ${index + 1}`}
          onReorder={(next, move) => {
            if (move) rowKeys.move(move.from, move.to);
            onChange(next.map((item) => item.text));
          }}
          renderItem={(item, index) => (
            <div className={styles.repeaterRow}>
              <TextField
                label={`Highlight ${index + 1}`}
                fieldClassName={styles.repeaterField}
                value={item.text}
                disabled={disabled}
                maxLength={200}
                error={errors[`highlights.${index}`]}
                onChange={(event) => update(index, event.target.value)}
              />
              <IconButton
                label={`Remove highlight ${index + 1}`}
                size="sm"
                disabled={disabled}
                onClick={() => remove(index)}
              >
                <Icon icon="mdi:close" width="18" height="18" />
              </IconButton>
            </div>
          )}
        />
      ) : null}

      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        icon={<Icon icon="mdi:plus" width="16" height="16" />}
        onClick={() => onChange([...values, ''])}
      >
        Add highlight
      </Button>
    </fieldset>
  );
}
