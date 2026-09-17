import Card from '../../../components/ui/Card';
import StatusChip from '../../../components/admin/StatusChip';
import { formatNumber } from '../../../utils/format';

import styles from './LeadDetailPage.module.css';

/**
 * The source-specific payload a form attached to the lead (D56).
 *
 * `meta` is deliberately free-form — today it holds the financial assessment's
 * answers, its score and the bank the visitor picked; tomorrow it will hold
 * whatever the next calculator collects. So the card renders it generically:
 * the score gets a band chip because a number out of a hundred means
 * something, and everything else becomes a humanised label and a readable
 * value. A key nobody has ever seen before still renders.
 *
 * @param {object} props
 * @param {object} props.meta
 * @returns {React.ReactNode|null} `null` when the lead carries no payload
 */
export default function LeadMetaCard({ meta }) {
  if (!meta || typeof meta !== 'object' || Object.keys(meta).length === 0) return null;

  const { score, bankName, ...rest } = meta;
  const rows = Object.entries(rest)
    .map(([key, value]) => [key, renderValue(value)])
    .filter(([, value]) => value !== null);

  return (
    <Card as="section" className={styles.card} aria-labelledby="lead-meta-heading">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="lead-meta-heading">
          Submitted details
        </h2>
        {typeof score === 'number' ? (
          <StatusChip tone={bandOf(score)} label={`Score ${formatNumber(score)}`} />
        ) : null}
      </div>

      {bankName ? (
        <p className={styles.metaBank}>
          Bank: <strong>{bankName}</strong>
        </p>
      ) : null}

      {rows.length > 0 ? (
        <dl className={styles.facts}>
          {rows.map(([key, value]) => (
            <div key={key}>
              <dt>{humanise(key)}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </Card>
  );
}

/** The same three bands the SEO score uses, so one number reads like another. */
function bandOf(score) {
  if (score >= 81) return 'success';
  if (score >= 51) return 'warning';
  return 'error';
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
