import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import { DEFAULT_LTV_PERCENT, DEFAULT_TENURE_YEARS, emiBreakdown } from '../../../../utils/finance';
import { formatPrice } from '../../../../utils/format';
import copy from './financeCopy';

import styles from './finance.module.css';

/** The slider bounds the section defaults to when the lenders say nothing. */
export const RATE_MIN = 6;
export const RATE_MAX = 15;
export const LOAN_MIN = 50;
export const TENURE_MIN = 5;
export const TENURE_MAX = 30;

/**
 * The bounds and starting points the lenders on this page imply.
 *
 * The loan slider stops where the most generous active lender stops, the rate
 * starts at the cheapest published one and the tenure stops at the longest —
 * so a visitor cannot drag the calculator to terms nobody on the page offers.
 * Exported for the unit test.
 *
 * @param {Array<object>} banks the active lenders of §6.6
 * @returns {{loanMax: number, loanStart: number, rateStart: number, tenureMax: number,
 *   tenureStart: number}}
 */
export function calculatorBounds(banks = []) {
  const ltvs = banks.map((bank) => Number(bank?.maxLtvPercent)).filter((n) => n > 0);
  const rates = banks.map((bank) => Number(bank?.interestRateMin)).filter((n) => n > 0);
  const tenures = banks.map((bank) => Number(bank?.maxTenureYears)).filter((n) => n > 0);

  const loanMax = ltvs.length > 0 ? Math.min(100, Math.max(...ltvs)) : DEFAULT_LTV_PERCENT;
  const tenureMax = tenures.length > 0 ? Math.max(...tenures) : TENURE_MAX;
  const rateStart = rates.length > 0 ? Math.min(...rates) : 8.5;

  return {
    loanMax: Math.max(LOAN_MIN, loanMax),
    loanStart: Math.min(DEFAULT_LTV_PERCENT, Math.max(LOAN_MIN, loanMax)),
    rateStart: Math.min(RATE_MAX, Math.max(RATE_MIN, rateStart)),
    tenureMax: Math.max(TENURE_MIN, Math.min(TENURE_MAX, tenureMax)),
    tenureStart: Math.min(DEFAULT_TENURE_YEARS, Math.max(TENURE_MIN, tenureMax)),
  };
}

/**
 * What a bigger down payment is worth, in rupees of interest.
 *
 * Computed from the two scenarios rather than from a percentage of the first
 * one: the boilerplate printed "approx. 8 % of the interest" whatever the
 * sliders said (ADD-13).
 *
 * @returns {{downPaymentPercent: number, saved: number}|null} `null` when the
 *   slider is already at its floor, or the saving rounds to nothing
 */
export function downPaymentTip({ price, loanPercent, rate, years, loanMax }) {
  const next = Math.max(LOAN_MIN, loanPercent - 5);
  if (next >= loanPercent || next > loanMax) return null;

  const now = emiBreakdown({ price, loanPercent, rate, years });
  const better = emiBreakdown({ price, loanPercent: next, rate, years });
  const saved = now.totalInterest - better.totalInterest;

  return saved > 0 ? { downPaymentPercent: 100 - next, saved } : null;
}

const Slider = ({ id, label, value, valueText, min, max, step = 1, onChange, scale }) => (
  <div className={styles.sliderBlock}>
    <div className={styles.sliderHead}>
      <label htmlFor={id}>{label}</label>
    </div>
    <input
      id={id}
      type="range"
      className={styles.slider}
      min={min}
      max={max}
      step={step}
      value={value}
      // Without this the thumb announces the bare number: "1 800 000", not
      // "72% of the price — ₹18 L". `min`/`max`/`value` already give the
      // range's own three ARIA properties (§4.3).
      aria-valuetext={valueText}
      onChange={(event) => onChange(Number(event.target.value))}
    />
    <div className={styles.sliderScale}>
      <span>{scale[0]}</span>
      <span>{scale[1]}</span>
    </div>
  </div>
);

/**
 * The EMI calculator: three sliders and what they add up to.
 *
 * Every figure comes from `utils/finance.js`, so the instalment here and the
 * "EMI from …" on the price card are the same arithmetic.
 *
 * @param {object} props
 * @param {number} props.price the property price, or the bottom of its range
 * @param {Array<object>} [props.banks] the active lenders, which set the bounds
 */
