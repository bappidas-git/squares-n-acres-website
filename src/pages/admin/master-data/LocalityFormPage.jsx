import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useParams } from 'react-router-dom';

import MapEmbed from '../../../components/common/MapEmbed';
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
import { validateSeoBranch } from '../../../components/seo/seoSideEffects';
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
import { FORMS } from '../../../config/adminCopy';

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

/**
 * What the SEO analysers call a field, and where it is on this screen. Every
 * id names a block below: none of them used to exist, so a hint that pointed
 * at the guide, the image or the lists did nothing when pressed (QA-60).
 */
const FIELD_TARGET = {
  content: 'locality-description',
  tableOfContents: 'locality-description',
  images: 'locality-hero',
  highlights: 'locality-highlights',
  connectivity: 'locality-connectivity',
  slug: 'locality-slug',
};

/**
 * What a message calls a field whose key is not a word (QA-60): "The
 * avgPricePerSqft must be an integer." reads "The average price per sq ft
 * must be an integer.", as in every dialog of the panel since QA-55.
 */
const LABELS = {
  cityId: 'city',
  shortDescription: 'short description',
  heroImageUrl: 'hero image',
  avgPricePerSqft: 'average price per sq ft',
  priceTrendNote: 'price trend note',
  'seo.slug': 'URL',
};

/**
 * The rules the schema cannot word for this form (QA-60): a connectivity row
 * needs both halves, and the schema's "The connectivity.0.value field is
 * required." named neither the row nor what was missing from it.
 */
function connectivityRules(values) {
  const errors = {};
  (values.connectivity ?? []).forEach((row, index) => {
    const label = trimmed(row?.label);
    const value = trimmed(row?.value);
    if (label && !value) {
      errors[`connectivity.${index}.value`] = 'Say how far or how — or remove the row.';
    }
    if (value && !label) {
      errors[`connectivity.${index}.label`] = 'Say what is near — or remove the row.';
    }
  });
  return errors;
}

/**
 * The locality schema with a connectivity row's two halves left to
 * {@link connectivityRules}. The payload drops the rows left empty, so the
 * schema counted what was left: with an empty row above it, a half-filled
 * row's message landed on the empty one (QA-60). The API still requires both.
 */
function withRowsCheckedByForm(schema) {
  const items = schema.connectivity.items;
  return {
    ...schema,
    connectivity: {
      ...schema.connectivity,
      items: {
        ...items,
        shape: Object.fromEntries(
          Object.entries(items.shape).map(([key, rule]) => [key, { ...rule, required: false }])
        ),
      },
    },
  };
}

