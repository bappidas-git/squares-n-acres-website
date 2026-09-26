import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../../ui/Button';
import EntityPicker from '../../admin/EntityPicker';
import IconButton from '../../ui/IconButton';
import ImageField from '../../admin/ImageField';
import ItemsRepeater from './fields/ItemsRepeater';
import LeadFieldsBuilder from './fields/LeadFieldsBuilder';
import RichTextField from '../../editor/RichTextField';
import articleService from '../../../services/articleService';
import masterDataService from '../../../services/masterDataService';
import propertyService from '../../../services/propertyService';
import {
  Alert,
  NumberField,
  SelectField,
  SwitchField,
  TextField,
  TextareaField,
  UrlField,
} from '../../ui';
import { SITE_LEAD_SOURCE_OPTIONS } from '../../../config/enums';
import { fieldApplies, readField, writeField } from './blockSchemas';
import { isCanceled } from '../../../services/apiError';
import { useMasterData } from '../../../contexts/MasterDataContext';

import styles from './BlockEditor.module.css';

/**
 * One block's `data`, rendered from its schema.
 *
 * There is no per-type form component: `blockSchemas.js` says which boxes a
 * block type has and this draws them, so twenty-five block types cost one
 * switch statement rather than twenty-five files. The same switch draws the
 * rows of an `items[]` list, which is why a feature and a package look and
 * behave the same way inside their repeaters.
 *
 * Errors are the dotted keys `validateBlockData` and the API both use
 * (`items.0.title`), so a 422 on `blocks.3.data.items.0.title` reaches the box
 * that caused it.
 *
 * @param {object} props
 * @param {object} props.schema a `BLOCK_SCHEMAS` entry
 * @param {object} props.data the block's `data`
 * @param {(data: object) => void} props.onChange
 * @param {Record<string, string>} [props.errors]
 * @param {boolean} [props.disabled]
 */
