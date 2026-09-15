/**
 * Centralized validation utilities for all lead collection forms.
 * Used across the entire project for consistent validation behaviour.
 */

/**
 * Sanitize user input — strips leading/trailing whitespace and collapses
 * internal whitespace to single spaces. Safe for Laravel/MySQL payloads.
 */
export const sanitizeInput = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
};

/**
 * Returns an error message for the name field, or empty string if valid.
 * Rules:
 *  - Required (non-empty after trim)
 *  - Minimum 2 characters
 *  - Only letters, spaces, hyphens, apostrophes, and dots allowed
 */
export const getNameErrorMessage = (name) => {
  const sanitized = sanitizeInput(name);
  if (!sanitized) return 'Full Name is required';
  if (sanitized.length < 2) return 'Name must be at least 2 characters';
  if (!/^[a-zA-Z\s.'\-]+$/.test(sanitized))
    return 'Name can only contain letters, spaces, hyphens, and dots';
  return '';
};

/**
 * Returns an error message for the email field, or empty string if valid.
 * @param {string} email
 * @param {boolean} required — when true, empty email is an error
 */
export const getEmailErrorMessage = (email, required = false) => {
  const sanitized = sanitizeInput(email);
  if (!sanitized) {
    return required ? 'Email is required' : '';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) return 'Enter a valid email address';
  return '';
};

/**
 * Returns an error message for the mobile/phone field, or empty string if valid.
 * Accepts Indian mobile numbers (10 digits starting with 6-9) or
 * international format with optional + prefix and 10-15 digits.
 */
export const getMobileErrorMessage = (phone) => {
  const sanitized = sanitizeInput(phone);
  if (!sanitized) return 'Phone number is required';
  // Strip spaces, hyphens, parentheses for digit check
  const digitsOnly = sanitized.replace(/[\s()\-+]/g, '');
  if (digitsOnly.length < 10) return 'Phone number must be at least 10 digits';
  if (digitsOnly.length > 15) return 'Phone number is too long';
  // Accept: optional +, then digits/spaces/hyphens/parens
  const phoneRegex = /^[+]?[\d\s()\-]{10,15}$/;
  if (!phoneRegex.test(sanitized)) return 'Enter a valid phone number';
  return '';
};

/**
 * Validates a standard lead form with name, email, phone.
 * Returns { valid: boolean, errors: { name?, email?, phone? } }.
 * @param {object} formData — { name, email, phone }
 * @param {object} options — { emailRequired: boolean }
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
