/**
 * Home-loan arithmetic: the EMI, what it adds up to, and the FOIR reading
 * behind the finance section's "can I afford this?" (D57).
 *
 * Every figure the site prints about a loan comes from here, so the price
 * card's "EMI from …", the EMI calculator and the eligibility assessment
 * cannot disagree about what a rate means.
 *
 * Nothing in this file is advice: the numbers are the standard reducing-balance
 * formula over the inputs given, and every screen that prints one says so.
 * Nothing here invents an underwriting model either — the score is the FOIR
 * headroom and nothing more, and the collected answers that FOIR cannot use
 * (credit score, years in the job, the down payment, the co-applicant) drive
 * the recommendations instead of being silently dropped (D57).
 */

/** What the site assumes when a caller does not say otherwise (§4 of D57). */
export const DEFAULT_LTV_PERCENT = 80;
export const DEFAULT_TENURE_YEARS = 20;

/** The rate the eligibility estimate quotes when no lender is named. */
export const DEFAULT_ASSESSMENT_RATE = 8.5;

/** The share of a monthly income a lender lets an EMI take (FOIR). */
export const FOIR = 0.6;

/**
 * The rupee figure each income bracket of the assessment form stands for — the
 * middle of the bracket, and the bottom of the open-ended top one plus the same
 * step, so that a bracket is never read as its own floor.
 *
 * The keys are the option values of `financeCopy.INCOME_RANGES`; the two lists
 * are checked against one another by the unit test.
 */
export const MONTHLY_INCOME_VALUES = {
  '0-25000': 15000,
  '25000-50000': 37500,
  '50000-100000': 75000,
  '100000-150000': 125000,
  '150000-250000': 200000,
  '250000+': 350000,
};

