import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import ConsentCheckbox from '../../common/ConsentCheckbox';
import Honeypot from '../../common/Honeypot';
import ResumeUpload from './ResumeUpload';
import careerService from '../../../services/careerService';
import { Button, PhoneField, TextField, TextareaField, UrlField } from '../../ui';
import { EVENTS, track } from '../../../utils/analytics';
import { URL_PATTERN } from '../../../utils/validation';
import { leadStorage } from '../../../utils/leadStorage';
import { useToast } from '../../common/ToastProvider';
import {
  getEmailErrorMessage,
  getMobileErrorMessage,
  getNameErrorMessage,
  localPhoneDigits,
  normalizePhone,
  sanitizeInput,
} from '../../../utils/validators';

import styles from './careers.module.css';

/** One submit per ten seconds per form instance (D43) — the same rule as `LeadForm`. */
export const THROTTLE_MS = 10000;

/** What the API says when it is rate limiting us (§5.11). */
const RATE_LIMIT_MESSAGE = 'Too many requests, please wait a minute';

/** What a closed opening answers, whichever way it is reached. */
const CLOSED_MESSAGE = 'This opening is closed. Have a look at the other roles.';

const COVER_LETTER_MAX = 5000;

/**
 * Every message this form can produce, against the answers on screen.
 *
 * Exported for the unit test: the résumé rule is the interesting one, because
 * what it checks is the URL the upload produced rather than the file, which is
 * the whole of D12 in one line.
 *
 * @param {object} values
 * @returns {Record<string, string>} empty when the form may be sent
 */
export function validateApplication(values) {
  const errors = {};

  const name = getNameErrorMessage(values.name, { required: true, label: 'Full name' });
  if (name) errors.name = name;

  const email = getEmailErrorMessage(values.email, true, { label: 'E-mail' });
  if (email) errors.email = email;

  const phone = getMobileErrorMessage(values.phone, { required: true, label: 'Phone' });
  if (phone) errors.phone = phone;

  const resumeUrl = String(values.resumeUrl ?? '').trim();
  if (!resumeUrl) errors.resumeUrl = 'Attach your résumé, or paste a link to it';
  else if (!URL_PATTERN.test(resumeUrl))
    errors.resumeUrl = 'The résumé link must start with https://';

  const linkedinUrl = String(values.linkedinUrl ?? '').trim();
  if (linkedinUrl && !URL_PATTERN.test(linkedinUrl)) {
    errors.linkedinUrl = 'The LinkedIn address must start with https://';
  }

  if (String(values.coverLetter ?? '').length > COVER_LETTER_MAX) {
    errors.coverLetter = `Keep the note under ${COVER_LETTER_MAX} characters.`;
  }

  return errors;
}

/**
 * The `POST /jobs/:id/apply` body of §5.14.
 *
 * Exported for the unit test. A blank optional answer is left out rather than
 * sent as `''`: the API types `linkedinUrl` as a URL and `''` is not one
 * (NEW-31).
 */
export function buildApplicationBody(values, honeypot = '') {
  const body = {
    name: sanitizeInput(values.name),
    email: sanitizeInput(values.email).toLowerCase(),
    phone: normalizePhone(values.phone),
    resumeUrl: String(values.resumeUrl ?? '').trim(),
    website: honeypot,
  };

  const coverLetter = sanitizeInput(values.coverLetter ?? '');
  if (coverLetter) body.coverLetter = coverLetter;

  const linkedinUrl = String(values.linkedinUrl ?? '').trim();
  if (linkedinUrl) body.linkedinUrl = linkedinUrl;

  return body;
}

/** A 422's keys against the boxes on screen (§5.3). */
function mapServerErrors(serverErrors) {
  const mapped = {};
  for (const [key, messages] of Object.entries(serverErrors ?? {})) {
    const message = Array.isArray(messages) ? messages[0] : messages;
    if (message) mapped[key.split('.').pop()] = message;
  }
  return mapped;
}

const EMPTY = { name: '', email: '', phone: '', resumeUrl: '', linkedinUrl: '', coverLetter: '' };

/**
 * Applying for one opening (§6.11, decisions D12 and D91).
 *
 * An application is its own record, not a lead: it carries a résumé and a
 * hiring status, and the careers page keeps a general enquiry form beside it
 * for somebody who did not find a role (D91). What the two share is the spam
 * protection every public write on this site has — a honeypot the API
 * answers 200 to, a ten-second throttle, and a consent box (§5.11, D43).
 *
 * @param {object} props
 * @param {object} props.job the opening, as `GET /jobs/slug/:slug` answered
 * @param {boolean} [props.closed] renders the notice instead of the boxes
 * @param {string} [props.id] the anchor the "Apply" button scrolls to
 */
