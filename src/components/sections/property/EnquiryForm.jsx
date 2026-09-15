import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { leadService } from '../../../services/api';
import { useToast } from '../../common/ToastProvider';
import { validateLeadForm, sanitizeInput } from '../../../utils/validators';
import styles from './EnquiryForm.module.css';

const EnquiryForm = ({ property, isMobile = false, savedUserDetails, onLeadCaptured }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: property ? `I'm interested in ${property.title}` : '',
  });
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Pre-fill form with saved user details
  useEffect(() => {
    if (savedUserDetails) {
      setFormData((prev) => ({
        ...prev,
        name: savedUserDetails.name || prev.name,
        email: savedUserDetails.email || prev.email,
        phone: savedUserDetails.phone || prev.phone,
      }));
    }
  }, [savedUserDetails]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { valid, errors: validationErrors } = validateLeadForm(formData);
    if (!valid) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSubmitting(true);
      await leadService.create({
        ...formData,
        propertyId: property?.id || null,
        source: 'property_enquiry',
      });
      setSubmitted(true);
      toast.success('Enquiry submitted! Our team will contact you soon.');
      if (onLeadCaptured) {
        onLeadCaptured({ name: formData.name, email: formData.email, phone: formData.phone });
      }
    } catch {
      setError('Something went wrong. Please try again.');
      toast.error('Failed to submit enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendAnother = () => {
    setSubmitted(false);
    setFormData((prev) => ({
      ...prev,
      message: property ? `I'm interested in ${property.title}` : '',
    }));
  };

  const formContent = submitted ? (
    <div className={styles.success}>
      <Icon icon="mdi:check-circle" className={styles.successIcon} />
      <h3 className={styles.successTitle}>Thank You!</h3>
      <p className={styles.successText}>
        Our team will contact you shortly about {property?.title || 'this property'}.
      </p>
      <button
        className={styles.sendAnotherBtn}
        onClick={handleSendAnother}
        type="button"
      >
        <Icon icon="mdi:message-plus-outline" />
        Send Another Message
      </button>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3 className={styles.formTitle}>
        <Icon icon="mdi:account-box" className={styles.formTitleIcon} />
        Contact Agent
      </h3>

      <div className={styles.field}>
        <input
          type="text"
          name="name"
          placeholder="Your Name *"
          value={formData.name}
          onChange={handleChange}
          className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
        />
        {errors.name && <span className={styles.errorText}>{errors.name}</span>}
      </div>

      <div className={styles.field}>
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
        />
        {errors.email && <span className={styles.errorText}>{errors.email}</span>}
      </div>

      <div className={styles.field}>
        <input
          type="tel"
          name="phone"
          placeholder="Phone Number *"
          value={formData.phone}
          onChange={handleChange}
          className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
        />
        {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
      </div>

      <div className={styles.field}>
        <textarea
          name="message"
          placeholder="Your message..."
          value={formData.message}
          onChange={handleChange}
          className={styles.textarea}
          rows={3}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button type="submit" className={styles.submitBtn} disabled={submitting}>
        {submitting ? 'Sending...' : 'Send Enquiry'}
        {!submitting && <Icon icon="mdi:send" />}
      </button>
    </form>
  );

  // Mobile: Fixed bottom button + bottom sheet
  if (isMobile) {
    return (
      <>
        <button
          className={styles.mobileFixedBtn}
          onClick={() => setMobileOpen(true)}
        >
          <Icon icon="mdi:message-text" />
          Enquire Now
        </button>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                className={styles.backdrop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
              />
              <motion.div
                className={styles.bottomSheet}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <div className={styles.sheetHandle} />
                <button
                  className={styles.sheetClose}
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close"
                >
                  <Icon icon="mdi:close" />
                </button>
                {formContent}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop: Sticky sidebar
  return (
    <div className={styles.sidebar}>
      {formContent}
    </div>
  );
};

export default EnquiryForm;