/** The same, for the existing-EMI brackets (`financeCopy.EXISTING_EMI_RANGES`). */
export const EMI_NUMERIC_VALUES = {
  0: 0,
  '1-10000': 5000,
  '10000-25000': 17500,
  '25000-50000': 37500,
  '50000+': 75000,
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * A figure that arrives either as a bracket key or as a number.
 *
 * The assessment form answers in brackets (`'50000-100000'`), the calculator
 * and the price card in rupees; both reach the same functions.
 */
const fromTable = (table, value) => {
  if (value === null || value === undefined || value === '') return 0;
  const mapped = table[value];
  if (mapped !== undefined) return mapped;
  return toNumber(value);
};

/**
 * The applicant's own monthly income: the exact amount when they typed one,
 * otherwise the bracket they chose.
 *
 * @param {{monthlyIncome?: string|number, exactMonthlyIncome?: string|number}} data
 * @returns {number} rupees per month
 */
export function applicantIncomeOf(data = {}) {
  if (data.monthlyIncome === 'exact') return Math.max(0, toNumber(data.exactMonthlyIncome));
  return Math.max(0, fromTable(MONTHLY_INCOME_VALUES, data.monthlyIncome));
}

/**
 * The household monthly income the FOIR limit is applied to.
 *
 * A co-applicant's income counts only when the visitor said there is one
 * (D57): a bracket left behind after switching the toggle back to "No" is not
 * income, and `hasCoApplicant: 'yes'` with nothing chosen adds nothing.
 *
 * @param {object} data the assessment answers, or `{monthlyIncome: <rupees>}`
 * @returns {number} rupees per month
 */
export function monthlyIncomeOf(data = {}) {
  const hasCoApplicant = data.hasCoApplicant === 'yes' || data.hasCoApplicant === true;
  const together = hasCoApplicant
    ? Math.max(0, fromTable(MONTHLY_INCOME_VALUES, data.coApplicantIncome))
    : 0;

  return applicantIncomeOf(data) + together;
}

/**
 * What the visitor already pays every month.
 *
 * @param {object} data
 * @returns {number} rupees per month
 */
export function existingEmiOf(data = {}) {
  return Math.max(0, fromTable(EMI_NUMERIC_VALUES, data.existingEmi));
}

/**
 * The monthly instalment of a reducing-balance loan.
 *
 *   EMI = P × r × (1 + r)ⁿ / ((1 + r)ⁿ − 1),  r = annual rate / 12 / 100
 *
 * A zero rate degrades to the plain division, and a loan with no principal,
 * no rate basis or no tenure is `0` rather than `NaN` or `Infinity`.
 *
 * @param {number|string} principal the amount borrowed, in rupees
 * @param {number|string} annualRate percent per annum, e.g. `8.35`
 * @param {number|string} years the tenure
 * @returns {number} the instalment, rounded to the rupee
 */
export function estimateEmi(principal, annualRate, years) {
  const amount = toNumber(principal);
  const months = Math.round(toNumber(years) * 12);
  if (amount <= 0 || months <= 0) return 0;

  const rate = toNumber(annualRate) / 12 / 100;
  if (rate <= 0) return Math.round(amount / months);

  const growth = Math.pow(1 + rate, months);
  return Math.round((amount * rate * growth) / (growth - 1));
}

/**
 * One EMI scenario end to end: what is borrowed, what it costs and how the
 * total splits between principal and interest.
 *
 * @param {object} inputs
 * @param {number|string} inputs.price the property price
 * @param {number|string} [inputs.loanPercent] the share of it borrowed
 * @param {number|string} inputs.rate percent per annum
 * @param {number|string} [inputs.years] the tenure
 * @returns {{ price: number, loanPercent: number, principal: number, downPayment: number,
 *   emi: number, months: number, totalPayable: number, totalInterest: number,
 *   principalShare: number, interestShare: number }} the two shares are whole
 *   percentages of `totalPayable`
 */
export function emiBreakdown({
  price,
  loanPercent = DEFAULT_LTV_PERCENT,
  rate,
  years = DEFAULT_TENURE_YEARS,
} = {}) {
  const amount = Math.max(0, toNumber(price));
  const share = Math.min(100, Math.max(0, toNumber(loanPercent)));
  const principal = Math.round((amount * share) / 100);
  const months = Math.max(0, Math.round(toNumber(years) * 12));
  const emi = estimateEmi(principal, rate, years);
  const totalPayable = emi * months;
  const totalInterest = Math.max(0, totalPayable - principal);
  const principalShare = totalPayable > 0 ? Math.round((principal / totalPayable) * 100) : 0;

  return {
    price: amount,
    loanPercent: share,
    principal,
    downPayment: amount - principal,
    emi,
    months,
    totalPayable,
    totalInterest,
    principalShare,
    interestShare: totalPayable > 0 ? 100 - principalShare : 0,
  };
}

/**
 * The loan an income can carry: the instalment the FOIR headroom pays for,
 * turned back into a principal at the given rate and tenure.
 *
 * @param {object} data the assessment answers, or `{monthlyIncome, existingEmi}` in rupees
 * @param {number} [rate] percent per annum
 * @param {number} [years] the tenure
 * @returns {number} the principal, rounded to the rupee
 */
export function eligibleLoan(
  data = {},
  rate = DEFAULT_ASSESSMENT_RATE,
  years = DEFAULT_TENURE_YEARS
) {
  const available = Math.max(0, FOIR * monthlyIncomeOf(data) - existingEmiOf(data));
  const months = Math.round(toNumber(years) * 12);
  if (available <= 0 || months <= 0) return 0;

  const monthly = toNumber(rate) / 12 / 100;
  if (monthly <= 0) return Math.round(available * months);

  const growth = Math.pow(1 + monthly, months);
  return Math.round((available * (growth - 1)) / (monthly * growth));
}

/**
 * The property price a loan plus a down payment reaches.
 *
 * @param {number} loanAmount the principal a lender may sanction
 * @param {number|string} downPaymentPercent 10–50 on the assessment's slider
 * @returns {number} rupees
 */
export function affordableProperty(loanAmount, downPaymentPercent) {
  const loan = Math.max(0, toNumber(loanAmount));
  const down = Math.min(99, Math.max(0, toNumber(downPaymentPercent)));
  if (loan <= 0) return 0;
  if (down <= 0) return loan;
  return Math.round(loan / (1 - down / 100));
}

/**
 * The four bands a score falls into; `tone` is a `ui/tones.js` name and `key`
 * is what `financeCopy.BAND_MESSAGES` writes the sentence for.
 */
export const SCORE_BANDS = [
  { from: 75, key: 'excellent', label: 'Excellent', tone: 'success', icon: 'mdi:check-decagram' },
  { from: 50, key: 'good', label: 'Good', tone: 'info', icon: 'mdi:thumb-up-outline' },
  {
    from: 25,
    key: 'moderate',
    label: 'Moderate',
    tone: 'warning',
    icon: 'mdi:alert-circle-outline',
  },
  {
    from: 0,
    key: 'needs-improvement',
    label: 'Needs improvement',
    tone: 'error',
    icon: 'mdi:information-outline',
  },
];

/**
 * The band a 0–100 score belongs to.
 *
 * @param {number} score
 * @returns {{from: number, key: string, label: string, tone: string, icon: string}}
 */
export function scoreBand(score) {
  const value = toNumber(score);
  return SCORE_BANDS.find((band) => value >= band.from) ?? SCORE_BANDS[SCORE_BANDS.length - 1];
}

/**
 * How much of a borrower's EMI headroom is still free, as a 0–100 reading.
 *
 *   (FOIR × income − existing EMIs) / (FOIR × income) × 100
 *
 * A co-applicant's income is added to the household income before the limit is
 * applied (D57); an income of zero scores zero rather than dividing by it.
 *
 * @param {object} data the assessment answers, or `{monthlyIncome, existingEmi}` in rupees
 * @returns {{ score: number, key: string, label: string, tone: string, icon: string,
 *   monthlyIncome: number, existingEmi: number, maxEmiCapacity: number, availableEmi: number }}
 */
export function foirScore(data = {}) {
  const monthlyIncome = monthlyIncomeOf(data);
  const existingEmi = existingEmiOf(data);
  const maxEmiCapacity = FOIR * monthlyIncome;
  const availableEmi = Math.max(0, maxEmiCapacity - existingEmi);
  const score =
    maxEmiCapacity > 0
      ? Math.min(100, Math.max(0, Math.round((availableEmi / maxEmiCapacity) * 100)))
      : 0;
  const band = scoreBand(score);

  return {
    score,
    key: band.key,
    label: band.label,
    tone: band.tone,
    icon: band.icon,
    monthlyIncome,
    existingEmi,
    maxEmiCapacity: Math.round(maxEmiCapacity),
    availableEmi: Math.round(availableEmi),
  };
}

/**
 * What the visitor can do about the answer they just got.
 *
 * These are the rules the boilerplate's result panel carried, kept because they
 * are the only use the collected credit score, existing EMIs, down payment and
 * co-applicant are put to (D57). Each returns a `tone` the result card paints
 * itself from; the sentences live in `financeCopy.RECOMMENDATIONS`.
 *
 * @param {object} data the assessment answers
 * @param {number} score the FOIR reading
 * @returns {Array<{id: string, tone: string, icon: string}>} in the order shown
 */
export function recommendations(data = {}, score = 0) {
  const value = toNumber(score);
  const out = [];

  if (value >= 50) out.push({ id: 'eligible', tone: 'success', icon: 'mdi:check-circle-outline' });
  if (value < 75 && data.creditScore !== 'excellent') {
    out.push({ id: 'credit', tone: 'info', icon: 'mdi:arrow-up-circle-outline' });
  }
  if (data.existingEmi && data.existingEmi !== '0') {
    out.push({ id: 'existing-emi', tone: 'warning', icon: 'mdi:information-outline' });
  }
  if (toNumber(data.downPayment) < 20) {
    out.push({ id: 'down-payment', tone: 'primary', icon: 'mdi:piggy-bank-outline' });
  }
  if (data.hasCoApplicant !== 'yes' && value < 75) {
    out.push({ id: 'co-applicant', tone: 'info', icon: 'mdi:account-multiple-outline' });
  }
  if (data.employmentYears === '0-1') {
    out.push({ id: 'employment', tone: 'warning', icon: 'mdi:briefcase-clock-outline' });
  }

  out.push({ id: 'advisor', tone: 'primary', icon: 'mdi:phone-outline' });
  return out;
}

/**
 * The headline the price card prints: the instalment on the cheapest active
 * lender's advertised rate, over `DEFAULT_TENURE_YEARS` at `DEFAULT_LTV_PERCENT`.
 *
 * Returns `null` — not a zero — when there is no price or no lender, because
 * the card hides the line rather than printing "₹0/month" (§7 of prompt 23).
 *
 * @param {number|string|null} price
 * @param {Array<{interestRateMin?: number}>} banks the active lenders, §6.6
 * @param {{ ltvPercent?: number, years?: number }} [options]
 * @returns {{ emi: number, annualRate: number, ltvPercent: number, years: number,
 *   principal: number }|null}
 */
export function startingEmi(price, banks = [], options = {}) {
  const { ltvPercent = DEFAULT_LTV_PERCENT, years = DEFAULT_TENURE_YEARS } = options;
  const amount = toNumber(price);
  const rates = (Array.isArray(banks) ? banks : [])
    .map((bank) => toNumber(bank?.interestRateMin))
    .filter((rate) => rate > 0);

  if (amount <= 0 || rates.length === 0) return null;

  const annualRate = Math.min(...rates);
  const principal = (amount * ltvPercent) / 100;
  const emi = estimateEmi(principal, annualRate, years);
  if (emi <= 0) return null;

  return { emi, annualRate, ltvPercent, years, principal };
}

const finance = {
  DEFAULT_ASSESSMENT_RATE,
  DEFAULT_LTV_PERCENT,
  DEFAULT_TENURE_YEARS,
  EMI_NUMERIC_VALUES,
  FOIR,
  MONTHLY_INCOME_VALUES,
  SCORE_BANDS,
  affordableProperty,
  applicantIncomeOf,
  eligibleLoan,
  emiBreakdown,
  estimateEmi,
  existingEmiOf,
  foirScore,
  monthlyIncomeOf,
  recommendations,
  scoreBand,
  startingEmi,
};

export default finance;
