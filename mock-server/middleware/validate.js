/**
 * Request-body validation (00_MASTER_CONTEXT.md §5.3, §5.8).
 *
 * The rules come from the field descriptors in `mock-server/schemas/models.js`
 * — the same descriptors `scripts/validate-seed.js` checks the seed against and
 * `scripts/generate-backend-guidelines.js` renders as Laravel rules — so a body
 * the mock accepts is a body Laravel will accept.
 *
 * Failures answer 422 in Laravel's shape, with nested keys dotted:
 *
 *   { "message": "The given data was invalid.",
 *     "errors": { "location.localityId": ["The location.localityId field is required."],
 *                 "images.0.alt": ["The images.0.alt field is required."] } }
 *
 * Besides `required`, a descriptor may carry `requiredIf: { field, in: [...] }`
 * — Laravel's `required_if:<field>,<values>` — for a field that is only
 * mandatory in some states, such as a property's `possessionDate` while it is
 * pre-launch or under construction (§6.1). Like Laravel, the rule reads the
 * **body** rather than the stored record, so it fires on a `PATCH` exactly when
 * that `PATCH` is the write setting the state it depends on.
 *
 * And `exists: { collection, field }` — Laravel's `exists:<table>,<column>` —
 * for a field that names another record by something other than its id: a
 * property's `segment` is the slug of a `segments` record (QA-52). It is
 * checked when the caller hands over `lookup`, the way to read that collection.
 */

