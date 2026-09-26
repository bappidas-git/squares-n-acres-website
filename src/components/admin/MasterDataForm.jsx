import { useId, useState } from 'react';
import { Icon } from '@iconify/react';

import Alert from '../ui/Alert';
import Button from '../ui/Button';
// First of the kit, out of alphabetical order: every other form (the property
// form, the developer, locality and page forms) reaches `MultiSelect`'s
// stylesheet before `EntityPicker`'s, `FormSection`'s and `ImageField`'s, and
// the admin chunks they share must hold them in one order or `build:ci`
// refuses the build (mini-css-extract "Conflicting order"). The filter bar
// used to import it ahead of this form; it no longer does.
import MultiSelect from './MultiSelect';
import EntityPicker from './EntityPicker';
import FormSection, { FormColumn } from './FormSection';
import IconPicker from './IconPicker';
import ImageField from './ImageField';
import IconButton from '../ui/IconButton';
import RichTextField from '../editor/RichTextField';
import SeoPanel from '../seo/SeoPanel';
import SlugField from './SlugField';
import SortableList from './SortableList';
import ToneSelect from './ToneSelect';
import useRowKeys from './useRowKeys';
import { ICON_ID_PATTERN } from '../../utils/validation';
import { getIn } from '../../hooks/useForm';
import { toSeoPaths } from '../seo/seoValues';
import { useToast } from '../common/ToastProvider';
import {
  DateField,
  Field,
  NumberField,
  PhoneField,
  SelectField,
  SwitchField,
  TextField,
  TextareaField,
  UrlField,
} from '../ui/FormField';

import styles from './MasterDataForm.module.css';

/** The fields a record keeps its prose in — what the SEO engine calls `content`. */
const CONTENT_FIELDS = ['content', 'description', 'bio'];

/**
 * The field of this form an SEO hint's path lands on, or `null`.
 *
 * The engine names what it measured — `content`, `images` — and a master-data
 * record keeps those under its own names: a category's `description`, an
 * author's `bio` and avatar.
 *
 * @param {string} path
 * @param {Array<{name: string, type?: string}>} fields
 * @returns {string|null}
 */
export function formFieldForSeoPath(path, fields = []) {
  const names = new Set(fields.map((field) => field.name));
  if (names.has(path)) return path;
  if (path === 'content' || path === 'tableOfContents') {
    return CONTENT_FIELDS.find((name) => names.has(name)) ?? null;
  }
  if (path === 'images') return fields.find((field) => field.type === 'image')?.name ?? null;
  return null;
}

/** What "focus this field" means when the id is on the column around a control. */
const FOCUSABLE_IN_COLUMN =
  '[contenteditable="true"], input:not([type="hidden"]), textarea, select, button';

/**
 * A form built from a list of field descriptions.
 *
 * `MasterDataPage` passes `config.formFields`; anything else that wants the
 * same fields in its own layout can pass its own list. The values, the errors
 * and the dirty flag all come from one `useForm` instance, so a 422 lands on
 * the right control whatever type it is (§5.3).
 *
 * `richtext` renders `RichTextEditor`, lazily: the editor is the heaviest thing
 * in the panel and only the forms that hold prose pay for it.
 *
 * @param {object} props
 * @param {Array<object>} props.fields
 * @param {ReturnType<typeof import('../../hooks/useForm').default>} props.form
 * @param {boolean} [props.disabled]
 * @param {Function} [props.checkSlug] handed to every `slug` field
 * @param {number|string} [props.excludeId]
 * @param {string} [props.slugBase]
 * @param {'compact'|'full'|false} [props.seoPanel] renders the SEO panel under
 *   the fields, bound to `form.values.seo` (D87)
 * @param {string} [props.seoEntityType] which `SEO_ENTITY_TYPES` member these
 *   records are — required when `seoPanel` is set
 * @param {object} [props.seoRecord] the record being edited, for the fields the
 *   panel shows but does not own (`id`, `updatedAt`)
 *
 * A field may also carry `visible(values)` — drawn only while it answers true,
 * as the "Retype the new e-mail" of your own account (prompt 51) — and
 * `action: { label, icon?, onClick(form) }`, a button under its control:
 * "Generate password".
 */
