/**
 * Home-loan arithmetic: the EMI, what it adds up to, and the FOIR reading
 * behind the finance section's "can I afford this?" (D57).
 *
 * Every figure the site prints about a loan comes from here, so the price
 * card's "EMI from …", the EMI calculator of prompt 25 and the bank
 * eligibility check cannot disagree about what a rate means.
 *
 * Nothing in this file is advice: the numbers are the standard reducing-balance
 * formula over the inputs given, and every screen that prints one says so.
 */

/** What the site assumes when a caller does not say otherwise (§4 of D57). */
export const DEFAULT_LTV_PERCENT = 80;
export const DEFAULT_TENURE_YEARS = 20;

/** The share of a monthly income a lender lets an EMI take (FOIR). */
export const FOIR_LIMIT = 0.6;

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

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
 * The instalment with what it costs over the whole tenure.
 *
 * @param {number|string} principal
 * @param {number|string} annualRate
 * @param {number|string} years
 * @returns {{ emi: number, months: number, principal: number, totalPayable: number,
 *   totalInterest: number, principalShare: number, interestShare: number }}
 *   the two shares are whole percentages of `totalPayable`
 */
export function emiBreakdown(principal, annualRate, years) {
  const amount = Math.max(0, toNumber(principal));
  const months = Math.max(0, Math.round(toNumber(years) * 12));
  const emi = estimateEmi(amount, annualRate, years);
  const totalPayable = emi * months;
  const totalInterest = Math.max(0, totalPayable - amount);
  const principalShare = totalPayable > 0 ? Math.round((amount / totalPayable) * 100) : 0;

  return {
    emi,
    months,
    principal: amount,
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
 * @param {{ monthlyIncome?: number, coApplicantIncome?: number, existingEmi?: number }} inputs
 * @param {{ annualRate?: number, years?: number }} [options]
 * @returns {number} the principal, rounded to the rupee
 */
export function eligibleLoanAmount(inputs = {}, options = {}) {
  const { annualRate = 8.5, years = DEFAULT_TENURE_YEARS } = options;
  const income = toNumber(inputs.monthlyIncome) + toNumber(inputs.coApplicantIncome);
  const available = Math.max(0, FOIR_LIMIT * income - toNumber(inputs.existingEmi));
  const months = Math.round(toNumber(years) * 12);
  if (available <= 0 || months <= 0) return 0;

  const rate = toNumber(annualRate) / 12 / 100;
  if (rate <= 0) return Math.round(available * months);

  const growth = Math.pow(1 + rate, months);
  return Math.round((available * (growth - 1)) / (rate * growth));
}

/** The four bands a score falls into; `tone` is a `ui/tones.js` name. */
export const FOIR_BANDS = [
  { from: 75, label: 'Excellent', tone: 'success' },
  { from: 50, label: 'Good', tone: 'info' },
  { from: 25, label: 'Moderate', tone: 'warning' },
  { from: 0, label: 'Needs improvement', tone: 'error' },
];

/**
 * How much of a borrower's EMI headroom is still free, as a 0–100 reading.
 *
 *   (FOIR limit × income − existing EMIs) / (FOIR limit × income) × 100
 *
 * A co-applicant's income is added to the household income before the limit is
 * applied (D57); an income of zero scores zero rather than dividing by it.
 *
 * @param {{ monthlyIncome?: number, coApplicantIncome?: number, existingEmi?: number }} inputs
 * @returns {{ score: number, label: string, tone: string, monthlyIncome: number,
 *   maxEmiCapacity: number, availableEmi: number }}
 */
export function foirScore(inputs = {}) {
  const monthlyIncome = toNumber(inputs.monthlyIncome) + toNumber(inputs.coApplicantIncome);
  const maxEmiCapacity = FOIR_LIMIT * monthlyIncome;
  const availableEmi = Math.max(0, maxEmiCapacity - toNumber(inputs.existingEmi));
  const score =
    maxEmiCapacity > 0
      ? Math.min(100, Math.max(0, Math.round((availableEmi / maxEmiCapacity) * 100)))
      : 0;
  const band = FOIR_BANDS.find((entry) => score >= entry.from) ?? FOIR_BANDS[FOIR_BANDS.length - 1];

  return {
    score,
    label: band.label,
    tone: band.tone,
    monthlyIncome,
    maxEmiCapacity: Math.round(maxEmiCapacity),
    availableEmi: Math.round(availableEmi),
  };
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
  DEFAULT_LTV_PERCENT,
  DEFAULT_TENURE_YEARS,
  FOIR_LIMIT,
  eligibleLoanAmount,
  emiBreakdown,
  estimateEmi,
  foirScore,
  startingEmi,
};

export default finance;
