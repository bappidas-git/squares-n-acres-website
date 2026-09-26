import { useEffect, useMemo, useState } from 'react';

import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
// `VariableMenu` carries `SeoPanel.module.css`, and the SEO panel's own chunk
// loads that stylesheet before `ImageField`'s. Two admin chunks holding the same
// two stylesheets in two orders is a `mini-css-extract-plugin` conflict, which
// `build:ci` treats as an error — so this import stays above `ImageField`
// (`components/admin/index.js` documents the same rule).
import VariableMenu from '../../../../components/seo/SeoPanel/parts/VariableMenu';
import ImageField from '../../../../components/admin/ImageField';
import seoSettingsStyles from '../SeoSettingsPage.module.css';
import { SEO_ENTITY_TYPES } from '../../../../config/enums';
import {
  SelectField,
  SwitchField,
  TextField,
  TextareaField,
} from '../../../../components/ui/FormField';
import { buildVariables, resolveTemplate } from '../../../../seo';
import { isCanceled } from '../../../../services/apiError';
import { serviceFor } from '../seoEntityServices';

/** The separators §6.14 allows, with the space either side the templates add. */
export const SEPARATORS = [
  { value: '|', label: '|  (pipe)' },
  { value: '–', label: '–  (en dash)' },
  { value: '·', label: '·  (middle dot)' },
  { value: '—', label: '—  (em dash)' },
];

/**
 * Every `titleTemplates` key, what it is for, and which record type resolves it.
 *
 * `home`, `listing` and `search` are pages rather than records, so their
 * examples are resolved against a synthetic record built from the master data —
 * a real locality and a real property type, because a template that only ever
 * sees an empty entity cannot show what it will publish.
 */
export const TEMPLATE_KEYS = [
  { key: 'default', label: 'Everything else', type: 'page' },
  { key: 'home', label: 'Home page', type: 'home' },
  { key: 'property', label: 'Property', type: 'property' },
  { key: 'listing', label: 'Listing and search results', type: 'listing' },
  { key: 'locality', label: 'Locality', type: 'locality' },
  { key: 'developer', label: 'Builder', type: 'developer' },
  { key: 'article', label: 'Article', type: 'article' },
  { key: 'articleCategory', label: 'Article category', type: 'articleCategory' },
  { key: 'page', label: 'CMS page', type: 'page' },
  { key: 'author', label: 'Author', type: 'author' },
  { key: 'search', label: 'Site search', type: 'search' },
];

/** The record types a sample is loaded for — the ones that are records at all. */
const SAMPLE_TYPES = SEO_ENTITY_TYPES.values;

/** One loaded sample per type, kept for the session: the templates rarely change. */
const sampleCache = new Map();

/**
 * One real record of each type, for the live examples.
 *
 * The overview rows carry a title and a slug and nothing else, and a title
 * template reads a price, a locality, a configuration and a category. So the
 * first row of each type is loaded in full, once, and every example on the tab
 * is resolved against records that actually exist.
 *
 * @param {Array<object>} rows the overview rows
 * @returns {Record<string, object>}
 */
export function useSampleEntities(rows = []) {
  const [samples, setSamples] = useState(() => Object.fromEntries(sampleCache));

  const wanted = useMemo(() => {
    const first = {};
    for (const row of rows) {
      if (!first[row.type] && SAMPLE_TYPES.includes(row.type)) first[row.type] = row;
    }
    return first;
  }, [rows]);

  useEffect(() => {
    let alive = true;

    const missing = Object.entries(wanted).filter(([type]) => !sampleCache.has(type));
    if (missing.length === 0) return undefined;

    Promise.all(
      missing.map(([type, row]) =>
        serviceFor(type)
          ?.get(row.id)
          .then(({ data }) => [type, data])
          .catch((thrown) => {
            // A sample is a nicety: a type that cannot be read shows the
            // template resolved against nothing rather than an error.
            if (!isCanceled(thrown)) return [type, null];
            return null;
          })
      )
    ).then((loaded) => {
      for (const entry of loaded) {
        if (entry?.[1]) sampleCache.set(entry[0], entry[1]);
      }
      if (alive) setSamples(Object.fromEntries(sampleCache));
    });

    return () => {
      alive = false;
    };
  }, [wanted]);

  return samples;
}

/**
 * Titles & meta (§4.6 of prompt 37).
 *
 * The eleven title templates are the highest-leverage field in the admin: one
 * of them decides the `<title>` of four hundred listings. So every one of them
 * is shown with the variables it may use and, underneath, the title it produces
 * **right now** for a real record — because a template is unreadable until you
 * see what it resolves to.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {Array<object>} [props.rows] the overview rows, for the samples
 * @param {object} [props.context] master data the variables resolve against
 * @param {boolean} [props.disabled]
 */
