import Card from '../../../components/ui/Card';
import StatusChip from '../../../components/admin/StatusChip';
import {
  CREDIT_SCORES,
  EMI_TENURES,
  EMPLOYMENT_YEARS,
  EXACT_INCOME_OPTION,
  EXISTING_EMI_RANGES,
  INCOME_RANGES,
  OCCUPATIONS,
} from '../../../components/sections/property/finance/financeCopy';
import { formatDate, formatNumber, formatPrice } from '../../../utils/format';
import { metaFieldsOf } from '../../../utils/leadSources';
import { scoreBand } from '../../../utils/finance';

import styles from './LeadDetailPage.module.css';

/**
 * How the eligibility check's answers read (`finance/assessmentLead.js`): the
 * label of each question, and the words its stored value stands for — the
 * form's own option lists, so "50000-100000" reads "₹50,000 – ₹1,00,000" as
 * the visitor saw it (QA-53). The order is the form's.
 */
const KNOWN_FIELDS = {
  occupation: { label: 'Occupation', options: OCCUPATIONS },
  employmentYears: { label: 'Years in the job', options: EMPLOYMENT_YEARS },
  monthlyIncome: { label: 'Monthly income', options: [...INCOME_RANGES, EXACT_INCOME_OPTION] },
  exactMonthlyIncome: { label: 'Monthly income, exact', money: true },
  existingEmi: { label: 'Existing EMIs', options: EXISTING_EMI_RANGES, money: true },
  emiTenure: { label: 'EMIs still to run', options: EMI_TENURES },
  creditScore: { label: 'Credit score', options: CREDIT_SCORES },
  downPayment: { label: 'Down payment', percent: true },
  hasCoApplicant: { label: 'Co-applicant', yesNo: true },
  coApplicantIncome: { label: 'Co-applicant’s income', money: true },
  propertyPrice: { label: 'Property price', money: true },
};

/** The keys the card prints above the rows rather than among them. */
const HEADLINE_KEYS = ['score', 'band', 'bank', 'bankName'];

/**
 * What each key of a lead's `meta` is, for its source: first the boxes that
 * source's own forms ask for (`utils/leadSources` — a call-back's preferred
 * time, a legal enquiry's service, the home-loan bands), then the eligibility
 * check's answers. Keyed in the order they should print.
 *
 * @param {string} source
 * @returns {Map<string, {label: string, options?: Array<object>, date?: boolean}>}
 */
function describedFieldsOf(source) {
  const fields = new Map();
  for (const [key, field] of metaFieldsOf(source)) {
    fields.set(key, { label: field.label, options: field.options, date: field.type === 'date' });
  }
  for (const [key, field] of Object.entries(KNOWN_FIELDS)) {
    if (!fields.has(key)) fields.set(key, field);
  }
  return fields;
}

/**
 * The source-specific payload a form attached to the lead (D56).
 *
 * `meta` is deliberately free-form — today it holds the financial assessment's
 * answers, its score and the bank the visitor picked, a call-back's preferred
 * time, a legal enquiry's service; tomorrow it will hold whatever the next
 * calculator collects. A key the lead's form asked for reads with that form's
 * label and the words of the option the visitor chose — they used to print as
 * stored values, `preferredTime: evening`, `creditScore: excellent` (QA-53);
 * the score carries the band the visitor was shown, in its colour; and a key
 * nobody has ever seen before still renders, humanised.
 *
 * @param {object} props
 * @param {object} props.meta
 * @param {string} [props.source] the lead's source, whose forms name the keys
 * @returns {React.ReactNode|null} `null` when the lead carries no payload
 */
export default function LeadMetaCard({ meta, source }) {
  if (!meta || typeof meta !== 'object' || Object.keys(meta).length === 0) return null;

  const { score } = meta;
  // The form sends `bank`; `bankName` is what an older payload called it.
  const bankName = meta.bank ?? meta.bankName ?? null;
  const band = typeof score === 'number' ? scoreBand(score) : null;

  const described = describedFieldsOf(source);
  const known = [...described]
    .filter(([key]) => key in meta)
    .map(([key, field]) => [field.label, renderKnown(field, key, meta)]);
  const unknown = Object.entries(meta)
    .filter(([key]) => !described.has(key) && !HEADLINE_KEYS.includes(key))
    .map(([key, value]) => [humanise(key), renderValue(value)]);
  const rows = [...known, ...unknown].filter(([, value]) => value !== null);

  return (
    <Card as="section" className={styles.card} aria-labelledby="lead-meta-heading">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="lead-meta-heading">
          Submitted details
        </h2>
        {band ? (
          // The verdict the visitor read, in its own colour. The SEO score's
          // bands painted a 78 — "Excellent" on the site — as a warning.
          <StatusChip
            tone={band.tone}
            label={`Score ${formatNumber(score)} · ${meta.band || band.label}`}
          />
        ) : null}
      </div>

      {bankName ? (
        <p className={styles.metaBank}>
          Bank: <strong>{String(bankName)}</strong>
        </p>
      ) : null}

      {rows.length > 0 ? (
        <dl className={styles.facts}>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </Card>
  );
}

/** A number, or `null` for anything that is not one. */
const numeric = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value.trim())) return null;
  return Number(value);
};

/** One answer a form asked for, in the words the form offered. */
function renderKnown(field, key, meta) {
  const value = meta[key];
  if (value === null || value === undefined || value === '') return null;

  // "Enter an exact amount" is not an income: the amount is.
  if (field === KNOWN_FIELDS.monthlyIncome && value === EXACT_INCOME_OPTION.value) {
    const exact = numeric(meta.exactMonthlyIncome);
    return exact === null ? null : formatPrice(exact);
  }
  if (
    field === KNOWN_FIELDS.exactMonthlyIncome &&
    meta.monthlyIncome === EXACT_INCOME_OPTION.value
  ) {
    return null;
  }

  const option = field.options?.find((entry) => String(entry.value) === String(value));
  if (option) return option.label;
  if (field.date && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) return formatDate(value);

  const amount = numeric(value);
  if (field.money && amount !== null) return formatPrice(amount);
  if (field.percent && amount !== null)
    return `${formatNumber(amount, { maximumFractionDigits: 2 })}%`;
  if (field.yesNo) {
    if (value === true || value === 'yes') return 'Yes';
    if (value === false || value === 'no') return 'No';
  }
  return renderValue(value);
}

/** `monthlyIncome` → "Monthly income"; `loan_tenure` → "Loan tenure". */
function humanise(key) {
  const spaced = String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Anything at all, as one readable line — or `null` when there is nothing. */
function renderValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return formatNumber(value, { maximumFractionDigits: 2 });
  if (Array.isArray(value)) {
    const items = value.map(renderValue).filter(Boolean);
    return items.length > 0 ? items.join(', ') : null;
  }
  if (typeof value === 'object') {
    const items = Object.entries(value)
      .map(([key, entry]) => {
        const rendered = renderValue(entry);
        return rendered === null ? null : `${humanise(key)}: ${rendered}`;
      })
      .filter(Boolean);
    return items.length > 0 ? items.join(' · ') : null;
  }
  return String(value);
}
