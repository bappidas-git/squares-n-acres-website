/**
 * The client half of the contract's validation (00_MASTER_CONTEXT.md §5.3).
 *
 * The rules are the ones `mock-server/middleware/validate.js` enforces, read
 * from the same descriptors in `src/services/schemas/` — so a form that passes
 * here is a body the API accepts, and the sentence the user reads before
 * submitting is the sentence the server would have sent back.
 *
 *   validate(values, schemas['user.create'])        // → { email: 'The email …' }
 *   validate(patch, schemas['user.patch'], { partial: true })
 *
 * The answer is **flat and dotted**, exactly like a 422 body: `location.city`
 * and `images.0.alt` are keys, not nested objects, so one lookup serves a field
 * whatever its depth (§5.3). One message per field — the first thing wrong with
 * it is the thing to fix.
 */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const INDIAN_MOBILE_PATTERN = /^(\+91)?[6-9]\d{9}$/;
export const SLUG_PATTERN = /^[a-z0-9-]+$/;
export const URL_PATTERN = /^https?:\/\/[^\s]+$/i;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Whether a value is the "nothing" an empty control produces for a field that
 * is allowed to hold nothing.
 *
 * A form input has no `null`: an untouched optional URL box holds `''`. The
 * descriptor says what that means — a field declared `nullable` and not
 * `required` may be empty, so `''` is absent rather than a malformed URL. A
 * plain `string` field keeps `''` as a real value.
 */
const isBlankOptional = (value, descriptor) =>
  value === '' && !descriptor.required && Boolean(descriptor.nullable);

/** What `required` reads as absent: `undefined`, `null`, `''`, `[]`. */
export const isEmptyValue = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

/** True when the client may never send the field (§5.5) — it is not validated. */
const isReadOnly = (descriptor) => Boolean(descriptor?.read || descriptor?.serverManaged);

/**
 * The message for a value that is not of its descriptor's `type`.
 *
 * @returns {string|null} `null` when the value is of the type
 */
function typeError(key, value, descriptor) {
  switch (descriptor.type) {
    case 'string':
    case 'html':
      return typeof value === 'string' ? null : `The ${key} must be a string.`;
    case 'int':
      return Number.isInteger(value) ? null : `The ${key} must be an integer.`;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? null
        : `The ${key} must be a number.`;
    case 'bool':
      return typeof value === 'boolean' ? null : `The ${key} field must be true or false.`;
    case 'enum': {
      const allowed = [...(descriptor.enum ?? []), ...(descriptor.accepts ?? [])];
      return allowed.includes(value) ? null : `The selected ${key} is invalid.`;
    }
    case 'date':
      return typeof value === 'string' &&
        DATE_PATTERN.test(value) &&
        !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
        ? null
        : `The ${key} does not match the format Y-m-d.`;
    case 'datetime':
      return typeof value === 'string' && !Number.isNaN(Date.parse(value))
        ? null
        : `The ${key} is not a valid date.`;
    case 'email':
      return typeof value === 'string' && EMAIL_PATTERN.test(value)
        ? null
        : `The ${key} must be a valid email address.`;
    case 'phone':
      return typeof value === 'string' && INDIAN_MOBILE_PATTERN.test(value.replace(/[\s-]/g, ''))
        ? null
        : `The ${key} must be a valid Indian mobile number.`;
    case 'url':
      return typeof value === 'string' && URL_PATTERN.test(value)
        ? null
        : `The ${key} must be a valid URL.`;
    case 'slug':
      return typeof value === 'string' && SLUG_PATTERN.test(value)
        ? null
        : `The ${key} may only contain lowercase letters, numbers and hyphens.`;
    case 'array':
      return Array.isArray(value) ? null : `The ${key} must be an array.`;
    case 'object':
      return isPlainObject(value) ? null : `The ${key} must be an object.`;
    default:
      return null;
  }
}

