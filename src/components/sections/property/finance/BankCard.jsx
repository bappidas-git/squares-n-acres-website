import { Icon } from '@iconify/react';

import { Button, Chip } from '../../../ui';
import { formatPrice } from '../../../../utils/format';
import copy from './financeCopy';

import styles from './finance.module.css';

/** A number the record actually carries — `0` counts, `''` and `null` do not. */
const has = (value) => value !== null && value !== undefined && value !== '' && Number(value) > 0;

/** "8.35%", never "8.350000000000001%". */
const percent = (value) => `${Number(Number(value).toFixed(2))}%`;

/**
 * One lender, printed from its own record and from nothing else.
 *
 * Every line here comes from §6.6: the rate is `interestRateMin`, the funding
 * share is `maxLtvPercent`, the tenure is `maxTenureYears`, and a processing
 * fee appears only where the record carries a note about one. The boilerplate
 * printed "0.5% + GST", "48 Hrs", "Pre-Approved" and "Minimal documentation"
 * over six real bank brands, none of which any record said (ADD-13); a lender
 * that publishes nothing about a fee now simply has no fee line.
 *
 * @param {object} props
 * @param {object} props.bank a record of §6.6
 * @param {(bank: object) => void} props.onCheckEligibility
 */
export default function BankCard({ bank, onCheckEligibility }) {
  const facts = [
    has(bank.interestRateMin)
      ? { id: 'rate', label: copy.BANK_LABELS.rate, value: `${percent(bank.interestRateMin)} p.a.` }
      : null,
    has(bank.maxLtvPercent)
      ? {
          id: 'ltv',
          label: copy.BANK_LABELS.ltv,
          value: `${percent(bank.maxLtvPercent)} of the property value`,
        }
      : null,
    has(bank.maxTenureYears)
      ? {
          id: 'tenure',
          label: copy.BANK_LABELS.tenure,
          value: `${Number(bank.maxTenureYears)} years`,
        }
      : null,
    has(bank.minLoanAmount) || has(bank.maxLoanAmount)
      ? {
          id: 'loanRange',
          label: copy.BANK_LABELS.loanRange,
          value: [
            has(bank.minLoanAmount) ? formatPrice(bank.minLoanAmount) : null,
            has(bank.maxLoanAmount) ? formatPrice(bank.maxLoanAmount) : null,
          ]
            .filter(Boolean)
            .join(' – '),
        }
      : null,
  ].filter(Boolean);

  const features = Array.isArray(bank.features) ? bank.features.filter(Boolean) : [];

  return (
    <article className={styles.bankCard}>
      <header className={styles.bankHead}>
        <span className={styles.bankMark}>
          {bank.logoUrl ? (
            <img src={bank.logoUrl} alt="" className={styles.bankLogo} loading="lazy" />
          ) : (
            <Icon icon="mdi:bank-outline" aria-hidden="true" width="24" height="24" />
          )}
        </span>
        <h4 className={styles.bankName}>{bank.name}</h4>
      </header>

      <dl className={styles.bankFacts}>
        {facts.map((fact) => (
          <div key={fact.id} className={styles.bankFact}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>

      {features.length > 0 ? (
        <ul className={styles.bankFeatures}>
          {features.map((feature) => (
            <li key={feature}>
              <Icon icon="mdi:check" aria-hidden="true" /> {feature}
            </li>
          ))}
        </ul>
      ) : null}

      {bank.processingFeeNote ? (
        <Chip tone="neutral" size="sm" className={styles.bankFee}>
          Processing fee: {bank.processingFeeNote}
        </Chip>
      ) : null}

      <div className={styles.bankActions}>
        <Button size="sm" onClick={() => onCheckEligibility(bank)}>
          {copy.BANK_LABELS.check}
        </Button>
        {bank.applyUrl ? (
          <Button
            size="sm"
            variant="outline"
            href={bank.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            iconRight={<Icon icon="mdi:open-in-new" aria-hidden="true" />}
          >
            {copy.BANK_LABELS.apply}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