const CREATE_SCHEMA = withRowsCheckedByForm(schemas['locality.create']);
const UPDATE_SCHEMA = withRowsCheckedByForm(schemas['locality.update']);

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
  const toast = useToast();
  const { cities, loading: citiesLoading, refresh: refreshMasterData } = useMasterData();
  const formRef = useRef(null);

  const {
    data: record,
    loading,
    error,
    refetch,
    setData: setRecord,
  } = useApi((signal) => localityService.get(id, { signal }), [id], { enabled: isEdit });

  const [preview, setPreview] = useState({ latitude: null, longitude: null });

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
    schema: isEdit ? UPDATE_SCHEMA : CREATE_SCHEMA,
    normalize: toPayload,
    labels: LABELS,
    // A connectivity row with one half, and the SEO panel's own blockers:
    // JSON-LD that would invalidate the page's script tag, a redirect with
    // nowhere to send anybody, and an address past 500 characters.
    validate: (candidate) => ({
      ...connectivityRules(candidate),
      ...validateSeoBranch(candidate.seo),
    }),
    onSubmit: async (payload) => {
      try {
        const envelope = isEdit
          ? await localityService.update(id, payload)
          : await localityService.create(payload);
        return envelope?.data ?? null;
      } catch (thrown) {
        throw await withSlugSuggestion(thrown, payload.slug, {
          checkSlug: localityService.checkSlug,
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

  // A new locality goes after the last one unless the editor says otherwise
  // (QA-60). The box read 0, which the API reads as "first": every locality
  // added headed the list and the home strip. Written as computed, so the
  // form does not claim to have been changed.
  useEffect(() => {
    if (isEdit) return undefined;
    const controller = new AbortController();
    localityService
      .list({ perPage: 1 }, { signal: controller.signal })
      .then((envelope) => {
        const total = envelope?.meta?.total;
        if (!Number.isFinite(total) || valuesRef.current.order !== BLANK.order) return;
        setComputed({ order: total + 1 });
      })
      .catch(() => {
        // The default stands.
      });
    return () => controller.abort();
  }, [isEdit, setComputed]);

  useUnsavedChanges(form.dirty);

  const { save, slugMoved, liveSlug, canRedirect, redirectOld, setRedirectOld } = useRecordPage({
    entityType: 'locality',
    noun: 'Locality',
    isEdit,
    record,
    setRecord,
    form,
    publicPath: PATHS.locality,
    editPath: PATHS.adminLocalityEdit,
    // The home strip and every locality picker read the cached list (D93).
    onSaved: refreshMasterData,
    formRef,
  });

  // The active cities, and the one this locality is filed under when it has
  // since been switched off — offered, and labelled so. Without it the select
  // read "Select a city" over a locality that has one (QA-60).
  const cityOptions = useMemo(() => {
    const options = cities.map((city) => ({ value: city.id, label: city.name }));
    const current = record?.cityId;
    if (current === null || current === undefined || current === '') return options;
    if (options.some((option) => String(option.value) === String(current))) return options;
    const name = record?.city?.name ?? `City ${current}`;
    return [...options, { value: current, label: `${name} (inactive)` }];
  }, [cities, record]);

  const cityHint = useMemo(() => {
    const chosen = cityOptions.find((option) => String(option.value) === String(values.cityId));
    if (chosen?.label.endsWith('(inactive)')) {
      return 'This city is switched off. The locality keeps it; switch it on under Master data → Cities, or choose another.';
    }
    if (!citiesLoading && cities.length === 0) {
      return 'No city is switched on. Add one, or switch one on, under Master data → Cities.';
    }
    return undefined;
  }, [cities.length, citiesLoading, cityOptions, values.cityId]);

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
        ref={formRef}
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
          <FormColumn half id="locality-slug">
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
            {slugMoved ? (
              <MovedNotice
                from={PATHS.locality(liveSlug)}
                canRedirect={canRedirect}
                checked={redirectOld}
                disabled={form.submitting}
                onChange={setRedirectOld}
              />
            ) : null}
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
                hint: cityHint,
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

          <FormColumn id="locality-description">
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

          <FormColumn id="locality-hero">
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
                // Spaces are how a pincode is often written ("560 066"); any
                // other character, or a seventh digit, is a typo to fix — not
                // something to strip until six digits are left (QA-60).
                const code = String(input).replace(/\s+/g, '');
                if (!/^\d{6}$/.test(code)) {
                  toast.warning('A pincode is six digits, like 560066.');
                  return null;
                }
                return { value: code, label: code };
              }}
              onChange={(next) => setField('pincodes', next)}
            />
          </FormColumn>
        </FormSection>

        <FormSection title="Content">
          <FormColumn id="locality-highlights">
            <HighlightsField
              values={values.highlights ?? []}
              errors={form.errors}
              disabled={form.submitting}
              onChange={(next) => setField('highlights', next)}
            />
          </FormColumn>

          <FormColumn id="locality-connectivity">
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
          description="The phrase this page targets, what a result prints, and the share cards. The robots directives, the redirect and the structured data are in the sections below it."
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

/** The check-listed reasons to live here, in the order they are shown. */
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
        One line each — they render as a checked list on the guide.
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

/** `{label, value}` pairs — "Metro", "Purple Line, along Whitefield Main Road". */
function ConnectivityField({ values, errors, disabled, onChange }) {
  // Keyed so a moved row keeps the focus, not its neighbour (QA-60).
  const rowKeys = useRowKeys(values.length);
  const rows = values.map((row, index) => ({ ...row, id: rowKeys.keys[index] }));

  const update = (index, patch) =>
    onChange(values.map((row, at) => (at === index ? { ...row, ...patch } : row)));
  const remove = (index) => {
    rowKeys.remove(index);
    onChange(values.filter((_row, at) => at !== index));
  };

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
          onReorder={(next, move) => {
            if (move) rowKeys.move(move.from, move.to);
            onChange(next.map((item) => ({ label: item.label ?? '', value: item.value ?? '' })));
          }}
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
