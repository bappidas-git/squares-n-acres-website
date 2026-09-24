/**
 * The rules every lead form on the site is checked against.
 *
 * They are deliberately the client half of the mock's own validator: the
 * patterns come from `utils/validation.js`, which `mock-server/middleware`
 * shares, so a box that goes green here is not refused by a 422 there (§5.3).
 */

import { EMAIL_PATTERN, INDIAN_MOBILE_PATTERN } from './validation';

/** How long a name may be (§6.7 stores 80 characters). */
export const NAME_MAX_LENGTH = 80;

/** Letters, spaces, dots, apostrophes and hyphens — the punctuation of names. */
const NAME_PATTERN = /^[a-zA-Z\s.'-]+$/;

/**
 * Sanitize user input — strips leading/trailing whitespace and collapses
 * internal whitespace to single spaces. Safe for Laravel/MySQL payloads.
 */
export const sanitizeInput = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
};

/**
 * "Phone is required", "Subject is required" — the one sentence a box that was
 * left blank says, whatever kind of box it is.
 *
 * @param {string} label the field's visible label
 * @returns {string}
 */
export const getRequiredErrorMessage = (label = 'This field') => `${label} is required`;

/**
 * An Indian mobile number in one shape: `+919876543210`.
 *
 * The forms accept `+91 98765-43210`, `09876543210` and `9876543210`, and a
 * CRM that stores all three cannot tell that they are one person. Anything
 * that is not a valid mobile number comes back unchanged, so the validator —
 * not this — is what reports it.
 *
 * The country code comes off only when it is one — twelve digits starting 91 —
 * and the trunk zero only from eleven. Taking `91` off the front of any number
 * mangled every ten-digit mobile of the 91xxx series (`9123456780` read as
 * `23456780`), which then went out as typed and never matched the same number
 * sent with its `+91` (QA-53; `mock-server/lib/leadFilters.js` is the same
 * rule).
 *
 * @param {string} value
 * @returns {string} the normalised number, or `value` untouched
 */
export function normalizePhone(value) {
  if (typeof value !== 'string') return value;

  let local = value.replace(/[\s()-]/g, '').replace(/^\+/, '');
  if (local.length === 12 && local.startsWith('91')) local = local.slice(2);
  else if (local.length === 11 && local.startsWith('0')) local = local.slice(1);
  if (!/^[6-9]\d{9}$/.test(local)) return value;

  return `+91${local}`;
}

/**
 * A mobile number as the ten digits the records store: "98450 12345", "+91
 * 98450-12345" and "098450 12345" are all 9845012345 (QA-61). Which prefixes
 * come off is {@link normalizePhone}'s rule, less the `+91` it writes for a
 * lead. Anything that is not a mobile number is handed back as typed, for the
 * rules to refuse.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
export function tidyPhone(value) {
  const normalised = normalizePhone(value);
  return typeof normalised === 'string' && /^\+91[6-9]\d{9}$/.test(normalised)
    ? normalised.slice(3)
    : value;
}

/** The last ten digits of a stored number, for prefilling a `+91` input. */
export function localPhoneDigits(value) {
  if (value === null || value === undefined) return '';
  const digits = String(value).replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Returns an error message for a name field, or an empty string if valid.
 *
 * @param {string} name
 * @param {{required?: boolean, label?: string}} [options]
 */
export const getNameErrorMessage = (name, { required = true, label = 'Full name' } = {}) => {
  const sanitized = sanitizeInput(name);
  if (!sanitized) return required ? getRequiredErrorMessage(label) : '';
  if (sanitized.length < 2) return 'Name must be at least 2 characters';
  if (sanitized.length > NAME_MAX_LENGTH)
    return `Name must be ${NAME_MAX_LENGTH} characters or fewer`;
  if (!NAME_PATTERN.test(sanitized))
    return 'Name can only contain letters, spaces, hyphens, dots and apostrophes';
  return '';
};

/**
 * Returns an error message for an e-mail field, or an empty string if valid.
 *
 * @param {string} email
 * @param {boolean} [required] when true, an empty address is an error
 * @param {{label?: string}} [options]
 */
export const getEmailErrorMessage = (email, required = false, { label = 'E-mail' } = {}) => {
  const sanitized = sanitizeInput(email);
  if (!sanitized) return required ? getRequiredErrorMessage(label) : '';
  if (!EMAIL_PATTERN.test(sanitized)) return 'Enter a valid email address';
  return '';
};

/**
 * Returns an error message for a phone field, or an empty string if valid.
 *
 * Only Indian mobile numbers are accepted: ten digits starting 6–9, with an
 * optional `+91`, however the visitor spaced or hyphenated them.
 *
 * @param {string} phone
 * @param {{required?: boolean, label?: string}} [options]
 */
export const getMobileErrorMessage = (phone, { required = true, label = 'Phone' } = {}) => {
  const sanitized = sanitizeInput(phone);
  if (!sanitized) return required ? getRequiredErrorMessage(label) : '';
  if (!INDIAN_MOBILE_PATTERN.test(normalizePhone(sanitized)))
    return 'Enter a valid 10-digit Indian mobile number';
  return '';
};

/**
 * Validates the three boxes every lead form has in common.
 *
 * @param {object} formData `{ name, email, phone }`
 * @param {{emailRequired?: boolean}} [options]
 * @returns {{valid: boolean, errors: object}}
 */
export const validateLeadForm = (formData, options = {}) => {
  const { emailRequired = false } = options;
  const errors = {};

  const nameErr = getNameErrorMessage(formData.name || '');
  if (nameErr) errors.name = nameErr;

  const emailErr = getEmailErrorMessage(formData.email || '', emailRequired);
  if (emailErr) errors.email = emailErr;

  const phoneErr = getMobileErrorMessage(formData.phone || '');
  if (phoneErr) errors.phone = phoneErr;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};
