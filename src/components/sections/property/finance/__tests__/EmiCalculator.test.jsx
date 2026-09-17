import { fireEvent, screen } from '@testing-library/react';

import EmiCalculator, { calculatorBounds, downPaymentTip } from '../EmiCalculator';
import { emiBreakdown } from '../../../../../utils/finance';
import renderWith from '../../../../../test-utils';

const banks = [
  { id: 1, name: 'Garden City Bank', interestRateMin: 8.35, maxLtvPercent: 80, maxTenureYears: 30 },
  {
    id: 2,
    name: 'Southern Housing Finance',
    interestRateMin: 8.55,
    maxLtvPercent: 85,
    maxTenureYears: 25,
  },
];

const slider = (name) => screen.getByRole('slider', { name });

describe('calculatorBounds', () => {
  it('stops where the most generous lender on the page stops', () => {
    const bounds = calculatorBounds(banks);

    expect(bounds.loanMax).toBe(85);
    expect(bounds.rateStart).toBe(8.35);
    expect(bounds.tenureMax).toBe(30);
  });

  it('caps a lender at 75 % funding (§7 of prompt 25)', () => {
    expect(calculatorBounds([{ maxLtvPercent: 75, interestRateMin: 9 }]).loanMax).toBe(75);
  });

  it('starts at 80 % over 20 years, or at the lender’s limit when it is lower', () => {
    expect(calculatorBounds(banks).loanStart).toBe(80);
    expect(calculatorBounds(banks).tenureStart).toBe(20);
    expect(calculatorBounds([{ maxLtvPercent: 70, maxTenureYears: 15 }]).loanStart).toBe(70);
    expect(calculatorBounds([{ maxLtvPercent: 70, maxTenureYears: 15 }]).tenureStart).toBe(15);
  });

  it('falls back to the site defaults when the lenders publish nothing', () => {
    const bounds = calculatorBounds([{ name: 'Nothing published' }]);

    expect(bounds.loanMax).toBe(80);
    expect(bounds.tenureMax).toBe(30);
    expect(bounds.rateStart).toBe(8.5);
  });
});

describe('downPaymentTip', () => {
  it('is the difference between two real scenarios, not a flat 8 % (ADD-13)', () => {
    const inputs = { price: 12500000, loanPercent: 80, rate: 8.5, years: 20, loanMax: 85 };
    const tip = downPaymentTip(inputs);

    const now = emiBreakdown({ price: 12500000, loanPercent: 80, rate: 8.5, years: 20 });
    const better = emiBreakdown({ price: 12500000, loanPercent: 75, rate: 8.5, years: 20 });

    expect(tip.downPaymentPercent).toBe(25);
    expect(tip.saved).toBe(now.totalInterest - better.totalInterest);
  });

  it('has nothing to suggest at the floor of the slider', () => {
    expect(
      downPaymentTip({ price: 12500000, loanPercent: 50, rate: 8.5, years: 20, loanMax: 85 })
    ).toBeNull();
  });
});

describe('<EmiCalculator>', () => {
  it('prints the instalment the formula gives for the starting position', () => {
    renderWith(<EmiCalculator price={12500000} banks={banks} />);

    // 80 % of ₹1.25 Cr — a ₹1 Cr loan — at 8.35 % over 20 years.
    const expected = emiBreakdown({ price: 12500000, loanPercent: 80, rate: 8.35, years: 20 });
    expect(expected.principal).toBe(10000000);
    expect(expected.emi).toBe(85835);
    expect(screen.getByText('₹85,835')).toBeInTheDocument();
    expect(screen.getByText('₹1.25 Cr')).toBeInTheDocument();
  });

  it('caps the loan slider at the most generous lender’s funding share', () => {
    renderWith(<EmiCalculator price={12500000} banks={[{ ...banks[0], maxLtvPercent: 75 }]} />);

    expect(slider(/loan amount/i)).toHaveAttribute('max', '75');
    expect(screen.getByText(/loan amount — 75%/i)).toBeInTheDocument();
  });

  it('recalculates when the tenure moves', () => {
    renderWith(<EmiCalculator price={12500000} banks={banks} />);

    fireEvent.change(slider(/tenure/i), { target: { value: '30' } });

    const expected = emiBreakdown({ price: 12500000, loanPercent: 80, rate: 8.35, years: 30 });
    expect(screen.getByText(`₹${expected.emi.toLocaleString('en-IN')}`)).toBeInTheDocument();
    expect(screen.getByText(/for 30 years at 8.35% p.a./i)).toBeInTheDocument();
  });

  it('splits the total into principal and interest, adding to 100', () => {
    renderWith(<EmiCalculator price={12500000} banks={banks} />);

    const bar = screen.getByRole('img');
    const [, principal, interest] = bar
      .getAttribute('aria-label')
      .match(/(\d+)% principal, (\d+)% interest/);

    expect(Number(principal) + Number(interest)).toBe(100);
  });
});
