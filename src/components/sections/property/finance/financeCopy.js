/**
 * Every word and every option list the finance section prints.
 *
 * It is one file so that the claims can be read in one sitting and checked
 * against §14 of the master context: Squares N Acres is an advisory, not a
 * lender, so nothing here promises an approval, a turnaround time, a "lowest"
 * rate or a processing fee. What a bank offers is printed from the bank's own
 * record (§6.6) and from nowhere else; what the assessment says is the FOIR
 * arithmetic of `utils/finance.js` and the disclaimer that goes with it.
 *
 * The option `value`s of `INCOME_RANGES` and `EXISTING_EMI_RANGES` are the keys
 * of `MONTHLY_INCOME_VALUES` and `EMI_NUMERIC_VALUES`; the unit test holds the
 * two lists against each other.
 */

export const SECTION_TITLE = 'Home loan & EMI';

export const SECTION_SUBTITLE =
  'Work out what this property costs every month, compare the lenders we work with, and check where you stand before you apply.';

export const TABS = [
  { value: 'eligibility', label: 'Check eligibility', icon: 'mdi:clipboard-check-outline' },
  { value: 'banks', label: 'Bank loans', icon: 'mdi:bank-outline' },
  { value: 'emi', label: 'EMI calculator', icon: 'mdi:calculator-variant-outline' },
];

/* ── The assessment form ─────────────────────────────────────────────── */

export const OCCUPATIONS = [
  { value: 'salaried', label: 'Salaried', icon: 'mdi:briefcase-outline' },
  { value: 'self-employed', label: 'Self-employed', icon: 'mdi:account-tie-outline' },
  { value: 'business-owner', label: 'Business owner', icon: 'mdi:store-outline' },
  { value: 'professional', label: 'Professional', icon: 'mdi:school-outline' },
  { value: 'retired', label: 'Retired', icon: 'mdi:account-clock-outline' },
];

export const EMPLOYMENT_YEARS = [
  { value: '0-1', label: 'Less than 1 year' },
  { value: '1-3', label: '1 – 3 years' },
  { value: '3-5', label: '3 – 5 years' },
  { value: '5-10', label: '5 – 10 years' },
  { value: '10+', label: '10+ years' },
];

export const INCOME_RANGES = [
  { value: '0-25000', label: 'Below ₹25,000' },
  { value: '25000-50000', label: '₹25,000 – ₹50,000' },
  { value: '50000-100000', label: '₹50,000 – ₹1,00,000' },
  { value: '100000-150000', label: '₹1,00,000 – ₹1,50,000' },
  { value: '150000-250000', label: '₹1,50,000 – ₹2,50,000' },
  { value: '250000+', label: 'Above ₹2,50,000' },
];

/** The applicant's own select offers the exact amount as well. */
export const EXACT_INCOME_OPTION = { value: 'exact', label: 'Enter an exact amount' };

export const EXISTING_EMI_RANGES = [
  { value: '0', label: 'No existing EMIs' },
  { value: '1-10000', label: 'Up to ₹10,000' },
  { value: '10000-25000', label: '₹10,000 – ₹25,000' },
  { value: '25000-50000', label: '₹25,000 – ₹50,000' },
  { value: '50000+', label: 'Above ₹50,000' },
];

export const EMI_TENURES = [
  { value: '0-12', label: 'Up to 12 months' },
  { value: '12-24', label: '12 – 24 months' },
  { value: '24+', label: 'More than 24 months' },
];

export const CREDIT_SCORES = [
  { value: 'excellent', label: 'Excellent (750+)', tone: 'success' },
  { value: 'good', label: 'Good (700 – 749)', tone: 'info' },
  { value: 'fair', label: 'Fair (650 – 699)', tone: 'warning' },
  { value: 'poor', label: 'Below 650', tone: 'error' },
  { value: 'not-sure', label: 'Not sure', tone: 'neutral' },
];

export const FORM_LABELS = {
  personal: 'Your details',
  employment: 'Work',
  financial: 'Income and obligations',
  coApplicant: 'Co-applicant',
  name: 'Full name',
  phone: 'Phone number',
  email: 'E-mail address',
  occupation: 'What do you do?',
  employmentYears: 'Years in this job or business',
  monthlyIncome: 'Monthly income',
  exactMonthlyIncome: 'Your monthly income',
  existingEmi: 'Monthly EMIs you already pay',
  emiTenure: 'Months still to run on those EMIs',
  creditScore: 'Credit score',
  downPayment: 'Down payment you can arrange',
  hasCoApplicant: 'Are you applying with a co-applicant?',
  coApplicantIncome: 'Co-applicant’s monthly income',
};

export const FORM_ERRORS = {
  occupation: 'Choose what you do',
  employmentYears: 'Choose how long you have been there',
  monthlyIncome: 'Choose your monthly income',
  exactMonthlyIncome: 'Enter your monthly income in rupees',
  existingEmi: 'Choose your current EMIs, or “No existing EMIs”',
  emiTenure: 'Choose how long those EMIs still run',
  creditScore: 'Choose the range your credit score is in',
};

export const FORM_INTRO =
  'Six answers give you a FOIR reading — the share of your income a lender lets an EMI take — and an indicative loan figure. An advisor follows up with the lenders that fit.';

