import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import Honeypot from './Honeypot';
import LeadFormField from './LeadFormField';
import newsletterService from '../../services/newsletterService';
import { Button } from '../ui';
import { ENTRY_POINTS } from '../../utils/leadSources';
import { EVENTS, track } from '../../utils/analytics';
import { THROTTLE_MS } from './LeadForm';
import { getEmailErrorMessage, getNameErrorMessage, sanitizeInput } from '../../utils/validators';
import { useToast } from './ToastProvider';

import styles from './LeadForm.module.css';

/** What an address that is already on the list hears back. */
const ALREADY_SUBSCRIBED = "You're already subscribed";

/**
 * The newsletter sign-up.
 *
 * A subscriber is not a lead: this is the one entry point of
 * `ENTRY_POINTS` that goes to `POST /newsletter/subscribe` rather than
 * `POST /leads`, and it carries the same spam protection every lead form has —
 * the `website` honeypot (§5.11) and the ten-second throttle (D43). An address
 * that is already on the list answers 200 with "Already subscribed", so a
 * second attempt reads as a success rather than a failure (BUG-15).
 *
 * @param {object} props
 * @param {boolean} [props.withName] also ask for a name
 * @param {string} [props.submitLabel]
 * @param {string} [props.className]
 * @param {string} [props.successMessage] overrides the server's own sentence
 */
export default function NewsletterForm({
  withName = false,
  submitLabel = 'Subscribe',
  className = '',
  successMessage,
}) {
  const toast = useToast();
  const fields = ENTRY_POINTS.newsletter.fields.filter(
    (field) => withName || field.name !== 'name'
  );

  const [values, setValues] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState('');
  const [waitSeconds, setWaitSeconds] = useState(0);
  const lockedUntil = useRef(0);

  useEffect(() => {
    if (waitSeconds <= 0) return undefined;
    const timer = setInterval(() => {
      const left = Math.ceil((lockedUntil.current - Date.now()) / 1000);
      setWaitSeconds(left > 0 ? left : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [waitSeconds]);

  const setValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => (current[name] ? { ...current, [name]: '' } : current));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const left = Math.ceil((lockedUntil.current - Date.now()) / 1000);
    if (left > 0) {
      setWaitSeconds(left);
      return;
    }

    const found = {};
    const emailError = getEmailErrorMessage(values.email, true);
    if (emailError) found.email = emailError;
    if (withName) {
      const nameError = getNameErrorMessage(values.name, { required: false, label: 'Your name' });
      if (nameError) found.name = nameError;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    lockedUntil.current = Date.now() + THROTTLE_MS;
    setWaitSeconds(Math.ceil(THROTTLE_MS / 1000));

    const body = {
      email: sanitizeInput(values.email),
      source: ENTRY_POINTS.newsletter.source,
      website: honeypot,
    };
    if (withName && sanitizeInput(values.name)) body.name = sanitizeInput(values.name);

    try {
      setSubmitting(true);
      const response = await newsletterService.subscribe(body);
      const already = /already/i.test(response?.message ?? '');

      track(EVENTS.newsletterSubscribe, { source: body.source });
      setDone(
        already
          ? ALREADY_SUBSCRIBED
          : successMessage || response?.message || 'Thank you for subscribing.'
      );
    } catch (error) {
      if (error?.status === 429) {
        toast.error('Too many requests, please wait a minute');
      } else {
        setErrors({ email: error?.fieldError?.('email') || '' });
        toast.error(error?.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <p className={[styles.subscribed, className].filter(Boolean).join(' ')} role="status">
        <Icon icon="mdi:check-circle-outline" aria-hidden="true" />
        {done}
      </p>
    );
  }

  const throttled = waitSeconds > 0;

  return (
    <form
      className={[styles.form, className].filter(Boolean).join(' ')}
      onSubmit={handleSubmit}
      noValidate
    >
      {fields.map((field) => (
        <LeadFormField
          key={field.name}
          field={field}
          value={values[field.name] ?? ''}
          error={errors[field.name]}
          onChange={setValue}
          disabled={submitting}
        />
      ))}

      <Honeypot value={honeypot} onChange={setHoneypot} />

      <Button
        type="submit"
        variant="primary"
        fullWidth
        loading={submitting}
        disabled={submitting || throttled}
      >
        {throttled ? `Please wait ${waitSeconds}s` : submitLabel}
      </Button>

      <p className={styles.throttle} aria-live="polite">
        {throttled ? `You can try again in ${waitSeconds} seconds.` : ''}
      </p>
    </form>
  );
}
