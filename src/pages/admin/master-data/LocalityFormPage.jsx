import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate, useParams } from 'react-router-dom';

import ApiError from '../../../services/apiError';
import MapEmbed from '../../../components/common/MapEmbed';
import PATHS from '../../../routes/paths';
import useApi from '../../../hooks/useApi';
import useForm from '../../../hooks/useForm';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';
import { useNavigationGuard } from '../../../contexts/NavigationGuardContext';
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
  Button,
  ErrorState,
  IconButton,
  NumberField,
  Skeleton,
  TextField,
  TextareaField,
} from '../../../components/ui';
import { LOCALITY_ZONES } from '../../../config/enums';
import { adminCrud, localities } from '../../../services/masterDataService';
import { applySeoSideEffects, validateSeoBranch } from '../../../components/seo/seoSideEffects';
import {
  createSeo,
  toSeoPaths,
  toSeoPayload,
  withSeoDefaults,
} from '../../../components/seo/seoValues';
import { schemas } from '../../../services/schemas';
import { useMasterData } from '../../../contexts/MasterDataContext';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './LocalityFormPage.module.css';

const localityService = adminCrud(localities);

/** The API's cap on `shortDescription` (§6.2), shown as a live counter. */
const SHORT_DESCRIPTION_MAX = 300;

