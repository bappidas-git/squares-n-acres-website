import { useCallback, useState } from 'react';
import { Icon } from '@iconify/react';

import { Alert, Button, Chip, PhoneField, SelectField, TextField } from '../../../ui';
import { assessmentLead, emptyAnswers, validateAnswers } from './assessmentLead';
import { formatPrice } from '../../../../utils/format';
import { leadStorage } from '../../../../utils/leadStorage';
import { track } from '../../../../utils/analytics';
import copy from './financeCopy';
import leadService from '../../../../services/leadService';

import styles from './finance.module.css';

const CO_APPLICANT_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

/** A row of single-choice chips with the same label/error scaffolding as a field. */
function ChipRow({ field, label, options, value, error, required = false, onSelect }) {
  return (
    <div className={styles.answerBlock}>
      <span className={styles.answerLabel} id={`${field}-label`}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <div className={styles.chips} role="group" aria-labelledby={`${field}-label`}>
        {options.map((option) => (
          <Chip
            key={option.value}
            tone={option.tone ?? 'primary'}
            variant={value === option.value ? 'filled' : 'soft'}
            size="md"
            selected={value === option.value}
            onClick={() => onSelect(field, option.value)}
            aria-pressed={value === option.value}
            icon={option.icon ? <Icon icon={option.icon} aria-hidden="true" /> : undefined}
          >
            {option.label}
          </Chip>
        ))}
      </div>
      {error ? (
        <span className={styles.fieldError} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The questions behind both eligibility checks: the tab and the per-bank dialog
 * render this same form and differ only in the lead source they file.
 *
 * The form owns the submission because the result may only be shown once the
 * lead is stored: the boilerplate showed a score whether the `POST` succeeded
 * or failed, so an assessment could be "recorded" with nothing recorded
 * (ADD-13). Here a failure keeps the visitor on the form, with their answers
 * and an error they can retry.
 *
 * @param {object} props
 * @param {string} props.source `financial-assessment` or `bank-eligibility`
 * @param {number|string|null} [props.propertyId]
 * @param {number|null} [props.propertyPrice] the price the down payment is a share of
 * @param {object|null} [props.bank] the lender, when this is a per-bank check
 * @param {(result: {values: object, score: object}) => void} props.onComplete
 */
export default function AssessmentForm({
  source,
  propertyId = null,
  propertyPrice = null,
  bank = null,
  onComplete,
}) {
  const [values, setValues] = useState(() => emptyAnswers(leadStorage.getVisitor() ?? {}));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState('');

  const set = useCallback((field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: '' } : current));
  }, []);

  const downPayment = propertyPrice
    ? (Number(propertyPrice) * Number(values.downPayment || 0)) / 100
    : null;

  const onSubmit = async (event) => {
    event.preventDefault();
    setFailed('');

    const found = validateAnswers(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const { body, score } = assessmentLead({ values, source, propertyId, propertyPrice, bank });

    try {
      setSubmitting(true);
      await leadService.create(body);
      // Answering the questionnaire identifies the visitor for the whole
      // listing, so every gated kind on it opens (prompt 25 §4.2).
      leadStorage.saveVisitor({ name: values.name, phone: values.phone, email: values.email });
      leadStorage.markCaptured(propertyId, source);
      track('lead_submit', { propertyId, source, score: score.score });
      onComplete?.({ values, score });
    } catch (error) {
      setFailed(error?.message || copy.SUBMIT_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <p className={styles.formIntro}>{copy.FORM_INTRO}</p>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{copy.FORM_LABELS.personal}</legend>
        <div className={styles.grid3}>
          <TextField
            label={copy.FORM_LABELS.name}
            required
            autoComplete="name"
            value={values.name}
            error={errors.name}
            onChange={(event) => set('name', event.target.value)}
          />
          <PhoneField
            label={copy.FORM_LABELS.phone}
            required
            value={values.phone}
            error={errors.phone}
            onChange={(event) => set('phone', event.target.value)}
          />
          <TextField
            label={copy.FORM_LABELS.email}
            type="email"
            autoComplete="email"
            value={values.email}
            error={errors.email}
            onChange={(event) => set('email', event.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{copy.FORM_LABELS.employment}</legend>
        <ChipRow
          field="occupation"
          label={copy.FORM_LABELS.occupation}
          options={copy.OCCUPATIONS}
          value={values.occupation}
          error={errors.occupation}
          required
          onSelect={set}
        />
        <div className={styles.grid2}>
          <SelectField
            label={copy.FORM_LABELS.employmentYears}
            required
            placeholder="Choose a duration"
            options={copy.EMPLOYMENT_YEARS}
            value={values.employmentYears}
            error={errors.employmentYears}
            onChange={(event) => set('employmentYears', event.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{copy.FORM_LABELS.financial}</legend>
        <div className={styles.grid2}>
          <SelectField
            label={copy.FORM_LABELS.monthlyIncome}
            required
            placeholder="Choose a range"
            options={[...copy.INCOME_RANGES, copy.EXACT_INCOME_OPTION]}
            value={values.monthlyIncome}
            error={errors.monthlyIncome}
            onChange={(event) => {
              set('monthlyIncome', event.target.value);
              if (event.target.value !== 'exact') set('exactMonthlyIncome', '');
            }}
          />
          <SelectField
            label={copy.FORM_LABELS.existingEmi}
            required
            placeholder="Choose a range"
            options={copy.EXISTING_EMI_RANGES}
            value={values.existingEmi}
            error={errors.existingEmi}
            onChange={(event) => {
              set('existingEmi', event.target.value);
              if (event.target.value === '0') set('emiTenure', '');
            }}
          />
          {values.monthlyIncome === 'exact' ? (
            <TextField
              label={copy.FORM_LABELS.exactMonthlyIncome}
              type="number"
              inputMode="numeric"
              min="1"
              hint="Rupees per month"
              value={values.exactMonthlyIncome}
              error={errors.exactMonthlyIncome}
              onChange={(event) => set('exactMonthlyIncome', event.target.value)}
            />
          ) : null}
          {values.existingEmi && values.existingEmi !== '0' ? (
            <SelectField
              label={copy.FORM_LABELS.emiTenure}
              required
              placeholder="Choose a duration"
              options={copy.EMI_TENURES}
              value={values.emiTenure}
              error={errors.emiTenure}
              onChange={(event) => set('emiTenure', event.target.value)}
            />
          ) : null}
        </div>

        <ChipRow
          field="creditScore"
          label={copy.FORM_LABELS.creditScore}
          options={copy.CREDIT_SCORES}
          value={values.creditScore}
          error={errors.creditScore}
          required
          onSelect={set}
        />

        <div className={styles.answerBlock}>
          <label className={styles.answerLabel} htmlFor="assessment-down-payment">
            {copy.FORM_LABELS.downPayment} — {values.downPayment}%
            {downPayment ? ` (${formatPrice(downPayment)})` : ''}
          </label>
          <input
            id="assessment-down-payment"
            type="range"
            min="10"
            max="50"
            step="5"
            className={styles.slider}
            value={values.downPayment}
            onChange={(event) => set('downPayment', event.target.value)}
          />
          <div className={styles.sliderScale}>
            <span>10%</span>
            <span>50%</span>
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{copy.FORM_LABELS.coApplicant}</legend>
        <div className={styles.grid2}>
          <ChipRow
            field="hasCoApplicant"
            label={copy.FORM_LABELS.hasCoApplicant}
            options={CO_APPLICANT_OPTIONS}
            value={values.hasCoApplicant}
            onSelect={set}
          />
          {values.hasCoApplicant === 'yes' ? (
            <SelectField
              label={copy.FORM_LABELS.coApplicantIncome}
              placeholder="Choose a range"
              options={copy.INCOME_RANGES}
              value={values.coApplicantIncome}
              onChange={(event) => set('coApplicantIncome', event.target.value)}
            />
          ) : null}
        </div>
      </fieldset>

      {failed ? (
        <Alert tone="error" className={styles.formAlert}>
          {failed}
        </Alert>
      ) : null}

      <div className={styles.formActions}>
        <Button type="submit" loading={submitting} fullWidth>
          {submitting ? copy.SUBMIT_PENDING : copy.SUBMIT_LABEL}
        </Button>
        <p className={styles.privacy}>
          <Icon icon="mdi:lock-outline" aria-hidden="true" /> {copy.PRIVACY_NOTE}
        </p>
      </div>
    </form>
  );
}
