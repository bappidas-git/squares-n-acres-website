import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { leadService } from '../../services/api';
import { useToast } from './ToastProvider';
import { getNameErrorMessage, getEmailErrorMessage, getMobileErrorMessage, sanitizeInput } from '../../utils/validators';
import styles from './LeadForm.module.css';

const LeadForm = ({
  title = 'Get in Touch',
  subtitle = '',
  fields = [],
  source = 'website',
  propertyId = null,
  className = '',
}) => {
  const defaultFields = [
    { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Your Name *' },
    { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email Address *' },
    { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: 'Phone Number *' },
  ];

  const formFields = fields.length > 0 ? fields : defaultFields;

  const initialValues = {};
  formFields.forEach((f) => {
    initialValues[f.name] = '';
  });

  const toast = useToast();
  const [formData, setFormData] = useState(initialValues);
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
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      await leadService.create({
        ...formData,
        source,
        ...(propertyId ? { propertyId } : {}),
      });
      setSubmitted(true);
      toast.success('Request submitted successfully!');
    } catch {
      setSubmitError('Something went wrong. Please try again.');
      toast.error('Failed to submit. Please try again.');
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
                      {(field.options || []).map((opt) => (
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
                      inputMode={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : undefined}
                      autoComplete={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : field.name === 'name' ? 'name' : undefined}
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