export default function TitlesMetaTab({ form, rows = [], context = {}, disabled = false }) {
  const samples = useSampleEntities(rows);
  const { values, setField, getError } = form;

  const resolveContext = useMemo(() => ({ ...context, seoSettings: values }), [context, values]);

  return (
    <div className={seoSettingsStyles.tab}>
      <FormSection
        title="Title templates"
        description="What each kind of page calls itself in search results. Leave a record’s own SEO title empty and it takes the template for its kind."
      >
        <FormColumn half>
          <SelectField
            label="Separator"
            value={values.separator ?? '|'}
            onChange={(event) => setField('separator', event.target.value)}
            options={SEPARATORS}
            error={getError('separator')}
            hint="What %sep% resolves to in every template."
            disabled={disabled}
          />
        </FormColumn>

        {TEMPLATE_KEYS.map((template) => (
          <FormColumn key={template.key}>
            <TemplateField
              template={template}
              value={values.titleTemplates?.[template.key] ?? ''}
              onChange={(next) => setField(`titleTemplates.${template.key}`, next)}
              error={getError(`titleTemplates.${template.key}`)}
              sample={samples[template.type]}
              context={resolveContext}
              disabled={disabled}
            />
          </FormColumn>
        ))}
      </FormSection>

      <FormSection
        title="Defaults"
        description="What a record publishes when it has not written its own."
      >
        <FormColumn>
          <TextareaField
            label="Default meta description"
            rows={3}
            value={values.defaults?.metaDescription ?? ''}
            onChange={(event) => setField('defaults.metaDescription', event.target.value)}
            error={getError('defaults.metaDescription')}
            hint="Used only where a record has none. One sentence about Squares N Acres — not about any one page."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn>
          <ImageField
            label="Default share image"
            hint="og"
            value={values.defaults?.ogImageUrl ?? ''}
            onChange={(next) => setField('defaults.ogImageUrl', next)}
            error={getError('defaults.ogImageUrl')}
            alt="The default sharing image"
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <SelectField
            label="Default Twitter card"
            value={values.defaults?.twitterCard ?? 'summary_large_image'}
            onChange={(event) => setField('defaults.twitterCard', event.target.value)}
            options={[
              { value: 'summary_large_image', label: 'Large image' },
              { value: 'summary', label: 'Summary' },
            ]}
            error={getError('defaults.twitterCard')}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Site URL"
            value={values.siteUrl ?? ''}
            onChange={(event) => setField('siteUrl', event.target.value)}
            onBlur={() => {
              // Canonicals are built by appending a path, so the address is
              // kept without a trailing slash.
              if (typeof values.siteUrl !== 'string') return;
              const trimmed = values.siteUrl.trim().replace(/\/+$/, '');
              if (trimmed !== values.siteUrl) setField('siteUrl', trimmed);
            }}
            error={getError('siteUrl')}
            hint="The address canonicals, sitemaps and structured data are built from. This is the one place it changes — Site settings show it."
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="Default robots directives"
        description="The starting point for every record. A record can still say otherwise for itself."
      >
        <FormColumn half>
          <SwitchField
            label="Allow indexing"
            checked={values.defaults?.robots?.index !== false}
            onChange={(next) => setField('defaults.robots.index', next)}
            hint="Switching this off removes the whole site from search. Use it only before launch."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <SwitchField
            label="Follow links"
            checked={values.defaults?.robots?.follow !== false}
            onChange={(next) => setField('defaults.robots.follow', next)}
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="Automatic noindex rules"
        description="Pages that exist for visitors but have nothing to index."
      >
        {NOINDEX_RULES.map((rule) => (
          <FormColumn key={rule.key} half>
            <SwitchField
              label={rule.label}
              checked={values.noindex?.[rule.key] !== false}
              onChange={(next) => setField(`noindex.${rule.key}`, next)}
              hint={rule.hint}
              disabled={disabled}
            />
          </FormColumn>
        ))}
      </FormSection>
    </div>
  );
}

/** The four rules of §6.14 `noindex`, with what each one costs if switched off. */
export const NOINDEX_RULES = [
  {
    key: 'searchResults',
    label: 'Search result pages',
    hint: 'There is an unlimited number of them and nobody searched for one.',
  },
  {
    key: 'paginatedListings',
    label: 'Paginated listings (page 2 and beyond)',
    hint: 'Off by default: those pages carry listings worth finding.',
  },
  {
    key: 'filteredListings',
    label: 'Filtered listings',
    hint: 'A price band or an amenity filter makes a page nobody searched for.',
  },
  {
    key: 'adminAndAuth',
    label: 'Admin and sign-in pages',
    hint: 'Keep this on.',
  },
];

/**
 * One template: the field, the variable menu and the live example.
 */
export function TemplateField({ template, value, onChange, error, sample, context, disabled }) {
  const inputId = `seo-template-${template.key}`;

  const example = useMemo(() => {
    const entity = sample ?? syntheticEntity(template.type, context);
    const variables = buildVariables(template.type, entity, {
      ...context,
      count: template.type === 'listing' ? 128 : context.count,
    });
    return resolveTemplate(value || '', variables);
  }, [value, sample, template.type, context]);

  return (
    <div className={seoSettingsStyles.templateRow}>
      <TextField
        id={inputId}
        label={template.label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        disabled={disabled}
        className={seoSettingsStyles.mono}
      />
      <div className={seoSettingsStyles.templateTools}>
        <VariableMenu
          inputId={inputId}
          value={value}
          onInsert={(next) => onChange(next)}
          disabled={disabled}
        />
        <p className={seoSettingsStyles.templateExample}>
          {example ? (
            <>
              <span className={seoSettingsStyles.exampleLabel}>Example:</span> {example}
            </>
          ) : (
            <span className={seoSettingsStyles.exampleLabel}>
              This template resolves to nothing — every variable in it is empty.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * A stand-in record for the three templates that describe a page rather than a
 * record, built from the master data so the example reads like the site.
 */
function syntheticEntity(type, context = {}) {
  const locality = context.localities?.[0];
  const propertyType = context.propertyTypes?.[0];

  if (type === 'listing') {
    return {
      title: propertyType?.name ?? 'Apartments',
      listingType: 'sale',
      propertyTypeId: propertyType?.id ?? null,
      location: { localityId: locality?.id ?? null, cityId: locality?.cityId ?? null },
    };
  }
  if (type === 'search') return { title: 'Search results' };
  return {};
}
