import { Icon } from '@iconify/react';

import { Button } from '../../../ui';
import {
  DEFAULT_ASSESSMENT_RATE,
  DEFAULT_TENURE_YEARS,
  affordableProperty,
  eligibleLoan,
  recommendations,
} from '../../../../utils/finance';
import { formatPrice } from '../../../../utils/format';
import { toneStyles } from '../../../ui/tones';
import copy from './financeCopy';

import styles from './finance.module.css';

/**
 * The four figures the FOIR reading turns into.
 *
 * Exported for the unit test: an "eligibility breakdown" that does not add up
 * is worse than none at all.
 *
 * @param {object} values the answers
 * @param {{maxEmiCapacity: number, availableEmi: number, monthlyIncome: number,
 *   existingEmi: number}} score the reading of `foirScore`
 * @param {number} rate the rate the loan figure is quoted at
 * @returns {Array<{id: string, label: string, value: string, strong?: boolean}>}
 */
export function breakdownRows(values, score, rate) {
  const loan = eligibleLoan(values, rate);

  return [
    {
      id: 'monthlyIncome',
      label: copy.BREAKDOWN_LABELS.monthlyIncome,
      value: formatPrice(score.monthlyIncome),
    },
    {
      id: 'maxEmiCapacity',
      label: copy.BREAKDOWN_LABELS.maxEmiCapacity,
      value: formatPrice(score.maxEmiCapacity),
    },
    {
      id: 'existingEmi',
      label: copy.BREAKDOWN_LABELS.existingEmi,
      value: `− ${formatPrice(score.existingEmi)}`,
    },
    {
      id: 'availableEmi',
      label: copy.BREAKDOWN_LABELS.availableEmi,
      value: formatPrice(score.availableEmi),
      strong: true,
    },
    {
      id: 'eligibleLoan',
      label: copy.BREAKDOWN_LABELS.eligibleLoan,
      value: formatPrice(loan),
      strong: true,
    },
    {
      id: 'affordableProperty',
      label: copy.BREAKDOWN_LABELS.affordableProperty,
      value: formatPrice(affordableProperty(loan, values.downPayment)),
      strong: true,
    },
  ];
}

/**
 * What the answers add up to: the reading, the arithmetic behind it, what to do
 * about it, and the sentence that says who we are not.
 *
 * Nothing here is shown before `POST /leads` has accepted the answers — the
 * host renders this only from its success handler.
 *
 * @param {object} props
 * @param {object} props.values the answers
 * @param {object} props.score the reading of `foirScore`
 * @param {number} props.rate the rate the loan figure is quoted at
 * @param {number} props.years the tenure the loan figure is quoted over
 * @param {object|null} [props.bank] named in the rate note when there is one
 * @param {() => void} [props.onRetake]
 * @param {() => void} [props.onDone]
 * @param {'h3'|'h4'} [props.headingLevel]
 */
export default function AssessmentResult({
  values,
  score,
  rate = DEFAULT_ASSESSMENT_RATE,
  years = DEFAULT_TENURE_YEARS,
  bank = null,
  onRetake,
  onDone,
  headingLevel: Heading = 'h3',
}) {
  const palette = toneStyles(score.tone);
  const rows = breakdownRows(values, score, rate);
  const tips = recommendations(values, score.score);

  return (
    <div className={styles.result}>
      <div className={styles.resultHead}>
        <div
          className={styles.scoreCircle}
          style={{ borderColor: palette.border, background: palette.background }}
        >
          <span className={styles.scoreNumber} style={{ color: palette.color }}>
            {score.score}
          </span>
          <span className={styles.scoreOutOf}>/ 100</span>
        </div>
        <div>
          <span
            className={styles.scoreBand}
            style={{ background: palette.background, color: palette.color }}
          >
            <Icon icon={score.icon} aria-hidden="true" /> {score.label}
          </span>
          <Heading className={styles.resultTitle}>{copy.RESULT_TITLE}</Heading>
          <p className={styles.resultText}>{copy.BAND_MESSAGES[score.key]}</p>
        </div>
      </div>

      <div className={styles.breakdown}>
        <h4 className={styles.blockTitle}>Eligibility breakdown</h4>
        <dl className={styles.breakdownList}>
          {rows.map((row) => (
            <div
              key={row.id}
              className={[styles.breakdownRow, row.strong ? styles.breakdownStrong : '']
                .filter(Boolean)
                .join(' ')}
            >
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.note}>
          The loan and property figures are quoted at {rate}% p.a. over {years} years
          {bank ? ` — ${bank.name}’s published starting rate` : ''}.
        </p>
      </div>

      <div className={styles.recommendations}>
        <h4 className={styles.blockTitle}>What moves this figure</h4>
        <ul className={styles.recoList}>
          {tips.map((tip) => (
            <li key={tip.id} className={styles.recoItem}>
              <Icon
                icon={tip.icon}
                aria-hidden="true"
                style={{ color: toneStyles(tip.tone).color }}
              />
              <span>{copy.RECOMMENDATIONS[tip.id]}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className={styles.disclaimer}>
        <Icon icon="mdi:information-outline" aria-hidden="true" /> {copy.DISCLAIMER}
      </p>

      <div className={styles.resultActions}>
        {onDone ? <Button onClick={onDone}>{copy.DONE_LABEL}</Button> : null}
        {onRetake ? (
          <Button variant="outline" onClick={onRetake}>
            {copy.RETAKE_LABEL}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
