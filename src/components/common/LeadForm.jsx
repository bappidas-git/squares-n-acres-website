import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import ConsentCheckbox from './ConsentCheckbox';
import Honeypot from './Honeypot';
import LeadFormField, { optionsOf } from './LeadFormField';
import LeadSuccess, { DEFAULT_SUCCESS_MESSAGE } from './LeadSuccess';
import RequirementFields, { useRequirementFields } from './RequirementFields';
import leadService from '../../services/leadService';
import { Button } from '../ui';
import { DEFAULT_FIELDS } from '../../utils/leadSources';
import { EVENTS, track } from '../../utils/analytics';
import { getUtm, leadStorage } from '../../utils/leadStorage';
import { useToast } from './ToastProvider';
import {
  getEmailErrorMessage,
  getMobileErrorMessage,
  getNameErrorMessage,
  getRequiredErrorMessage,
  localPhoneDigits,
  normalizePhone,
  sanitizeInput,
} from '../../utils/validators';

import styles from './LeadForm.module.css';

/** One submit per ten seconds per form instance (D43). */
export const THROTTLE_MS = 10000;

/** The four answers `POST /leads` stores at the top level (§6.7). */
const TOP_LEVEL = new Set(['name', 'phone', 'email', 'message']);

/** What the API says when it is rate limiting us (§5.11). */
const RATE_LIMIT_MESSAGE = 'Too many requests, please wait a minute';

const isBlank = (value) => value === '' || value === null || value === undefined;

/** `{ ...target, ...patch }`, merging a nested object rather than replacing it. */
function mergeDeep(target, patch) {
  for (const [key, value] of Object.entries(patch ?? {})) {
    const existing = target[key];
    const bothObjects =
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing) &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value);
    target[key] = bothObjects ? mergeDeep({ ...existing }, value) : value;
  }
  return target;
}

/**
 * The typed answers as the `POST /leads` body of §6.7.
 *
 * Three destinations: the four fields the API stores at the top level, the
 * `requirement` branch for a field that declares `group: 'requirement'`, and
 * `meta` for everything else — the free-form, source-specific payload of D56,
 * which is where a workspace's team size and a legal enquiry's service type
 * live. Without it the mock's `sanitize()` would drop them silently.
 *
 * A blank optional box is left out rather than sent as `''`: §6.7 types
 * `email` as an e-mail address, and `''` is not one.
 *
 * Exported for the unit test.
 */
export function buildLeadBody({
  values,
  fields,
  source,
  propertyId = null,
  articleId = null,
  pageSlug = null,
  consent = true,
  meta = null,
  hiddenFields = null,
}) {
  const body = { source, consent, website: '' };
  const requirement = {};
  const extra = {};

  for (const field of fields) {
    const raw = values[field.name];
    const value = typeof raw === 'string' ? sanitizeInput(raw) : raw;
    if (isBlank(value)) continue;

    const pairs = field.toBody ? (field.toBody(value) ?? {}) : { [field.name]: value };
    const destination =
      field.group === 'requirement'
        ? requirement
        : field.group === 'meta' || !TOP_LEVEL.has(field.name)
          ? extra
          : body;

    Object.assign(destination, pairs);
  }

  if (body.phone) body.phone = normalizePhone(body.phone);
  if (propertyId !== null && propertyId !== undefined && propertyId !== '') {
    body.propertyId = Number(propertyId);
  }
  if (articleId !== null && articleId !== undefined && articleId !== '') {
    body.articleId = Number(articleId);
  }
  if (pageSlug) body.pageSlug = pageSlug;
  if (typeof window !== 'undefined') body.pageUrl = window.location.href;

  if (Object.keys(requirement).length > 0) body.requirement = requirement;

  const allMeta = { ...extra, ...(meta ?? {}) };
  if (Object.keys(allMeta).length > 0) body.meta = allMeta;

  const utm = getUtm();
  if (utm) body.utm = utm;

  return mergeDeep(body, hiddenFields);
}

/**
 * One field's error, or an empty string.
 *
 * Exported for the unit test.
 *
 * @param {object} field a descriptor
 * @param {*} value
 * @param {object} values every answer, for a select whose choices depend on one
 */
