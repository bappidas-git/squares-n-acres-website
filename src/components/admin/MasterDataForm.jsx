import { useState } from 'react';
import { Icon } from '@iconify/react';

import Alert from '../ui/Alert';
import Button from '../ui/Button';
import EntityPicker from './EntityPicker';
import FormSection, { FormColumn } from './FormSection';
import IconPicker from './IconPicker';
import ImageField from './ImageField';
import MultiSelect from './MultiSelect';
import SlugField from './SlugField';
import ToneSelect from './ToneSelect';
import { ICON_ID_PATTERN } from '../../utils/validation';
import { getIn } from '../../hooks/useForm';
import {
  DateField,
  NumberField,
  PhoneField,
  SelectField,
  SwitchField,
  TextField,
  TextareaField,
  UrlField,
} from '../ui/FormField';

import styles from './MasterDataForm.module.css';

/**
 * A form built from a list of field descriptions.
 *
 * `MasterDataPage` passes `config.formFields`; anything else that wants the
 * same fields in its own layout can pass its own list. The values, the errors
 * and the dirty flag all come from one `useForm` instance, so a 422 lands on
 * the right control whatever type it is (§5.3).
 *
 * `richtext` renders a textarea until prompt 32 installs the editor — a field
 * that stores HTML, minus the toolbar.
 *
 * @param {object} props
 * @param {Array<object>} props.fields
 * @param {ReturnType<typeof import('../../hooks/useForm').default>} props.form
 * @param {boolean} [props.disabled]
 * @param {Function} [props.checkSlug] handed to every `slug` field
 * @param {number|string} [props.excludeId]
 * @param {string} [props.slugBase]
 */
export default function MasterDataForm({
  fields = [],
  form,
  disabled = false,
  checkSlug,
  excludeId,
  slugBase = '/',
  children,
}) {
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

      {fields.map((field) => (
        <FormColumn key={field.name} half={field.half}>
          <FormFieldControl
            field={field}
            form={form}
            disabled={disabled || field.disabled}
            checkSlug={checkSlug}
            excludeId={excludeId}
            slugBase={slugBase}
          />
        </FormColumn>
      ))}
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
    case 'richtext':
      return (
        <TextareaField
          {...shared}
          hint={field.type === 'richtext' ? (field.hint ?? 'HTML is allowed.') : field.hint}
          rows={field.rows ?? (field.type === 'richtext' ? 8 : 4)}
          value={value ?? ''}
          placeholder={field.placeholder}
          onBlur={onBlur}
          onChange={(event) => set(event.target.value)}
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
      return (
        <SwitchField
          label={field.label}
          hint={field.hint}
          error={error}
          disabled={disabled}
          checked={value !== false}
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
          checkSlug={checkSlug}
          excludeId={excludeId}
          base={field.base ?? slugBase}
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