export default function BlockForm({ schema, data, onChange, errors = {}, disabled = false }) {
  const options = useBlockOptions();

  if (!schema) return null;

  if (schema.fields.length === 0) {
    return (
      <Alert tone="info" icon={<Icon icon="mdi:information-outline" width="20" height="20" />}>
        {schema.emptyHint ?? 'This block has nothing to configure.'}
      </Alert>
    );
  }

  const visible = schema.fields.filter((field) => fieldApplies(field, data));

  return (
    <div className={styles.grid}>
      {visible.map((field) => (
        <div
          key={field.name}
          className={field.half && field.type !== 'items' ? styles.half : styles.full}
        >
          <BlockField
            field={field}
            value={readField(data, field.name)}
            errors={errors}
            error={errors[field.name]}
            options={options}
            disabled={disabled}
            onChange={(next) => onChange(writeField(data, field.name, next))}
            renderItemRow={(item, index, setItem) => (
              <div className={styles.grid}>
                {(field.itemFields ?? []).map((itemField) => (
                  <div key={itemField.name} className={itemField.half ? styles.half : styles.full}>
                    <BlockField
                      field={itemField}
                      value={item?.[itemField.name]}
                      errors={errors}
                      error={errors[`${field.name}.${index}.${itemField.name}`]}
                      options={options}
                      disabled={disabled}
                      onChange={(next) => setItem({ [itemField.name]: next })}
                    />
                  </div>
                ))}
              </div>
            )}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * One control, chosen by `field.type`.
 *
 * Exported so `blockSchemas.test.js` can assert every declared type is drawn.
 */
export function BlockField({
  field,
  value,
  error,
  errors,
  options,
  disabled,
  onChange,
  renderItemRow,
}) {
  const shared = {
    label: field.label,
    required: field.required,
    hint: field.hint,
    error,
    disabled,
  };

  switch (field.type) {
    case 'textarea':
      return (
        <TextareaField
          {...shared}
          rows={field.rows ?? 3}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case 'richtext':
      return (
        <RichTextField
          label={field.label}
          required={field.required}
          helper={field.hint}
          error={error}
          disabled={disabled}
          variant={field.compact ? 'compact' : 'full'}
          minHeight={field.compact ? 180 : 320}
          placeholder={field.placeholder}
          value={value ?? ''}
          onChange={onChange}
        />
      );

    case 'url':
      return (
        <UrlField
          {...shared}
          hint={field.hint ?? 'Include https://'}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case 'number':
      return (
        <NumberField
          {...shared}
          min={field.min}
          max={field.max}
          step="any"
          value={value ?? ''}
          onChange={(event) =>
            onChange(event.target.value === '' ? null : Number(event.target.value))
          }
        />
      );

    case 'switch':
      return (
        <SwitchField
          label={field.label}
          hint={field.hint}
          error={error}
          disabled={disabled}
          checked={Boolean(value)}
          onChange={onChange}
        />
      );

    case 'select':
      return (
        <SelectField
          {...shared}
          {...selectChoices(
            field,
            field.optionsFrom ? options[field.optionsFrom] : (field.options ?? [])
          )}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(event) => onChange(coerceOption(event.target.value, field))}
        />
      );

    case 'leadSource':
      return (
        <SelectField
          {...shared}
          {...selectChoices(
            { ...field, placeholder: field.required ? 'Select a source' : 'Do not open the form' },
            SITE_LEAD_SOURCE_OPTIONS
          )}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value || null)}
        />
      );

    case 'image':
      return (
        <ImageField
          label={field.label}
          required={field.required}
          error={error}
          disabled={disabled}
          hint={field.imageHint}
          value={value ?? ''}
          onChange={(next) => onChange(next || '')}
        />
      );

    case 'icon':
      return (
        <IconField
          field={field}
          value={value}
          error={error}
          disabled={disabled}
          onChange={onChange}
        />
      );

    case 'entity':
      return (
        <EntityPicker
          label={field.label}
          hint={field.hint}
          error={error}
          disabled={disabled}
          labelKey={field.labelKey ?? 'name'}
          multiple={field.multiple !== false}
          orderable
          fetcher={options.fetchers[field.entity]}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
      );

    case 'stringList':
      return (
        <StringList
          field={field}
          value={value}
          error={error}
          disabled={disabled}
          onChange={onChange}
        />
      );

    case 'fields':
      return (
        <LeadFieldsBuilder value={value} errors={errors} disabled={disabled} onChange={onChange} />
      );

    case 'items':
      return (
        <ItemsRepeater
          field={field}
          value={value}
          errors={errors}
          disabled={disabled}
          onChange={onChange}
          renderRow={renderItemRow}
        />
      );

    default:
      return (
        <TextField
          {...shared}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}

/**
 * A select's `options` and `placeholder`.
 *
 * `SelectField` renders a placeholder as a **disabled** empty option, which is
 * right for a compulsory choice and wrong for an optional one — "Any locality"
 * has to be selectable again after a locality has been picked. So an optional
 * select gets a real empty option instead.
 */
function selectChoices(field, options) {
  if (field.required) return { options, placeholder: field.placeholder };
  return { options: [{ value: '', label: field.placeholder ?? 'None' }, ...options] };
}

/** A numeric select (`answerIndex`, `localityId`) gives back a number. */
function coerceOption(raw, field) {
  if (raw === '') return field.name.endsWith('Index') ? 0 : null;
  const numeric = (field.optionsFrom ?? '').length > 0 || field.name.endsWith('Index');
  if (!numeric) return raw;
  const number = Number(raw);
  return Number.isFinite(number) ? number : raw;
}

/** An Iconify id with a live preview — the same vocabulary the rest of the panel uses. */
function IconField({ field, value, error, disabled, onChange }) {
  const known = /^mdi:[a-z0-9-]+$/.test(String(value ?? ''));

  return (
    <div className={styles.iconField}>
      <TextField
        label={field.label}
        error={error}
        disabled={disabled}
        hint={field.hint ?? 'An Iconify MDI id, e.g. mdi:home-city-outline'}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value.trim())}
      />
      <span className={styles.iconPreview} aria-hidden="true">
        <Icon
          icon={known ? value : 'mdi:help-rhombus-outline'}
          width="24"
          height="24"
          className={known ? undefined : styles.iconUnknown}
        />
      </span>
    </div>
  );
}

/**
 * A list of plain strings: a quiz's four answers (`count: 4`, fixed) or a
 * package's included lines (variable).
 */
function StringList({ field, value, error, disabled, onChange }) {
  const fixed = Number.isInteger(field.count);
  const entries = fixed
    ? Array.from(
        { length: field.count },
        (_entry, index) => (Array.isArray(value) ? value[index] : '') ?? ''
      )
    : Array.isArray(value)
      ? value
      : [];

  const set = (index, next) => onChange(entries.map((entry, at) => (at === index ? next : entry)));

  return (
    <fieldset className={styles.stringList} disabled={disabled}>
      <legend className={styles.repeaterLegend}>
        {field.label}
        {field.required ? <span aria-hidden="true"> *</span> : null}
      </legend>
      {field.hint ? <p className={styles.repeaterHint}>{field.hint}</p> : null}

      {entries.map((entry, index) => (
        <div key={index} className={styles.stringRow}>
          <TextField
            label={`${field.label} ${index + 1}`}
            value={entry}
            disabled={disabled}
            fieldClassName={styles.stringInput}
            onChange={(event) => set(index, event.target.value)}
          />
          {fixed ? null : (
            <IconButton
              label={`Remove ${field.label.toLowerCase()} ${index + 1}`}
              size="sm"
              disabled={disabled}
              onClick={() => onChange(entries.filter((_entry, at) => at !== index))}
            >
              <Icon icon="mdi:close" width="18" height="18" />
            </IconButton>
          )}
        </div>
      ))}

      {fixed ? null : (
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          icon={<Icon icon="mdi:plus" width="16" height="16" />}
          onClick={() => onChange([...entries, ''])}
        >
          {field.addLabel ?? 'Add line'}
        </Button>
      )}

      {error ? (
        <p className={styles.fieldError} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/** The record pickers and select options the block fields reach for. */
const FETCHERS = {
  faqs: (params, opts) => masterDataService.faqs.adminList(params, opts),
  team: (params, opts) => masterDataService.team.adminList(params, opts),
  testimonials: (params, opts) => masterDataService.testimonials.adminList(params, opts),
  properties: (params, opts) => propertyService.adminList(params, opts),
  articles: (params, opts) => articleService.adminList(params, opts),
};

/**
 * `{ localities, propertyTypes, articleCategories, fetchers }`.
 *
 * Localities and property types are already cached for the session (D93); the
 * article categories are the one list nothing else has loaded, so they are
 * fetched once, here, and only when a block asks for them.
 */
function useBlockOptions() {
  const { localities, propertyTypes } = useMasterData();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    articleService
      .categories({ perPage: 100, sort: 'name' }, { signal: controller.signal })
      .then((envelope) => setCategories(Array.isArray(envelope?.data) ? envelope.data : []))
      .catch((thrown) => {
        if (!isCanceled(thrown)) setCategories([]);
      });
    return () => controller.abort();
  }, []);

  return useMemo(
    () => ({
      localities: localities.map((row) => ({ value: row.id, label: row.name })),
      propertyTypes: propertyTypes.map((row) => ({ value: row.id, label: row.name })),
      articleCategories: categories.map((row) => ({ value: row.id, label: row.name })),
      fetchers: FETCHERS,
    }),
    [localities, propertyTypes, categories]
  );
}