/** `min` / `max` / `maxLength` / `pattern`, whose meaning depends on the type. */
function boundsError(key, value, descriptor) {
  const { min, max, maxLength, pattern } = descriptor;

  if (typeof value === 'number') {
    if (min !== undefined && value < min) return `The ${key} must be at least ${min}.`;
    if (max !== undefined && value > max) return `The ${key} may not be greater than ${max}.`;
    return null;
  }

  if (typeof value === 'string') {
    if (min !== undefined && value.length < min) {
      return `The ${key} must be at least ${min} characters.`;
    }
    if (maxLength !== undefined && value.length > maxLength) {
      return `The ${key} may not be greater than ${maxLength} characters.`;
    }
    if (pattern !== undefined && !new RegExp(pattern).test(value)) {
      return `The ${key} format is invalid.`;
    }
    return null;
  }

  if (Array.isArray(value)) {
    if (min !== undefined && value.length < min) {
      return `The ${key} must have at least ${min} items.`;
    }
    if (max !== undefined && value.length > max) {
      return `The ${key} may not have more than ${max} items.`;
    }
  }

  return null;
}

/** Writes the first failure of one value into `errors` under its dotted key. */
function checkValue(key, value, descriptor, errors, options) {
  const push = (message) => {
    if (message && errors[key] === undefined) errors[key] = message;
  };

  if (isBlankOptional(value, descriptor)) return;

  if (value === null) {
    if (descriptor.required) push(`The ${key} field is required.`);
    else if (!descriptor.nullable) push(typeError(key, value, descriptor));
    return;
  }

  const wrongType = typeError(key, value, descriptor);
  if (wrongType) {
    push(wrongType);
    return;
  }

  push(boundsError(key, value, descriptor));

  if (descriptor.type === 'array' && descriptor.items) {
    value.forEach((entry, index) => {
      const itemKey = `${key}.${index}`;
      if (descriptor.items.type === 'object' && descriptor.items.shape) {
        checkShape(descriptor.items.shape, entry, itemKey, errors, options);
        return;
      }
      checkValue(itemKey, entry, descriptor.items, errors, options);
    });
  }

  if (descriptor.type === 'object' && descriptor.shape) {
    checkShape(descriptor.shape, value, key, errors, options);
  }
}

/** Validates an object against a `{ field: descriptor }` shape. */
function checkShape(shape, values, prefix, errors, options) {
  if (!isPlainObject(values)) {
    if (errors[prefix] === undefined) errors[prefix] = `The ${prefix} must be an object.`;
    return;
  }

  for (const [field, descriptor] of Object.entries(shape)) {
    if (isReadOnly(descriptor)) continue;

    const key = prefix ? `${prefix}.${field}` : field;
    const present = Object.prototype.hasOwnProperty.call(values, field);

    if (!present || values[field] === undefined) {
      // A create may leave out a field the API defaults; a form that states the
      // whole record may not, which is the §5.8 difference between POST and PUT.
      const filledByServer =
        options.fillDefaults && Object.prototype.hasOwnProperty.call(descriptor, 'default');

      if (!options.partial && descriptor.required && !filledByServer) {
        errors[key] = `The ${key} field is required.`;
      }
      continue;
    }

    const value = values[field];
    if (descriptor.required && isEmptyValue(value)) {
      errors[key] = `The ${key} field is required.`;
      continue;
    }

    checkValue(key, value, descriptor, errors, options);
  }
}

/**
 * Validates a set of form values against a schema descriptor.
 *
 * @param {object} values
 * @param {Record<string, object>} descriptor a `src/services/schemas` shape
 * @param {object} [options]
 * @param {boolean} [options.partial] skip `required` for absent keys (a PATCH)
 * @param {boolean} [options.fillDefaults] exempt required fields carrying a default (a POST)
 * @returns {Record<string, string>} `{ 'dotted.key': message }`, empty when valid
 */
export function validate(values, descriptor, options = {}) {
  if (!descriptor || typeof descriptor !== 'object') return {};

  const errors = {};
  checkShape(descriptor, values ?? {}, '', errors, {
    partial: Boolean(options.partial),
    fillDefaults: Boolean(options.fillDefaults),
  });
  return errors;
}

export default validate;