export function validateField(field, value, values) {
  const label = field.label ?? field.name;
  const required = Boolean(field.required);

  if (field.name === 'name') return getNameErrorMessage(value, { required, label });
  if (field.type === 'email') return getEmailErrorMessage(value, required, { label });
  if (field.type === 'tel') return getMobileErrorMessage(value, { required, label });

  const typed = typeof value === 'string' ? sanitizeInput(value) : value;
  if (isBlank(typed)) return required ? getRequiredErrorMessage(label) : '';

  // A select may only carry one of the choices it offered. A budget band that
  // belonged to the sale scale must not survive a switch to Rent.
  if (field.type === 'select') {
    const offered = optionsOf(field, values).some(
      (option) => String(option.value) === String(typed)
    );
    if (!offered) return `Choose one of the ${String(label).toLowerCase()} options`;
  }

  return '';
}

/**
 * The one lead form of the site.
 *
 * Everything that used to differ between the fifteen copies is a prop: the
 * boxes, the heading, the canonical source (§6.17), what the success panel
 * offers. What used to be missing is now unconditional — a visible `<label>`
 * on every control, `required: false` actually honoured, a honeypot, a ten
 * second throttle (D43), a consent box, the campaign that brought the visit,
 * and a payload the API accepts field for field (ADD-09, BUG-09, BUG-15).
 *
 * @param {object} props
 * @param {string} props.source a `LEAD_SOURCES` value — required
 * @param {number|string|null} [props.propertyId]
 * @param {number|string|null} [props.articleId]
 * @param {string|null} [props.pageSlug]
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {Array<object>} [props.fields] see `LeadFormField` for a descriptor
 * @param {object} [props.hiddenFields] merged into the body after everything else
 * @param {object} [props.meta] source-specific payload (D56)
 * @param {boolean} [props.requirement] adds the six selects of D82
 * @param {boolean} [props.consent] renders the consent box
 * @param {string} [props.submitLabel]
 * @param {string} [props.successMessage]
 * @param {Array<'whatsapp'|'call'>} [props.successActions]
 * @param {'card'|'inline'|'modal'} [props.variant]
 * @param {boolean} [props.compact] tighter spacing for a sidebar or a sheet
 * @param {string} [props.propertyTitle] quoted by the success panel's WhatsApp
 * @param {object|null} [props.agent] the listing's advisor, for the success panel
 * @param {{label: string, icon?: string, onClick: () => void}|null} [props.successAction]
 *   an extra button above the follow-ups — a gated download offers its file again
 * @param {(() => void)|null} [props.onCloseSuccess] adds a Close button
 * @param {(lead: object, values: object) => void} [props.onSuccess]
 * @param {string} [props.className]
 */