export default function JobApplyForm({ job, closed = false, id = 'apply' }) {
  const toast = useToast();

  const [values, setValues] = useState(() => {
    const visitor = leadStorage.getVisitor() ?? {};
    return {
      ...EMPTY,
      name: visitor.name ?? '',
      email: visitor.email ?? '',
      phone: localPhoneDigits(visitor.phone) ?? '',
    };
  });
  const [errors, setErrors] = useState({});
  const [agreed, setAgreed] = useState(true);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const lockedUntil = useRef(0);

  // The countdown the throttle shows: one interval per lock, cleared the
  // moment the ten seconds are up, so an idle form holds no timer.
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
    setSubmitError('');

    const left = Math.ceil((lockedUntil.current - Date.now()) / 1000);
    if (left > 0) {
      setWaitSeconds(left);
      return;
    }

    const found = validateApplication(values);
    if (!agreed) found.consent = 'Please agree to be contacted so we can reply';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    lockedUntil.current = Date.now() + THROTTLE_MS;
    setWaitSeconds(Math.ceil(THROTTLE_MS / 1000));

    const body = buildApplicationBody(values, honeypot);

    try {
      setSubmitting(true);
      await careerService.apply(job.id, body);

      leadStorage.saveVisitor({ name: body.name, phone: body.phone, email: body.email });
      track(EVENTS.jobApplication, { jobId: job.id, jobSlug: job.slug });

      setDone(true);
    } catch (thrown) {
      if (thrown?.status === 429) {
        toast.error(RATE_LIMIT_MESSAGE);
        setSubmitError(RATE_LIMIT_MESSAGE);
      } else if (thrown?.status === 422) {
        setErrors((current) => ({ ...current, ...mapServerErrors(thrown.errors) }));
        setSubmitError(thrown.message || 'Please check the highlighted fields.');
      } else if (thrown?.status === 404) {
        setSubmitError(CLOSED_MESSAGE);
      } else {
        setSubmitError(thrown?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (closed) {
    return (
      <div className={styles.applyCard} id={id}>
        <p className={styles.closedNotice} role="status">
          <Icon icon="mdi:information-outline" width="20" height="20" aria-hidden="true" />
          This opening is closed and is no longer accepting applications.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.applyCard} id={id}>
        <div className={styles.success} role="status">
          <Icon
            icon="mdi:check-circle-outline"
            width="40"
            height="40"
            aria-hidden="true"
            className={styles.successIcon}
          />
          <h3 className={styles.successTitle}>Application received</h3>
          <p className={styles.successText}>
            Thank you for applying for {job.title}. We read every application and will come back to
            you about this role.
          </p>
        </div>
      </div>
    );
  }

  const throttled = waitSeconds > 0;

  return (
    <div className={styles.applyCard} id={id}>
      <form className={styles.applyForm} onSubmit={handleSubmit} noValidate>
        <h2 className={styles.applyTitle}>Apply for this role</h2>
        <p className={styles.applySubtitle}>
          Tell us who you are and attach your résumé. Everything else is optional.
        </p>

        <TextField
          label="Full name"
          required
          autoComplete="name"
          value={values.name}
          error={errors.name}
          disabled={submitting}
          onChange={(event) => setValue('name', event.target.value)}
        />

        <TextField
          label="E-mail"
          type="email"
          required
          autoComplete="email"
          value={values.email}
          error={errors.email}
          disabled={submitting}
          onChange={(event) => setValue('email', event.target.value)}
        />

        <PhoneField
          label="Phone"
          required
          autoComplete="tel"
          // "98450 12345" was cut to "98450 1234" and refused (QA-61); the
          // lead forms' room, and `normalizePhone` tidies it on submit.
          maxLength={18}
          value={values.phone}
          error={errors.phone}
          disabled={submitting}
          onChange={(event) => setValue('phone', event.target.value)}
        />

        <ResumeUpload
          value={values.resumeUrl}
          error={errors.resumeUrl}
          disabled={submitting}
          onChange={(url) => setValue('resumeUrl', url)}
        />

        <UrlField
          label="LinkedIn profile"
          value={values.linkedinUrl}
          error={errors.linkedinUrl}
          disabled={submitting}
          placeholder="https://www.linkedin.com/in/…"
          hint="Optional. Include https://"
          onChange={(event) => setValue('linkedinUrl', event.target.value)}
        />

        <TextareaField
          label="Why this role?"
          rows={5}
          maxLength={COVER_LETTER_MAX}
          value={values.coverLetter}
          error={errors.coverLetter}
          disabled={submitting}
          hint="Optional. A few lines about what you have done and what you are looking for."
          onChange={(event) => setValue('coverLetter', event.target.value)}
        />

        <Honeypot value={honeypot} onChange={setHoneypot} />

        <ConsentCheckbox checked={agreed} onChange={setAgreed} error={errors.consent} />

        {submitError ? (
          <p className={styles.submitError} role="alert">
            <Icon icon="mdi:alert-circle-outline" aria-hidden="true" />
            {submitError}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={submitting}
          disabled={submitting || throttled}
          title={throttled ? `Please wait ${waitSeconds} seconds before sending again` : undefined}
        >
          {throttled ? `Please wait ${waitSeconds}s` : 'Send application'}
        </Button>

        <p className={styles.throttle} aria-live="polite">
          {throttled ? `You can send this again in ${waitSeconds} seconds.` : ''}
        </p>
      </form>
    </div>
  );
}
