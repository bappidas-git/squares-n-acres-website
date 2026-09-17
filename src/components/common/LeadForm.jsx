import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import leadService from '../../services/leadService';
import { useToast } from './ToastProvider';
import {
  getNameErrorMessage,
  getEmailErrorMessage,
  getMobileErrorMessage,
  sanitizeInput,
} from '../../utils/validators';
import styles from './LeadForm.module.css';

/**
 * The typed answers, trimmed, with the untouched optional boxes left out.
 *
 * An empty optional field is not an empty value the API can store: §6.7 types
 * `email` as an e-mail and `message` as a string, and `''` fails both, so a
 * lead whose e-mail box was never filled in came back 422 instead of being
 * filed. A key that is absent takes the schema's own default (`null`).
 */
const filled = (values) =>
  Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
  );

/**
 * Merges one value into the request body, honouring the field's own mapping.
 *
 * A descriptor may say `group: 'requirement'` — the answer nests under that key
 * of the body (§6.7 stores what a visitor is looking for under `requirement`)
 * — and `toBody(value)` — the answer becomes the object it returns, which is
 * how one "budget" select fills `budgetMin` and `budgetMax`.
 */
function mergeValue(body, field, name, value) {
  const pairs = field?.toBody ? (field.toBody(value) ?? {}) : { [name]: value };
  if (!field?.group) return Object.assign(body, pairs);
  body[field.group] = { ...(body[field.group] ?? {}), ...pairs };
  return body;
}

/** `{ ...target, ...patch }`, merging a nested object rather than replacing it. */
function mergeBody(target, patch) {
  for (const [key, value] of Object.entries(patch ?? {})) {
    const existing = target[key];
    const bothObjects =
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing) &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value);
    target[key] = bothObjects ? { ...existing, ...value } : value;
  }
  return target;
}

/**
 * A lead form.
 *
 * `hiddenFields` carries the context the visitor never types — the locality of
 * the guide they are reading, the article they came from — straight into the
 * `POST /leads` body (§6.7), and a field may carry a `defaultValue` the visitor
 * starts from and can edit, which is how the builder page opens its message box
 * on "Interested in projects by …". Prompt 28 unifies every form on the site
 * behind one component; these are the parts of that unification the locality
 * and builder pages need.
 *
 * @param {object} props
 * @param {Array<object>} [props.fields] defaults to name / email / phone;
 *   `{ name, label, type, required?, placeholder?, options?, defaultValue?,
 *   group?, toBody? }` — see {@link mergeValue} for the last two; `options`
 *   may be a function of the current answers
 * @param {string} [props.source] a `LEAD_SOURCES` value
 * @param {number|null} [props.propertyId]
 * @param {object} [props.hiddenFields] merged into the request body
 * @param {(values: object) => void} [props.onSuccess] called with the typed
 *   answers once `POST /leads` has accepted them, so a host can remember the
 *   visitor's details or show a success panel of its own (ADD-09)
 */