export default function MasterDataForm({
  fields = [],
  form,
  disabled = false,
  checkSlug,
  excludeId,
  slugBase = '/',
  seoPanel = false,
  seoEntityType,
  seoRecord,
  children,
}) {
  const toast = useToast();
  const baseId = useId();
  const columnId = (name) => `${baseId}-field-${String(name).replace(/[^a-zA-Z0-9]+/g, '-')}`;

  /**
   * An SEO hint about the record's own fields — "the description never uses
   * the focus keyword" — puts the cursor in that field of this form. Without
   * it the hint was a link that did nothing (prompt 51).
   */
  const focusRecordField = (path) => {
    const name = formFieldForSeoPath(path, fields);
    const element = name ? document.getElementById(columnId(name)) : null;
    if (!element) {
      toast.info('That field is not on this form — open the record’s own page to change it.');
      return;
    }
    const control = element.querySelector(FOCUSABLE_IN_COLUMN);
    control?.focus?.({ preventScroll: true });
    element.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  };

  // A 422 can name something no control owns — `errors.id` is how the API
  // refuses to demote the last admin — and a message with nowhere to land is a
  // message nobody reads.
  const owned = new Set(fields.map((field) => field.name));
  const unmatched = Object.entries(form.errors).filter(([key]) => !owned.has(key));

  return (
    <FormSection plain className={styles.form}>
      {unmatched.length > 0 ? (
        <FormColumn>
          <Alert tone="error">
            {unmatched.map(([key, message]) => (
              <p key={key} className={styles.formError}>
                {message}
              </p>
            ))}
          </Alert>
        </FormColumn>
      ) : null}

      {fields
        .filter((field) => !field.visible || field.visible(form.values))
        .map((field) => (
          <FormColumn key={field.name} half={field.half} id={columnId(field.name)}>
            <FormFieldControl
              field={field}
              form={form}
              disabled={disabled || field.disabled}
              checkSlug={checkSlug}
              excludeId={excludeId}
              slugBase={slugBase}
            />
            {field.action ? (
              <Button
                variant="link"
                size="sm"
                className={styles.fieldAction}
                disabled={disabled || field.disabled}
                icon={
                  field.action.icon ? (
                    <Icon icon={field.action.icon} width="16" height="16" />
                  ) : undefined
                }
                onClick={() => field.action.onClick(form)}
              >
                {field.action.label}
              </Button>
            ) : null}
          </FormColumn>
        ))}
      {seoPanel && seoEntityType ? (
        <FormColumn>
          <SeoPanel
            entityType={seoEntityType}
            entity={{ ...(seoRecord ?? {}), ...form.values }}
            seo={form.values.seo}
            variant={seoPanel === 'full' ? 'full' : 'compact'}
            errors={form.errors}
            disabled={disabled}
            excludeId={excludeId}
            checkSlug={checkSlug}
            slugBase={slugBase}
            onFocusField={focusRecordField}
            onSlugChange={(slug) => form.setField('slug', slug)}
            onChange={(patch, meta) => {
              // The analysis writing its own score back is not an edit, so the
              // dialog does not offer to discard changes nobody made.
              if (meta?.computed) {
                form.setComputed(toSeoPaths(patch));
                return;
              }
              // One dotted path at a time: `useForm.setField` composes on the
              // current values, so an edit and the analysis landing behind it
              // cannot overwrite each other.
              for (const [path, value] of Object.entries(toSeoPaths(patch))) {
                form.setField(path, value);
              }
            }}
          />
        </FormColumn>
      ) : null}

      {children ? <FormColumn>{children}</FormColumn> : null}
    </FormSection>
  );
}