export default function LeadForm({
  source,
  propertyId = null,
  articleId = null,
  pageSlug = null,
  title = '',
  subtitle = '',
  fields = DEFAULT_FIELDS,
  hiddenFields = null,
  meta = null,
  requirement = false,
  consent = true,
  submitLabel = 'Submit',
  successMessage,
  successActions = ['whatsapp', 'call'],
  variant = 'card',
  compact = false,
  propertyTitle = '',
  agent = null,
  successAction = null,
  onCloseSuccess = null,
  onSuccess,
  className = '',
}) {
  const toast = useToast();
  const requirementDescriptors = useRequirementFields();

  const allFields = useMemo(
    () => [
      ...(Array.isArray(fields) ? fields : []),
      ...(requirement ? requirementDescriptors : []),
    ],
    [fields, requirement, requirementDescriptors]
  );

  const [values, setValues] = useState(() => initialValues(allFields));
  const [errors, setErrors] = useState({});
  const [agreed, setAgreed] = useState(true);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(null);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const lockedUntil = useRef(0);

  // The countdown the throttle shows. One interval per lock, cleared the moment
  // the ten seconds are up, so an idle form holds no timer.
  useEffect(() => {
    if (waitSeconds <= 0) return undefined;
    const timer = setInterval(() => {
      const left = Math.ceil((lockedUntil.current - Date.now()) / 1000);
      setWaitSeconds(left > 0 ? left : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [waitSeconds]);

  const setValue = useCallback(
    (name, value) => {
      setValues((current) => {
        const next = { ...current, [name]: value };

        // An answer the new choices no longer offer is dropped rather than
        // submitted invisibly — switching to Rent must not send a ₹1 Cr budget.
        for (const field of allFields) {
          if (field.name === name || typeof field.options !== 'function') continue;
          const chosen = next[field.name];
          if (!chosen) continue;
          const offered = optionsOf(field, next).some(
            (option) => String(option.value) === String(chosen)
          );
          if (!offered) next[field.name] = '';
        }

        return next;
      });

      setErrors((current) => (current[name] ? { ...current, [name]: '' } : current));
    },
    [allFields]
  );

  const validate = () => {
    const found = {};
    for (const field of allFields) {
      const message = validateField(field, values[field.name] ?? '', values);
      if (message) found[field.name] = message;
    }
    if (consent && !agreed) {
      found.consent = 'Please agree to be contacted so we can reply';
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    const left = Math.ceil((lockedUntil.current - Date.now()) / 1000);
    if (left > 0) {
      setWaitSeconds(left);
      return;
    }

    if (!validate()) return;

    lockedUntil.current = Date.now() + THROTTLE_MS;
    setWaitSeconds(Math.ceil(THROTTLE_MS / 1000));

    const body = buildLeadBody({
      values,
      fields: allFields,
      source,
      propertyId,
      articleId,
      pageSlug,
      consent: consent ? agreed : true,
      meta,
      hiddenFields,
    });
    body.website = honeypot;

    try {
      setSubmitting(true);
      const response = await leadService.create(body);
      const lead = response?.data ?? response ?? null;

      leadStorage.saveVisitor({ name: body.name, phone: body.phone, email: body.email });
      leadStorage.markCaptured(propertyId, source);
      track(EVENTS.leadSubmit, { source, propertyId });

      setDone({ lead, message: response?.message });
      onSuccess?.(lead, values);
    } catch (error) {
      if (error?.status === 429) {
        toast.error(RATE_LIMIT_MESSAGE);
        setSubmitError(RATE_LIMIT_MESSAGE);
      } else if (error?.status === 422) {
        setErrors((current) => ({ ...current, ...mapServerErrors(error.errors, allFields) }));
        setSubmitError(error.message || 'Please check the highlighted fields.');
      } else {
        setSubmitError(error?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className={wrapperClass(variant, compact, className)}>
        <LeadSuccess
          message={successMessage || done.message || DEFAULT_SUCCESS_MESSAGE}
          actions={successActions}
          propertyId={propertyId}
          propertyTitle={propertyTitle}
          agent={agent}
          primaryAction={successAction}
          onClose={onCloseSuccess}
        />
      </div>
    );
  }

  const throttled = waitSeconds > 0;

  return (
    <div className={wrapperClass(variant, compact, className)}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {title ? <h3 className={styles.title}>{title}</h3> : null}
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}

        <div className={styles.grid}>
          {(Array.isArray(fields) ? fields : []).map((field) => (
            <div
              key={field.name}
              className={[styles.cell, field.half ? styles.half : ''].filter(Boolean).join(' ')}
            >
              <LeadFormField
                field={field}
                value={values[field.name] ?? ''}
                values={values}
                error={errors[field.name]}
                onChange={setValue}
                disabled={submitting}
              />
            </div>
          ))}
        </div>

        {requirement ? (
          <RequirementFields
            fields={requirementDescriptors}
            values={values}
            errors={errors}
            onChange={setValue}
            disabled={submitting}
          />
        ) : null}

        <Honeypot value={honeypot} onChange={setHoneypot} />

        {consent ? (
          <ConsentCheckbox checked={agreed} onChange={setAgreed} error={errors.consent} />
        ) : null}

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
          {throttled ? `Please wait ${waitSeconds}s` : submitLabel}
        </Button>

        <p className={styles.throttle} aria-live="polite">
          {throttled ? `You can send this again in ${waitSeconds} seconds.` : ''}
        </p>
      </form>
    </div>
  );
}

/** The boxes a form opens with: the field's own default, then what we know. */
function initialValues(fields) {
  const visitor = leadStorage.getVisitor() ?? {};
  const values = {};

  for (const field of fields) {
    const prefill =
      field.name === 'phone'
        ? localPhoneDigits(visitor.phone)
        : field.name === 'name' || field.name === 'email'
          ? visitor[field.name]
          : '';
    values[field.name] = field.defaultValue ?? prefill ?? '';
  }

  return values;
}

/**
 * A 422's field errors against the boxes actually on screen.
 *
 * Laravel dots its nested keys (`requirement.localityId`, `meta.teamSize`), so
 * a message is matched on the whole key first and on its last segment after —
 * which is the name the descriptor carries.
 */
function mapServerErrors(serverErrors, fields) {
  const names = new Set(fields.map((field) => field.name));
  const mapped = {};

  for (const [key, messages] of Object.entries(serverErrors ?? {})) {
    const message = Array.isArray(messages) ? messages[0] : messages;
    if (!message) continue;
    const tail = key.split('.').pop();
    const target = names.has(key) ? key : names.has(tail) ? tail : key;
    mapped[target] = message;
  }

  return mapped;
}

const wrapperClass = (variant, compact, className) =>
  [styles.wrapper, styles[variant] ?? '', compact ? styles.compact : '', className]
    .filter(Boolean)
    .join(' ');