const LeadForm = ({
  title = 'Get in Touch',
  subtitle = '',
  fields = [],
  source = 'website',
  propertyId = null,
  hiddenFields = null,
  onSuccess,
  className = '',
}) => {
  const defaultFields = [
    { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Your Name *' },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      placeholder: 'Email Address *',
    },
    { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: 'Phone Number *' },
  ];

  const formFields = fields.length > 0 ? fields : defaultFields;

  const initialValues = {};
  formFields.forEach((f) => {
    initialValues[f.name] = f.defaultValue ?? '';
  });

  const toast = useToast();
  const [formData, setFormData] = useState(initialValues);

  /**
   * A select's choices, which may depend on the other answers: the budget
   * bands of a rental requirement are two orders of magnitude away from a
   * purchase's (D90), so `options` may be a function of the current values.
   */
  const optionsOf = (field, values = formData) =>
    (typeof field.options === 'function' ? field.options(values) : field.options) || [];
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validateField = (field, value) => {
    if (field.name === 'name') return getNameErrorMessage(value);
    if (field.type === 'email') return getEmailErrorMessage(value, field.required);
    if (field.type === 'tel') return getMobileErrorMessage(value);
    if (field.required && !sanitizeInput(value)) return `${field.label} is required`;
    return '';
  };

  const validate = () => {
    const newErrors = {};
    let valid = true;
    formFields.forEach((field) => {
      const err = validateField(field, formData[field.name] || '');
      if (err) {
        newErrors[field.name] = err;
        valid = false;
      }
    });
    setErrors(newErrors);
    return valid;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // An answer that the new choices no longer offer is dropped rather than
      // submitted invisibly — switching to Rent must not send a ₹1 Cr budget.
      for (const field of formFields) {
        if (field.name === name || typeof field.options !== 'function') continue;
        const current = next[field.name];
        if (!current) continue;
        const offered = optionsOf(field, next).some(
          (option) => String(option.value) === String(current)
        );
        if (!offered) next[field.name] = '';
      }
      return next;
    });

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    try {
      setSubmitting(true);

      const body = { source, ...(propertyId ? { propertyId } : {}) };
      const descriptors = new Map(formFields.map((field) => [field.name, field]));
      for (const [name, value] of Object.entries(filled(formData))) {
        mergeValue(body, descriptors.get(name), name, value);
      }

      const response = await leadService.create(mergeBody(body, hiddenFields));
      setSubmitted(true);
      toast.success(response?.message || 'Thank you — we will be in touch shortly.');
      onSuccess?.(filled(formData));
    } catch (error) {
      setErrors((previous) => ({
        ...previous,
        ...Object.fromEntries(
          Object.entries(error?.errors ?? {}).map(([field, messages]) => [field, messages[0]])
        ),
      }));
      setSubmitError(error?.message || 'Something went wrong. Please try again.');
      toast.error(error?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${styles.wrapper} ${className}`}>
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            className={styles.success}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.checkCircle}>
              <motion.div
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Icon icon="mdi:check-circle" className={styles.successIcon} />
              </motion.div>
            </div>
            <h3 className={styles.successTitle}>Thank You!</h3>
            <p className={styles.successText}>
              We've received your request. Our team will reach out to you shortly.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            className={styles.form}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {title && <h3 className={styles.formTitle}>{title}</h3>}
            {subtitle && <p className={styles.formSubtitle}>{subtitle}</p>}

            <div className={styles.fields}>
              {formFields.map((field) => (
                <div key={field.name} className={styles.field}>
                  {field.type === 'textarea' ? (
                    <textarea
                      name={field.name}
                      placeholder={field.placeholder || field.label}
                      value={formData[field.name] || ''}
                      onChange={handleChange}
                      className={`${styles.textarea} ${errors[field.name] ? styles.inputError : ''}`}
                      rows={3}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleChange}
                      className={`${styles.select} ${errors[field.name] ? styles.inputError : ''}`}
                    >
                      <option value="">{field.placeholder || `Select ${field.label}`}</option>
                      {optionsOf(field).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || 'text'}
                      name={field.name}
                      placeholder={field.placeholder || field.label}
                      value={formData[field.name] || ''}
                      onChange={handleChange}
                      inputMode={
                        field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : undefined
                      }
                      autoComplete={
                        field.type === 'email'
                          ? 'email'
                          : field.type === 'tel'
                            ? 'tel'
                            : field.name === 'name'
                              ? 'name'
                              : undefined
                      }
                      className={`${styles.input} ${errors[field.name] ? styles.inputError : ''}`}
                    />
                  )}
                  {errors[field.name] && (
                    <span className={styles.errorText}>{errors[field.name]}</span>
                  )}
                </div>
              ))}
            </div>

            {submitError && (
              <p className={styles.submitErrorText}>
                <Icon icon="mdi:alert-circle-outline" />
                {submitError}
              </p>
            )}

            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? (
                <span className={styles.spinner} />
              ) : (
                <>
                  Submit Request
                  <Icon icon="mdi:arrow-right" />
                </>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeadForm;