/** One control, chosen by `field.type`. */
export function FormFieldControl({ field, form, disabled, checkSlug, excludeId, slugBase }) {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const value = getIn(form.values, field.name);
  const error = form.errors[field.name];
  const shared = {
    label: field.label,
    required: field.required,
    hint: field.hint,
    error,
    disabled,
  };

  const set = (next) => form.setField(field.name, next);
  const onBlur = () => form.handleBlur(field.name);

  switch (field.type) {
    case 'textarea':
      return (
        <TextareaField
          {...shared}
          rows={field.rows ?? 4}
          value={value ?? ''}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          onBlur={onBlur}
          onChange={(event) => set(event.target.value)}
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
          variant={field.variant ?? 'compact'}
          minHeight={field.minHeight ?? 180}
          placeholder={field.placeholder}
          value={value ?? ''}
          onChange={set}
        />
      );

    case 'list':
      return (
        <StringListField
          {...shared}
          field={field}
          value={Array.isArray(value) ? value : []}
          errors={form.errors}
          onChange={set}
        />
      );

    case 'select':
      return (
        <SelectField
          {...shared}
          options={field.options ?? []}
          placeholder={field.placeholder}
          value={value ?? ''}
          onBlur={onBlur}
          onChange={(event) => set(event.target.value)}
        />
      );

    case 'multiselect':
    case 'tags':
      return (
        <MultiSelect
          {...shared}
          options={field.options ?? []}
          value={Array.isArray(value) ? value : []}
          max={field.max}
          creatable={field.type === 'tags' && Boolean(field.onCreate)}
          onCreate={field.onCreate}
          placeholder={field.placeholder}
          onChange={set}
        />
      );

    case 'switch':
      // A switch is on unless it says otherwise, as `isActive` is; one whose
      // default is off (a menu flag) is on only when the record says so.
      return (
        <SwitchField
          label={field.label}
          hint={field.hint}
          error={error}
          disabled={disabled}
          checked={field.defaultValue === false ? value === true : value !== false}
          onChange={set}
        />
      );

    case 'number':
      return (
        <NumberField
          {...shared}
          min={field.min}
          max={field.max}
          step={field.step}
          value={value ?? ''}
          onBlur={onBlur}
          onChange={(event) => set(event.target.value === '' ? null : Number(event.target.value))}
        />
      );

    case 'date':
      return (
        <DateField
          {...shared}
          value={value ?? ''}
          onBlur={onBlur}
          onChange={(event) => set(event.target.value || null)}
        />
      );

    case 'url':
      return (
        <UrlField
          {...shared}
          hint={field.hint ?? 'Include https://'}
          value={value ?? ''}
          onBlur={onBlur}
          onChange={(event) => set(event.target.value || null)}
        />
      );

    case 'phone':
      return (
        <PhoneField
          {...shared}
          // Room for a number as people write it — "98450 12345", "+91
          // 98450-12345" — which `MasterDataPage` tidies to the ten digits a
          // record stores. Capped at ten, "98450 12345" was cut to "98450 1234"
          // and refused (QA-61).
          maxLength={18}
          value={value ?? ''}
          onBlur={onBlur}
          onChange={(event) => set(event.target.value || null)}
        />
      );

    case 'image':
      return (
        <ImageField
          label={field.label}
          required={field.required}
          error={error}
          disabled={disabled}
          hint={field.hint}
          ratio={field.ratio}
          alt={field.alt ?? ''}
          value={value ?? ''}
          onUpload={field.onUpload}
          onOpenMedia={field.onOpenMedia}
          onChange={(next) => set(next || null)}
        />
      );

    case 'slug':
      return (
        <SlugField
          label={field.label}
          required={field.required}
          error={error}
          disabled={disabled}
          value={value ?? ''}
          source={field.source ? (getIn(form.values, field.source) ?? '') : ''}
          sourceLabel={field.source === 'title' || !field.source ? 'title' : 'name'}
          checkSlug={checkSlug}
          excludeId={excludeId}
          base={field.base ?? slugBase}
          onChange={set}
        />
      );

    case 'rating':
      return (
        <RatingInput
          label={field.label}
          required={field.required}
          hint={field.hint}
          error={error}
          disabled={disabled}
          max={field.max ?? 5}
          value={Number(value) || 0}
          onChange={set}
        />
      );

    case 'tone':
      return (
        <ToneSelect
          label={field.label}
          required={field.required}
          error={error}
          disabled={disabled}
          value={value ?? 'primary'}
          onChange={set}
        />
      );

    case 'entity':
      return (
        <EntityPicker
          label={field.label}
          error={error}
          disabled={disabled}
          hint={field.hint}
          fetcher={field.fetcher}
          labelKey={field.labelKey}
          multiple={field.multiple !== false}
          max={field.max}
          orderable={field.orderable}
          renderOption={field.renderOption}
          selectedRecords={field.selectedRecords}
          resolveSelected={field.resolveSelected}
          value={value ?? (field.multiple === false ? null : [])}
          onChange={set}
        />
      );

    case 'icon': {
      // An id Iconify cannot resolve renders nothing at all, which reads as
      // "no icon chosen" rather than "that id is wrong". The placeholder says
      // which of the two it is while the field is still being typed in.
      const known = ICON_ID_PATTERN.test(String(value ?? ''));

      return (
        <div className={styles.iconField}>
          <TextField
            {...shared}
            hint={field.hint ?? 'An Iconify MDI id, e.g. mdi:home-city-outline'}
            value={value ?? ''}
            onBlur={onBlur}
            onChange={(event) => set(event.target.value)}
          />
          <div className={styles.iconRow}>
            <span className={styles.iconPreview} aria-hidden="true">
              {known ? (
                <Icon icon={value} width="24" height="24" />
              ) : (
                <Icon
                  icon="mdi:help-rhombus-outline"
                  width="24"
                  height="24"
                  className={styles.iconUnknown}
                />
              )}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => setIconPickerOpen(true)}
            >
              Browse icons
            </Button>
          </div>
          <IconPicker
            open={iconPickerOpen}
            currentIcon={value ?? ''}
            onClose={() => setIconPickerOpen(false)}
            onSelect={set}
          />
        </div>
      );
    }

    case 'password':
      return (
        <TextField
          {...shared}
          type="password"
          autoComplete="new-password"
          value={value ?? ''}
          placeholder={field.placeholder}
          onBlur={onBlur}
          onChange={(event) => set(event.target.value)}
        />
      );

    case 'email':
      return (
        <TextField
          {...shared}
          type="email"
          autoComplete="email"
          value={value ?? ''}
          onBlur={onBlur}
          onChange={(event) => set(event.target.value)}
        />
      );

    case 'text':
    default:
      return (
        <TextField
          {...shared}
          value={value ?? ''}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          onBlur={onBlur}
          onChange={(event) => set(event.target.value)}
        />
      );
  }
}

