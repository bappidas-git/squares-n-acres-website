/**
 * What an eligibility check answers, what makes an answer complete, and the
 * `POST /leads` body it becomes.
 *
 * The form component owns the screen; this file owns the contract with §6.7, so
 * that the inline tab and the per-bank dialog file identical leads and the rule
 * "every answer is kept" can be checked without rendering anything. The whole
 * questionnaire travels in `meta` (D56) — the boilerplate flattened it into a
 * pipe-separated sentence, which the CRM could not read back.
 */

import { foirScore } from '../../../../utils/finance';
import {
  getEmailErrorMessage,
  getMobileErrorMessage,
  getNameErrorMessage,
} from '../../../../utils/validators';
import copy from './financeCopy';

/** The answers a fresh form starts from; the three known ones are prefilled. */
export const emptyAnswers = (saved = {}) => ({
  name: saved.name ?? '',
  phone: saved.phone ?? '',
  email: saved.email ?? '',
  occupation: '',
  employmentYears: '',
  monthlyIncome: '',
  exactMonthlyIncome: '',
  existingEmi: '',
  emiTenure: '',
  creditScore: '',
  downPayment: '20',
  hasCoApplicant: '',
  coApplicantIncome: '',
});

/**
 * Everything that must be answered before the arithmetic means anything.
 *
 * The conditional rule — a remaining tenure is asked for only once there is an
 * EMI to have a tenure — is the one a form like this most often gets wrong, so
 * it is unit-tested here rather than through the screen.
 *
 * @param {object} values
 * @returns {Record<string, string>} field name → message; empty when valid
 */
export function validateAnswers(values = {}) {
  const errors = {};
  const name = getNameErrorMessage(values.name);
  if (name) errors.name = name;
  const phone = getMobileErrorMessage(values.phone);
  if (phone) errors.phone = phone;
  const email = getEmailErrorMessage(values.email, false);
  if (email) errors.email = email;

  if (!values.occupation) errors.occupation = copy.FORM_ERRORS.occupation;
  if (!values.employmentYears) errors.employmentYears = copy.FORM_ERRORS.employmentYears;
  if (!values.monthlyIncome) errors.monthlyIncome = copy.FORM_ERRORS.monthlyIncome;
  else if (values.monthlyIncome === 'exact' && !(Number(values.exactMonthlyIncome) > 0)) {
    errors.exactMonthlyIncome = copy.FORM_ERRORS.exactMonthlyIncome;
  }
  if (!values.existingEmi) errors.existingEmi = copy.FORM_ERRORS.existingEmi;
  else if (values.existingEmi !== '0' && !values.emiTenure) {
    errors.emiTenure = copy.FORM_ERRORS.emiTenure;
  }
  if (!values.creditScore) errors.creditScore = copy.FORM_ERRORS.creditScore;

  return errors;
}

/** The one line the CRM list shows; `meta` carries the answers themselves. */
export const summaryLine = (values, score, bank) =>
  [
    bank ? `Eligibility check with ${bank.name}` : 'Financial assessment',
    `FOIR reading ${score}/100`,
    `income ${values.monthlyIncome === 'exact' ? values.exactMonthlyIncome : values.monthlyIncome}`,
    `existing EMIs ${values.existingEmi}`,
    `down payment ${values.downPayment}%`,
  ].join(' · ');

/**
 * The lead the answers become.
 *
 * An untouched optional e-mail is left out of the body rather than sent as
 * `''`, which §6.7 types as an e-mail address and the API refuses (NEW-31). A
 * co-applicant's income is dropped when the visitor said there is none, so the
 * record never contradicts itself.
 *
 * @param {object} options
 * @param {object} options.values the answers
 * @param {string} options.source `financial-assessment` or `bank-eligibility`
 * @param {number|string|null} [options.propertyId]
 * @param {number|null} [options.propertyPrice]
 * @param {object|null} [options.bank]
 * @returns {{ body: object, score: object }}
 */
export function assessmentLead({
  values,
  source,
  propertyId = null,
  propertyPrice = null,
  bank = null,
}) {
  const score = foirScore(values);
  const email = String(values.email ?? '').trim();

  return {
    score,
    body: {
      name: String(values.name ?? '').trim(),
      phone: String(values.phone ?? '').trim(),
      ...(email ? { email } : {}),
      source,
      ...(propertyId ? { propertyId } : {}),
      message: summaryLine(values, score.score, bank),
      meta: {
        score: score.score,
        band: score.label,
        occupation: values.occupation,
        employmentYears: values.employmentYears,
        monthlyIncome: values.monthlyIncome,
        exactMonthlyIncome: values.exactMonthlyIncome ?? '',
        existingEmi: values.existingEmi,
        emiTenure: values.emiTenure ?? '',
        creditScore: values.creditScore,
        downPayment: values.downPayment,
        hasCoApplicant: values.hasCoApplicant || 'no',
        coApplicantIncome: values.hasCoApplicant === 'yes' ? (values.coApplicantIncome ?? '') : '',
        propertyPrice: propertyPrice ?? null,
        ...(bank?.name ? { bank: bank.name } : {}),
      },
    },
  };
}

const assessment = { assessmentLead, emptyAnswers, summaryLine, validateAnswers };
export default assessment;