export default function EmiCalculator({ price, banks = [] }) {
  const bounds = useMemo(() => calculatorBounds(banks), [banks]);
  const [loanPercent, setLoanPercent] = useState(bounds.loanStart);
  const [rate, setRate] = useState(bounds.rateStart);
  const [years, setYears] = useState(bounds.tenureStart);

  const share = Math.min(loanPercent, bounds.loanMax);
  const result = emiBreakdown({ price, loanPercent: share, rate, years });
  const tip = downPaymentTip({ price, loanPercent: share, rate, years, loanMax: bounds.loanMax });

  const totals = [
    { id: 'downPayment', label: copy.EMI_LABELS.downPayment, value: result.downPayment },
    { id: 'principal', label: copy.EMI_LABELS.principal, value: result.principal },
    { id: 'totalInterest', label: copy.EMI_LABELS.totalInterest, value: result.totalInterest },
    { id: 'totalPayable', label: copy.EMI_LABELS.totalPayable, value: result.totalPayable },
  ];

  return (
    <div className={styles.emi}>
      <div className={styles.emiControls}>
        <p className={styles.emiPrice}>
          <span>{copy.EMI_LABELS.price}</span>
          <strong>{formatPrice(price)}</strong>
        </p>

        <Slider
          id="emi-loan-percent"
          label={`${copy.EMI_LABELS.loanPercent} — ${share}% (${formatPrice(result.principal)})`}
          value={share}
          valueText={`${share}% — ${formatPrice(result.principal)}`}
          min={LOAN_MIN}
          max={bounds.loanMax}
          onChange={setLoanPercent}
          scale={[`${LOAN_MIN}%`, `${bounds.loanMax}%`]}
        />

        <Slider
          id="emi-rate"
          label={`${copy.EMI_LABELS.rate} — ${rate}% p.a.`}
          value={rate}
          valueText={`${rate}% per year`}
          min={RATE_MIN}
          max={RATE_MAX}
          step={0.05}
          onChange={setRate}
          scale={[`${RATE_MIN}%`, `${RATE_MAX}%`]}
        />

        <Slider
          id="emi-years"
          label={`${copy.EMI_LABELS.years} — ${years} years`}
          value={years}
          valueText={`${years} years`}
          min={TENURE_MIN}
          max={bounds.tenureMax}
          onChange={setYears}
          scale={[`${TENURE_MIN} years`, `${bounds.tenureMax} years`]}
        />
      </div>

      <div className={styles.emiResults}>
        <div className={styles.emiHero}>
          <span className={styles.emiHeroLabel}>{copy.EMI_LABELS.emi}</span>
          <strong className={styles.emiHeroValue}>{formatPrice(result.emi)}</strong>
          <span className={styles.emiHeroNote}>
            for {years} years at {rate}% p.a.
          </span>
        </div>

        <div className={styles.split}>
          <span className={styles.splitLabel}>{copy.EMI_LABELS.split}</span>
          <div
            className={styles.splitBar}
            role="img"
            aria-label={`${result.principalShare}% principal, ${result.interestShare}% interest`}
          >
            <span
              className={styles.splitPrincipal}
              style={{ width: `${result.principalShare}%` }}
            />
            <span className={styles.splitInterest} style={{ width: `${result.interestShare}%` }} />
          </div>
          <div className={styles.splitLegend}>
            <span className={styles.legendPrincipal}>
              {copy.EMI_LABELS.principal} {result.principalShare}%
            </span>
            <span className={styles.legendInterest}>
              {copy.EMI_LABELS.interest} {result.interestShare}%
            </span>
          </div>
        </div>

        <dl className={styles.emiTotals}>
          {totals.map((row) => (
            <div key={row.id} className={styles.emiTotalRow}>
              <dt>{row.label}</dt>
              <dd>{formatPrice(row.value)}</dd>
            </div>
          ))}
        </dl>

        {tip ? (
          <p className={styles.tip}>
            <Icon icon="mdi:lightbulb-on-outline" aria-hidden="true" /> Raising your down payment to{' '}
            {tip.downPaymentPercent}% would save about {formatPrice(tip.saved)} in interest over{' '}
            {years} years.
          </p>
        ) : null}

        <p className={styles.note}>{copy.EMI_NOTE}</p>
      </div>
    </div>
  );
}