/**
 * A list of short strings the admin can reorder — a job's responsibilities, its
 * requirements, anything §6 types as `string[]`.
 *
 * Reordering is `SortableList`: drag on a mouse, ↑/↓ buttons everywhere else,
 * each move announced through its live region (§8.3). The order is the field's
 * value, so nothing is written until the form is saved.
 *
 * A 422 dots its nested keys (`responsibilities.2`), which is the key this
 * reads its per-row message from.
 *
 * @param {object} props
 * @param {object} props.field the descriptor — `label`, `addLabel`, `maxLength`
 * @param {Array<string>} props.value
 * @param {(value: Array<string>) => void} props.onChange
 * @param {Record<string, string>} [props.errors] the whole form's errors
 */
function StringListField({
  field,
  label,
  hint,
  error,
  required,
  value,
  errors = {},
  onChange,
  disabled,
}) {
  // Keyed so a moved row keeps the focus, not its neighbour (QA-60).
  const rowKeys = useRowKeys(value.length);
  const rows = value.map((text, index) => ({ id: rowKeys.keys[index], text }));
  const singular =
    field.singular ??
    String(label ?? 'item')
      .replace(/s$/i, '')
      .toLowerCase();
  // Each row is one of them: "Responsibility 2", not "Responsibilities 2" (QA-61).
  const rowLabel = `${singular.charAt(0).toUpperCase()}${singular.slice(1)}`;

  const update = (index, text) => onChange(value.map((row, at) => (at === index ? text : row)));
  const remove = (index) => {
    rowKeys.remove(index);
    onChange(value.filter((_row, at) => at !== index));
  };

  return (
    <fieldset className={styles.repeater}>
      <legend className={styles.repeaterLegend}>
        {label}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>
      {hint ? <p className={styles.repeaterHint}>{hint}</p> : null}

      {rows.length > 0 ? (
        <SortableList
          items={rows}
          disabled={disabled}
          label={`${label}, in order`}
          getId={(item) => item.id}
          getLabel={(item, index) => item.text || `${singular} ${index + 1}`}
          onReorder={(next, move) => {
            if (move) rowKeys.move(move.from, move.to);
            onChange(next.map((item) => item.text));
          }}
          renderItem={(item, index) => (
            <div className={styles.repeaterRow}>
              <TextField
                label={`${rowLabel} ${index + 1}`}
                fieldClassName={styles.repeaterField}
                value={item.text}
                disabled={disabled}
                maxLength={field.maxLength ?? 300}
                error={errors[`${field.name}.${index}`]}
                onChange={(event) => update(index, event.target.value)}
              />
              <IconButton
                label={`Remove ${singular} ${index + 1}`}
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

      {error ? (
        <p className={styles.repeaterError} role="alert">
          {error}
        </p>
      ) : null}

      <Button
        variant="outline"
        size="sm"
        className={styles.repeaterAdd}
        disabled={disabled}
        icon={<Icon icon="mdi:plus" width="16" height="16" />}
        onClick={() => onChange([...value, ''])}
      >
        {field.addLabel ?? `Add ${singular}`}
      </Button>
    </fieldset>
  );
}

/**
 * A 1–5 star rating, as a radio group.
 *
 * Stars are how a rating is read on the site, so they are how it is set here
 * too — but each star is a real radio, so the control is one tab stop, moves
 * with the arrow keys and announces "4 stars" rather than "button" (§8.3).
 *
 * @param {object} props
 * @param {number} props.value
 * @param {(value: number) => void} props.onChange
 * @param {number} [props.max]
 */
function RatingInput({ label, hint, error, required, value, onChange, disabled, max = 5 }) {
  const name = useId();
  const stars = Array.from({ length: max }, (_, index) => index + 1);

  return (
    <Field id={name} label={label} hint={hint} error={error} required={required} labelAs="span">
      {({ hintId, errorId }) => (
        <span
          className={styles.ratingRow}
          role="radiogroup"
          aria-label={label}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        >
          {stars.map((star) => (
            <label
              key={star}
              className={[styles.star, star <= value ? styles.starOn : ''].join(' ')}
            >
              <input
                type="radio"
                name={name}
                value={star}
                checked={star === value}
                disabled={disabled}
                className={styles.starInput}
                onChange={() => onChange(star)}
              />
              <Icon icon={star <= value ? 'mdi:star' : 'mdi:star-outline'} width="28" height="28" />
              <span className={styles.starLabel}>
                {star} {star === 1 ? 'star' : 'stars'}
              </span>
            </label>
          ))}
          <span className={styles.ratingValue} aria-hidden="true">
            {value}/{max}
          </span>
        </span>
      )}
    </Field>
  );
}
