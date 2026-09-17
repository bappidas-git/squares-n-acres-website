import { DateField, NumberField, PhoneField, SelectField, TextField, TextareaField } from '../ui';

/**
 * One field descriptor, rendered as the UI kit control it describes.
 *
 * Every control comes from `ui/FormField`, which is what gives a lead form the
 * things the boilerplate's never had (ADD-09): a **visible** `<label>`, the
 * error and the hint linked with `aria-describedby`, and `aria-invalid` on an
 * invalid box (§8.3).
 *
 * Shared by `LeadForm` and `RequirementFields` so that the six requirement
 * selects look and behave exactly like the boxes above them.
 *
 * @param {object} props
 * @param {object} props.field `{ name, label, type, required?, placeholder?,
 *   options?, helper?, half?, autoComplete?, rows? }`
 * @param {string} props.value
 * @param {object} [props.values] every answer so far, for a select whose
 *   choices depend on another box
 * @param {string} [props.error]
 * @param {(name: string, value: string) => void} props.onChange
 * @param {boolean} [props.disabled]
 */
export default function LeadFormField({
  field,
  value = '',
  values = null,
  error,
  onChange,
  disabled = false,
}) {
  const common = {
    label: field.label,
    required: Boolean(field.required),
    hint: field.helper,
    error,
    disabled,
    value,
    onChange: (event) => onChange?.(field.name, event.target.value),
  };

  switch (field.type) {
    case 'textarea':
      return (
        <TextareaField
          {...common}
          name={field.name}
          rows={field.rows ?? 4}
          placeholder={field.placeholder}
        />
      );

    case 'select':
      return (
        <SelectField
          {...common}
          name={field.name}
          placeholder={field.placeholder ?? `Select ${String(field.label).toLowerCase()}`}
          options={optionsOf(field, values)}
        />
      );

    case 'tel':
      // The design-system phone input fixes the `+91` prefix, but the visitor
      // may still paste `+91 98765-43210` from a contact card, so the ten-digit
      // cap of the default is lifted and `normalizePhone` tidies it on submit.
      return (
        <PhoneField
          {...common}
          name={field.name}
          maxLength={18}
          placeholder={field.placeholder}
          autoComplete={field.autoComplete ?? 'tel'}
        />
      );

    case 'number':
      return (
        <NumberField
          {...common}
          name={field.name}
          placeholder={field.placeholder}
          min={field.min}
        />
      );

    case 'date':
      return <DateField {...common} name={field.name} min={field.min} max={field.max} />;

    default:
      return (
        <TextField
          {...common}
          name={field.name}
          type={field.type === 'email' ? 'email' : 'text'}
          inputMode={field.type === 'email' ? 'email' : undefined}
          placeholder={field.placeholder}
          autoComplete={field.autoComplete}
          maxLength={field.maxLength}
        />
      );
  }
}

/**
 * A select's choices, which may depend on the other answers.
 *
 * The budget bands of a rental requirement are two orders of magnitude away
 * from a purchase's (D90), so `options` may be a function of the current
 * values rather than a fixed array.
 *
 * @param {object} field
 * @param {object|null} values the answers so far
 * @returns {Array<{value: string|number, label: string}>}
 */
export function optionsOf(field, values) {
  const options =
    typeof field?.options === 'function' ? field.options(values ?? {}) : field?.options;
  return Array.isArray(options) ? options : [];
}