const { validation } = require('./errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INDIAN_MOBILE_RE = /^(\+91)?[6-9]\d{9}$/;
// §5.9: the API derives a slug from the title when the client sends an empty
// one, so the empty string is a *request to derive* rather than a bad slug. A
// slug that must be there is `required`, and an empty one is caught by that
// rule before this pattern is ever consulted.
const SLUG_RE = /^[a-z0-9-]*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A value that `required` treats as absent: `undefined`, `''`, `[]`. */
const isEmpty = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

/** True when the client may never send this field (§5.5). */
const isReadOnly = (descriptor) => Boolean(descriptor?.read || descriptor?.serverManaged);

/**
 * Whether a `requiredIf` descriptor is armed by the body it sits in.
 *
 * The sibling has to be **present** for the rule to fire: on a partial write
 * that says nothing about `constructionStatus`, the possession date is not this
 * request's business, which is the `required_if` semantics Laravel applies to
 * the payload it is handed.
 *
 * @param {object} descriptor
 * @param {object} siblings the object the field belongs to
 * @returns {boolean}
 */
function requiredIfArmed(descriptor, siblings) {
  const rule = descriptor?.requiredIf;
  if (!rule || !isPlainObject(siblings)) return false;
  if (!Object.prototype.hasOwnProperty.call(siblings, rule.field)) return false;
  return (rule.in ?? []).includes(siblings[rule.field]);
}

/**
 * Checks one scalar against its descriptor's `type`.
 *
 * @returns {string|null} the message, or `null` when the value is of the type
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
        DATE_RE.test(value) &&
        !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
        ? null
        : `The ${key} does not match the format Y-m-d.`;
    case 'datetime':
      return typeof value === 'string' && !Number.isNaN(Date.parse(value))
        ? null
        : `The ${key} is not a valid date.`;
    case 'email':
      return typeof value === 'string' && EMAIL_RE.test(value)
        ? null
        : `The ${key} must be a valid email address.`;
    case 'phone':
      return typeof value === 'string' && INDIAN_MOBILE_RE.test(value.replace(/[\s-]/g, ''))
        ? null
        : `The ${key} must be a valid Indian mobile number.`;
    case 'url':
      return typeof value === 'string' && /^https?:\/\/[^\s]+$/i.test(value)
        ? null
        : `The ${key} must be a valid URL.`;
    case 'slug':
      return typeof value === 'string' && SLUG_RE.test(value)
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

/** Checks `min` / `max` / `maxLength`, whose meaning depends on the type. */
function boundsErrors(key, value, descriptor) {
  const messages = [];
  const { min, max, maxLength, pattern } = descriptor;

  if (typeof value === 'number') {
    if (min !== undefined && value < min) messages.push(`The ${key} must be at least ${min}.`);
    if (max !== undefined && value > max) {
      messages.push(`The ${key} may not be greater than ${max}.`);
    }
  } else if (typeof value === 'string') {
    if (min !== undefined && value.length < min) {
      messages.push(`The ${key} must be at least ${min} characters.`);
    }
    if (maxLength !== undefined && value.length > maxLength) {
      messages.push(`The ${key} may not be greater than ${maxLength} characters.`);
    }
    if (pattern !== undefined && !new RegExp(pattern).test(value)) {
      messages.push(`The ${key} format is invalid.`);
    }
  } else if (Array.isArray(value)) {
    if (min !== undefined && value.length < min) {
      messages.push(`The ${key} must have at least ${min} items.`);
    }
    if (max !== undefined && value.length > max) {
      messages.push(`The ${key} may not have more than ${max} items.`);
    }
  }

  return messages;
}

/** `unique: true` — no other row of the collection may already hold the value. */
function uniqueError(key, field, value, { collection, excludeId }) {
  if (!Array.isArray(collection)) return null;
  const exclude = excludeId === undefined || excludeId === null ? null : String(excludeId);

  const taken = collection.some(
    (record) =>
      (exclude === null || String(record?.id) !== exclude) &&
      record?.[field] !== undefined &&
      record?.[field] !== null &&
      String(record[field]).toLowerCase() === String(value).toLowerCase()
  );

  return taken ? `The ${key} has already been taken.` : null;
}

/**
 * `exists: { collection, field }` — some row of another collection holds the
 * value in `field`. A caller that cannot reach that collection passes no
 * `lookup`, and the rule stands aside rather than refusing everything.
 */
function existsError(key, value, rule, { lookup }) {
  if (typeof lookup !== 'function' || !rule?.collection) return null;
  const rows = lookup(rule.collection);
  if (!Array.isArray(rows)) return null;

  const field = rule.field ?? 'id';
  const found = rows.some(
    (record) => record?.[field] !== undefined && String(record[field]) === String(value)
  );
  return found ? null : `The selected ${key} is invalid.`;
}

/**
 * Validates one value against one descriptor, writing every message it finds
 * into `errors` under `key` (the dotted path).
 */
function validateValue(key, field, value, descriptor, errors, options) {
  const push = (message) => {
    if (!message) return;
    errors[key] = errors[key] ?? [];
    errors[key].push(message);
  };

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

  boundsErrors(key, value, descriptor).forEach(push);

  if (descriptor.unique) push(uniqueError(key, field, value, options));
  if (descriptor.exists) push(existsError(key, value, descriptor.exists, options));

  if (descriptor.type === 'array' && descriptor.items) {
    value.forEach((entry, index) => {
      const itemKey = `${key}.${index}`;
      if (descriptor.items.type === 'object' && descriptor.items.shape) {
        validateShape(descriptor.items.shape, entry, itemKey, errors, options);
        return;
      }
      validateValue(itemKey, field, entry, descriptor.items, errors, options);
    });
  }

  if (descriptor.type === 'object' && descriptor.shape) {
    validateShape(descriptor.shape, value, key, errors, options);
  }
}

/** Validates an object against a `{ field: descriptor }` shape. */
function validateShape(shape, body, prefix, errors, options) {
  if (!isPlainObject(body)) {
    errors[prefix] = errors[prefix] ?? [];
    errors[prefix].push(`The ${prefix} must be an object.`);
    return;
  }

  for (const [field, descriptor] of Object.entries(shape)) {
    if (isReadOnly(descriptor)) continue;

    const key = prefix ? `${prefix}.${field}` : field;
    const present = Object.prototype.hasOwnProperty.call(body, field);

    const conditionallyRequired = requiredIfArmed(descriptor, body);

    if (!present || body[field] === undefined) {
      // A create may leave out any field the model gives a default: the server
      // fills it, which is what makes `POST /leads` work without `status` or
      // `priority`. A replace may not — a `PUT` states the whole record, so an
      // omission there is a silent wipe rather than an intention (§5.8).
      const filledByServer =
        options.fillDefaults && Object.prototype.hasOwnProperty.call(descriptor, 'default');

      if (conditionallyRequired || (!options.partial && descriptor.required && !filledByServer)) {
        errors[key] = errors[key] ?? [];
        errors[key].push(`The ${key} field is required.`);
      }
      continue;
    }

    const value = body[field];
    if ((descriptor.required || conditionallyRequired) && isEmpty(value)) {
      errors[key] = errors[key] ?? [];
      errors[key].push(`The ${key} field is required.`);
      continue;
    }

    validateValue(key, field, value, descriptor, errors, options);
  }
}

/**
 * Validates a request body against a schema descriptor.
 *
 * @param {Record<string, object>} schema `{ field: descriptor }`
 * @param {object} body
 * @param {{partial?: boolean, fillDefaults?: boolean, collection?: Array<object>, excludeId?: number|string|null, lookup?: (name: string) => Array<object>}} [options]
 *   `partial` skips the `required` checks (a `PATCH`); `fillDefaults` exempts
 *   required fields that carry a default (a `POST`); `collection` and
 *   `excludeId` back the `unique` rule; `lookup` reads another collection for
 *   the `exists` rule.
 * @throws {import('./errors').ApiError} 422 when anything failed
 */
function validateBody(schema, body, options = {}) {
  const errors = {};
  const resolved = {
    partial: Boolean(options.partial),
    fillDefaults: Boolean(options.fillDefaults),
    collection: options.collection,
    excludeId: options.excludeId ?? null,
    lookup: options.lookup,
  };

  validateShape(schema, body ?? {}, '', errors, resolved);

  if (Object.keys(errors).length > 0) throw validation(errors);
}

/**
 * Validates writes that reach the generic JSON Server router.
 *
 * `POST` and `PUT` are checked in full — a `PUT` that omits a required field is
 * a 422, never a silent wipe (§5.8) — while `PATCH` only checks what it sends.
 *
 * @param {{getModel: Function, getCollection: Function}} deps
 * @returns {import('express').RequestHandler}
 */
function validateWrite({ getModel, getCollection }) {
  return (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      next();
      return;
    }

    const segments = req.path.split('/').filter(Boolean);
    if (segments.length === 0 || segments.length > 2) {
      next();
      return;
    }

    const [name, id] = segments;
    const model = getModel(name);
    if (!model) {
      next();
      return;
    }

    try {
      validateBody(model.fields, req.body, {
        // A singleton is always merged into, never replaced wholesale (§5.14).
        partial: req.method === 'PATCH' || Boolean(model.singleton),
        fillDefaults: req.method === 'POST',
        collection: model.singleton ? undefined : getCollection(name),
        excludeId: id ?? null,
        lookup: getCollection,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { validateBody, validateWrite, isReadOnly, isEmpty };