export const SUBMIT_LABEL = 'Check my eligibility';
export const SUBMIT_PENDING = 'Checking…';
export const SUBMIT_ERROR = 'We could not record your answers. Please try again.';

export const PRIVACY_NOTE =
  'Your answers are used to advise you on this property and nothing else.';

/* ── The result ──────────────────────────────────────────────────────── */

export const RESULT_TITLE = 'Your FOIR reading';

export const BAND_MESSAGES = {
  excellent:
    'Almost all of the EMI room a lender allows you is still free. On FOIR alone this profile is a comfortable one to take to a bank.',
  good: 'Most of the EMI room a lender allows you is still free. On FOIR alone there is room for a home loan on this property.',
  moderate:
    'A sizeable part of your EMI room is already committed. Clearing an existing loan, or stretching the tenure, is what moves this figure.',
  'needs-improvement':
    'Your current EMIs use up most of the room a lender allows. Clearing them, or adding a co-applicant’s income, is what changes the arithmetic.',
};

export const BREAKDOWN_LABELS = {
  monthlyIncome: 'Monthly income counted',
  maxEmiCapacity: 'EMI a lender allows (60% FOIR)',
  existingEmi: 'Existing EMIs',
  availableEmi: 'Room left for a new EMI',
  eligibleLoan: 'Indicative loan you could service',
  affordableProperty: 'Property value that reaches',
};

export const RECOMMENDATIONS = {
  eligible:
    'On FOIR alone there is room for a home loan on this property. A lender will also look at your credit history, your documents and the property itself.',
  credit:
    'Lenders price a loan off the credit score. Moving into the 750+ band is the single change that most often improves the rate you are offered.',
  'existing-emi':
    'Closing or reducing an existing EMI frees the same amount for a home-loan EMI, rupee for rupee.',
  'down-payment':
    'A larger down payment means a smaller loan, a smaller EMI and less interest over the tenure — the calculator tab shows by how much.',
  'co-applicant':
    'A co-applicant’s income is added to yours when a lender works out the EMI you can carry.',
  employment:
    'Most lenders want to see a settled income. Time in the same job or business usually helps the file.',
  advisor:
    'An advisor will call to go through the lenders that suit this profile and this project.',
};

export const RETAKE_LABEL = 'Change my answers';
export const DONE_LABEL = 'Done';

export const THANK_YOU_TITLE = 'Thank you — we have your answers';
export const THANK_YOU_TEXT =
  'An advisor will call you to go through the lenders that suit this profile. Nothing has been sent to a bank; that only happens when you ask us to.';

export const DISCLAIMER =
  'Squares N Acres is not a bank, NBFC or financial institution and this is not a loan offer. The reading above is the standard FOIR arithmetic applied to the answers you gave, at an indicative rate over an indicative tenure. What you are actually sanctioned, at what rate and on what terms, is decided by the lender after its own assessment of you and of the property.';

/* ── Bank cards ──────────────────────────────────────────────────────── */

export const BANKS_INTRO =
  'The lenders we work with on this project. The figures are each lender’s own; confirm the current card with them before you apply.';

export const BANK_LABELS = {
  rate: 'Interest from',
  ltv: 'Funding up to',
  tenure: 'Tenure up to',
  loanRange: 'Loan size',
  check: 'Check eligibility',
  apply: 'Go to the lender',
  showAll: 'View all banks',
  showFewer: 'Show fewer banks',
};

export const BANK_EMPTY = 'No lender is listed for this project yet.';

export const ELIGIBILITY_MODAL_INTRO =
  'The same six answers, read against this lender’s published rate. Squares N Acres records them and an advisor follows up; nothing is sent to the lender.';

/* ── EMI calculator ──────────────────────────────────────────────────── */

export const EMI_LABELS = {
  price: 'Property price',
  loanPercent: 'Loan amount',
  rate: 'Interest rate',
  years: 'Tenure',
  emi: 'Monthly EMI',
  principal: 'Principal',
  interest: 'Interest',
  downPayment: 'Down payment',
  totalInterest: 'Total interest',
  totalPayable: 'Total payable',
  split: 'What you repay',
};

export const EMI_NOTE =
  'A reducing-balance EMI on the figures above. Insurance, stamp duty, registration and a lender’s own charges are not included.';

const financeCopy = {
  BANKS_INTRO,
  BANK_EMPTY,
  BANK_LABELS,
  BAND_MESSAGES,
  BREAKDOWN_LABELS,
  CREDIT_SCORES,
  DISCLAIMER,
  DONE_LABEL,
  ELIGIBILITY_MODAL_INTRO,
  EMI_LABELS,
  EMI_NOTE,
  EMI_TENURES,
  EMPLOYMENT_YEARS,
  EXACT_INCOME_OPTION,
  EXISTING_EMI_RANGES,
  FORM_ERRORS,
  FORM_INTRO,
  FORM_LABELS,
  INCOME_RANGES,
  OCCUPATIONS,
  PRIVACY_NOTE,
  RECOMMENDATIONS,
  RESULT_TITLE,
  RETAKE_LABEL,
  SECTION_SUBTITLE,
  SECTION_TITLE,
  SUBMIT_ERROR,
  SUBMIT_LABEL,
  SUBMIT_PENDING,
  TABS,
  THANK_YOU_TEXT,
  THANK_YOU_TITLE,
};

export default financeCopy;