/** A new locality, at the values its controls read as empty. */
const BLANK = {
  name: '',
  slug: '',
  cityId: '',
  zone: '',
  shortDescription: '',
  description: '',
  heroImageUrl: '',
  latitude: null,
  longitude: null,
  pincodes: [],
  highlights: [],
  connectivity: [],
  avgPricePerSqft: null,
  priceTrendNote: '',
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
  cityId: record.cityId ?? '',
  zone: record.zone ?? '',
  shortDescription: record.shortDescription ?? '',
  description: record.description ?? '',
  heroImageUrl: record.heroImageUrl ?? '',
  latitude: record.latitude ?? null,
  longitude: record.longitude ?? null,
  pincodes: Array.isArray(record.pincodes) ? record.pincodes : [],
  highlights: Array.isArray(record.highlights) ? record.highlights : [],
  connectivity: Array.isArray(record.connectivity) ? record.connectivity : [],
  avgPricePerSqft: record.avgPricePerSqft ?? null,
  priceTrendNote: record.priceTrendNote ?? '',
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
const checkLocalitySlug = (slug, { excludeId, signal } = {}) =>
  localityService.checkSlug(slug, { excludeId, signal });

/** What the SEO analysers call a field, and where it is on this screen. */
const FIELD_TARGET = {
  content: 'locality-description',
  highlights: 'locality-highlights',
  connectivity: 'locality-connectivity',
  slug: 'locality-slug',
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
 * Admin → Master data → Localities → add / edit
 * (`/admin/master-data/localities/add|edit/:id`).
 *
 * A locality is a content page, not a lookup row: the guide, the coordinates,
 * the highlights and the connectivity pairs need a screen rather than a dialog,
 * which is why the list navigates here instead of opening `MasterDataForm`.
 *
 * `PUT` replaces the whole record (§5.8), and this form does not edit the `seo`
 * branch — prompt 36 does. So the branch the API returned is carried back with
 * the save; without it, saving a locality would wipe its SEO.
 */
export default function LocalityFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { cities, refresh: refreshMasterData } = useMasterData();

  const {
    data: record,
    loading,
    error,
    refetch,
  } = useApi((signal) => localityService.get(id, { signal }), [id], { enabled: isEdit });

  const [preview, setPreview] = useState({ latitude: null, longitude: null });
  const [redirect, setRedirect] = useState(null);

  const toPayload = useCallback(
    (values) => ({
      name: trimmed(values.name),
      slug: values.slug ?? '',
      cityId: values.cityId === '' || values.cityId === null ? null : Number(values.cityId),
      zone: values.zone || null,
      description: values.description ?? '',
      shortDescription: values.shortDescription ?? '',
      heroImageUrl: values.heroImageUrl || null,
      latitude: numberOrNull(values.latitude),
      longitude: numberOrNull(values.longitude),
      pincodes: values.pincodes ?? [],
      highlights: (values.highlights ?? []).map(trimmed).filter(Boolean),
      connectivity: (values.connectivity ?? [])
        .map((row) => ({ label: trimmed(row.label), value: trimmed(row.value) }))
        .filter((row) => row.label || row.value),
      avgPricePerSqft: numberOrNull(values.avgPricePerSqft),
      priceTrendNote: trimmed(values.priceTrendNote) || null,
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
    schema: isEdit ? schemas['locality.update'] : schemas['locality.create'],
    normalize: toPayload,
    // The SEO panel's own two blockers: JSON-LD that would invalidate the
    // page's script tag, and a redirect with nowhere to send anybody.
    validate: (candidate) => validateSeoBranch(candidate.seo),
    onSubmit: async (payload) => {
      try {
        const envelope = isEdit
          ? await localityService.update(id, payload)
          : await localityService.create(payload);
        return envelope?.data ?? null;
      } catch (thrown) {
        throw await withSlugSuggestion(thrown, payload.slug, id);
      }
    },
  });

  const { reset, values, setField } = form;

  // A loaded record becomes the form and its baseline, so an untouched form is
  // never reported as dirty.
  useEffect(() => {
    if (!record) return;
    reset(toFormValues(record));
    setPreview({ latitude: record.latitude ?? null, longitude: record.longitude ?? null });
  }, [record, reset]);

  // The first city is preselected once, on a new locality: `reset` moves the
  // baseline with it, so the preselection does not make the form dirty — and
  // the latch means clearing the select afterwards stays cleared.
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const cityPreselected = useRef(false);

  useEffect(() => {
    if (isEdit || cityPreselected.current || cities.length === 0) return;
    cityPreselected.current = true;
    if (valuesRef.current.cityId !== '') return;
    reset({ ...valuesRef.current, cityId: cities[0].id });
  }, [isEdit, cities, reset]);

  useUnsavedChanges(form.dirty);

  // Leaving after a save waits for the guard to let go, twice over. A saved
  // form is clean, but the provider only learns that one render later, and
  // `useBlocker` re-registers the question in an effect of its own — which runs
  // after this component's, because a child's effects run before its parent's.
  // So: wait for `isBlocking` to clear, then leave on the next tick. Navigating
  // any sooner meets a blocker still holding the previous, dirty answer, and
  // asks the editor whether to discard changes that have just been written.
  const { isBlocking } = useNavigationGuard();
  useEffect(() => {
    if (!redirect || isBlocking) return undefined;
    const timer = setTimeout(() => navigate(redirect), 0);
    return () => clearTimeout(timer);
  }, [redirect, isBlocking, navigate]);

  const cityOptions = useMemo(
    () => cities.map((city) => ({ value: city.id, label: city.name })),
    [cities]
  );

  const save = async (after = 'stay') => {
    const saved = await form.submit();
    if (!saved) return;

    // The redirect this record's `seo` asks for, against the slug the API
    // answered with — a new record has none until now (§9.6).
    await applySeoSideEffects('locality', saved);
    toast.success(isEdit ? 'Locality updated.' : 'Locality created.');
    // The home strip and every locality picker read the cached list (D93).
    refreshMasterData();

    if (after === 'view' && saved.slug) {
      setRedirect(PATHS.locality(saved.slug));
      return;
    }
    if (!isEdit && saved.id) {
      setRedirect(PATHS.adminLocalityEdit(saved.id));
      return;
    }
    refetch();
  };

  const showPreview = () => setPreview({ latitude: values.latitude, longitude: values.longitude });

  const title = isEdit ? (record?.name ?? 'Edit locality') : 'New locality';

  const actions = (
    <>
      <Button variant="ghost" to={PATHS.adminLocalities} disabled={form.submitting}>
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
        <PageHeader title="Edit locality" />
        <div className={styles.loading} role="status" aria-busy="true" aria-live="polite">
          <span className={styles.srOnly}>Loading the locality…</span>
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
        <PageHeader title="Edit locality" />
        <ErrorState
          title="We could not load this locality"
          text={error?.message}
          onRetry={refetch}
          action={
            error?.status === 404 ? (
              <Button variant="outline" to={PATHS.adminLocalities}>
                Back to localities
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
        breadcrumbs={[{ label: 'Localities', to: PATHS.adminLocalities }, { label: title }]}
        actions={<div className={styles.headerActions}>{actions}</div>}
      />

      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <FormSection title="Basics">
          <FormColumn half>
            <FormFieldControl
              field={{ name: 'name', type: 'text', label: 'Name', required: true }}
              form={form}
              disabled={form.submitting}
            />
          </FormColumn>
          <FormColumn half>
            <FormFieldControl
              field={{
                name: 'slug',
                type: 'slug',
                label: 'URL',
                source: 'name',
                base: '/localities/',
              }}
              form={form}
              disabled={form.submitting}
              checkSlug={localityService.checkSlug}
              excludeId={id}
            />
          </FormColumn>

          <FormColumn half>
            <FormFieldControl
              field={{
                name: 'cityId',
                type: 'select',
                label: 'City',
                required: true,
                placeholder: 'Select a city',
                options: cityOptions,
              }}
              form={form}
              disabled={form.submitting}
            />
          </FormColumn>
          <FormColumn half>
            <FormFieldControl
              field={{
                name: 'zone',
                type: 'select',
                label: 'Zone',
                placeholder: 'No zone',
                options: LOCALITY_ZONES.options,
              }}
              form={form}
              disabled={form.submitting}
            />
          </FormColumn>

          <FormColumn>
            <TextareaField
              label="Short description"
              rows={3}
              maxLength={SHORT_DESCRIPTION_MAX}
              value={values.shortDescription ?? ''}
              error={form.errors.shortDescription}
              disabled={form.submitting}
              hint={`${(values.shortDescription ?? '').length}/${SHORT_DESCRIPTION_MAX} characters — the sentence under the name on cards and in search results.`}
              onChange={(event) => setField('shortDescription', event.target.value)}
              onBlur={() => form.handleBlur('shortDescription')}
            />
          </FormColumn>

          <FormColumn>
            <RichTextField
              label="Description"
              variant="full"
              minHeight={320}
              value={values.description ?? ''}
              error={form.errors.description}
              disabled={form.submitting}
              helper="The guide itself — what the area is like, who it suits, what it costs."
              onChange={(html) => setField('description', html)}
            />
          </FormColumn>

          <FormColumn>
            <FormFieldControl
              field={{ name: 'heroImageUrl', type: 'image', label: 'Hero image', hint: 'hero' }}
              form={form}
              disabled={form.submitting}
            />
          </FormColumn>
        </FormSection>

        <FormSection
          title="Location"
          description="The coordinates place the map on the public guide; the preview follows them when you leave a field."
        >
          <FormColumn half>
            <NumberField
              label="Latitude"
              step="any"
              min={-90}
              max={90}
              value={values.latitude ?? ''}
              error={form.errors.latitude}
              disabled={form.submitting}
              hint="Between −90 and 90, e.g. 12.9698"
              onChange={(event) => setField('latitude', numberOrNull(event.target.value))}
              onBlur={() => {
                form.handleBlur('latitude');
                showPreview();
              }}
            />
          </FormColumn>
          <FormColumn half>
            <NumberField
              label="Longitude"
              step="any"
              min={-180}
              max={180}
              value={values.longitude ?? ''}
              error={form.errors.longitude}
              disabled={form.submitting}
              hint="Between −180 and 180, e.g. 77.7500"
              onChange={(event) => setField('longitude', numberOrNull(event.target.value))}
              onBlur={() => {
                form.handleBlur('longitude');
                showPreview();
              }}
            />
          </FormColumn>

          <FormColumn>
            <MapEmbed
              latitude={preview.latitude}
              longitude={preview.longitude}
              title={`Map preview of ${values.name || 'this locality'}`}
            />
          </FormColumn>

          <FormColumn>
            <MultiSelect
              label="Pincodes"
              options={[]}
              value={values.pincodes ?? []}
              creatable
              disabled={form.submitting}
              error={form.errors.pincodes}
              hint="Six digits each. Type one and choose “Add …”."
              placeholder="560066"
              onCreate={(input) => {
                const code = String(input).replace(/\D/g, '').slice(0, 6);
                if (code.length !== 6) {
                  toast.warning('A pincode is six digits.');
                  return null;
                }
                return { value: code, label: code };
              }}
              onChange={(next) => setField('pincodes', next)}
            />
          </FormColumn>
        </FormSection>

        <FormSection title="Content">
          <FormColumn>
            <HighlightsField
              values={values.highlights ?? []}
              errors={form.errors}
              disabled={form.submitting}
              onChange={(next) => setField('highlights', next)}
            />
          </FormColumn>

          <FormColumn>
            <ConnectivityField
              values={values.connectivity ?? []}
              errors={form.errors}
              disabled={form.submitting}
              onChange={(next) => setField('connectivity', next)}
            />
          </FormColumn>

          <FormColumn half>
            <NumberField
              label="Average price per sq ft"
              min={0}
              step={50}
              value={values.avgPricePerSqft ?? ''}
              error={form.errors.avgPricePerSqft}
              disabled={form.submitting}
              hint="In rupees. Shown as “₹8,200/sq ft avg”."
              className={styles.rupeeInput}
              onChange={(event) => setField('avgPricePerSqft', numberOrNull(event.target.value))}
              onBlur={() => form.handleBlur('avgPricePerSqft')}
            />
          </FormColumn>
          <FormColumn half>
            <TextField
              label="Price trend note"
              value={values.priceTrendNote ?? ''}
              error={form.errors.priceTrendNote}
              disabled={form.submitting}
              maxLength={300}
              hint="One line under the price on the guide — say plainly how indicative the figure is."
              onChange={(event) => setField('priceTrendNote', event.target.value)}
              onBlur={() => form.handleBlur('priceTrendNote')}
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
                hint: 'Featured localities fill the strip on the home page.',
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
                hint: 'An inactive locality is hidden from the site and its page answers 404.',
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
                hint: 'Lower comes first. The list sorts by this, and drag-and-drop writes it.',
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
              entityType="locality"
              entity={values}
              seo={values.seo}
              variant="compact"
              errors={form.errors}
              disabled={form.submitting}
              excludeId={id}
              checkSlug={checkLocalitySlug}
              slugBase="/localities/"
              onFocusField={focusField}
              onSlugChange={(slug) => setField('slug', slug)}
              onChange={(patch) => {
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
 * The 409 of a duplicate slug, with the free variant to take.
 *
 * The API answers `{ message, errors: { slug } }` but no suggestion, and the
 * suggestion is the useful half — so it is fetched from `check-slug` and put in
 * front of the field that caused it (§5.9, §7 of prompt 14).
 */
async function withSlugSuggestion(thrown, slug, excludeId) {
  if (thrown?.status !== 409 || !slug) return thrown;

  try {
    const { data } = await localityService.checkSlug(slug, { excludeId });
    if (!data?.suggestion || data.suggestion === slug) return thrown;

    return new ApiError({
      status: thrown.status,
      message: thrown.message,
      data: thrown.data,
      original: thrown,
      errors: { ...thrown.errors, slug: [`${thrown.message} Try “${data.suggestion}”.`] },
    });
  } catch {
    // The suggestion is a nicety; the refusal is the answer.
    return thrown;
  }
}

/** The check-listed reasons to live here, in the order they are shown. */
function HighlightsField({ values, errors, disabled, onChange }) {
  const rows = values.map((text, index) => ({ id: index, text }));

  const update = (index, text) => onChange(values.map((row, at) => (at === index ? text : row)));
  const remove = (index) => onChange(values.filter((_row, at) => at !== index));

  return (
    <fieldset className={styles.repeater}>
      <legend className={styles.repeaterLegend}>Highlights</legend>
      <p className={styles.repeaterHint}>
        One line each — they render as a checked list on the guide.
      </p>

      {values.length > 0 ? (
        <SortableList
          items={rows}
          disabled={disabled}
          label="Highlights, in order"
          getId={(item) => item.id}
          getLabel={(item, index) => item.text || `Highlight ${index + 1}`}
          onReorder={(next) => onChange(next.map((item) => item.text))}
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

/** `{label, value}` pairs — "Metro", "Purple Line, along Whitefield Main Road". */
function ConnectivityField({ values, errors, disabled, onChange }) {
  const rows = values.map((row, index) => ({ id: index, ...row }));

  const update = (index, patch) =>
    onChange(values.map((row, at) => (at === index ? { ...row, ...patch } : row)));
  const remove = (index) => onChange(values.filter((_row, at) => at !== index));

  return (
    <fieldset className={styles.repeater}>
      <legend className={styles.repeaterLegend}>Connectivity</legend>
      <p className={styles.repeaterHint}>
        What is near, and how far. Both halves are needed for a row to be saved.
      </p>

      {values.length > 0 ? (
        <SortableList
          items={rows}
          disabled={disabled}
          label="Connectivity rows, in order"
          getId={(item) => item.id}
          getLabel={(item, index) => item.label || `Row ${index + 1}`}
          onReorder={(next) =>
            onChange(next.map((item) => ({ label: item.label ?? '', value: item.value ?? '' })))
          }
          renderItem={(item, index) => (
            <div className={styles.repeaterRow}>
              <TextField
                label="Label"
                fieldClassName={styles.repeaterField}
                value={item.label ?? ''}
                disabled={disabled}
                maxLength={120}
                placeholder="Metro"
                error={errors[`connectivity.${index}.label`]}
                onChange={(event) => update(index, { label: event.target.value })}
              />
              <TextField
                label="Value"
                fieldClassName={styles.repeaterFieldWide}
                value={item.value ?? ''}
                disabled={disabled}
                maxLength={200}
                placeholder="Purple Line, 1.2 km"
                error={errors[`connectivity.${index}.value`]}
                onChange={(event) => update(index, { value: event.target.value })}
              />
              <IconButton
                label={`Remove connectivity row ${index + 1}`}
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
        onClick={() => onChange([...values, { label: '', value: '' }])}
      >
        Add row
      </Button>
    </fieldset>
  );
}
