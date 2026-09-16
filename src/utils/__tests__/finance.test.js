import {
  DEFAULT_LTV_PERCENT,
  DEFAULT_TENURE_YEARS,
  eligibleLoanAmount,
  emiBreakdown,
  estimateEmi,
  foirScore,
  startingEmi,
} from '../finance';

describe('estimateEmi', () => {
  it('matches the reducing-balance formula', () => {
    // 1 Cr over 20 years at 8.5 % — the textbook answer is ₹86,782.
    expect(estimateEmi(10000000, 8.5, 20)).toBe(86782);
  });

  it('divides the principal by the months when the rate is zero', () => {
    expect(estimateEmi(1200000, 0, 10)).toBe(10000);
  });

  it('is zero rather than NaN without a principal or a tenure', () => {
    expect(estimateEmi(0, 8.5, 20)).toBe(0);
    expect(estimateEmi(5000000, 8.5, 0)).toBe(0);
    expect(estimateEmi(null, 8.5, 20)).toBe(0);
    expect(estimateEmi('not a number', 8.5, 20)).toBe(0);
  });

  it('reads numeric strings, as an input element hands them over', () => {
    expect(estimateEmi('10000000', '8.5', '20')).toBe(86782);
  });
});

describe('emiBreakdown', () => {
  it('adds the instalments up and splits principal from interest', () => {
    const result = emiBreakdown(10000000, 8.5, 20);

    expect(result.months).toBe(240);
    expect(result.emi).toBe(86782);
    expect(result.totalPayable).toBe(86782 * 240);
    expect(result.totalInterest).toBe(86782 * 240 - 10000000);
    expect(result.principalShare + result.interestShare).toBe(100);
  });

  it('never reports a negative interest or a share of nothing', () => {
    const result = emiBreakdown(0, 8.5, 20);

    expect(result.totalInterest).toBe(0);
    expect(result.principalShare).toBe(0);
    expect(result.interestShare).toBe(0);
  });
});

describe('foirScore', () => {
  it('scores the whole EMI capacity when nothing is owed', () => {
    expect(foirScore({ monthlyIncome: 150000 }).score).toBe(100);
  });

  it('counts a co-applicant into the household income (D57)', () => {
    const alone = foirScore({ monthlyIncome: 100000, existingEmi: 30000 });
    const together = foirScore({
      monthlyIncome: 100000,
      coApplicantIncome: 100000,
      existingEmi: 30000,
    });

    expect(alone.score).toBe(50);
    expect(together.score).toBe(75);
    expect(together.label).toBe('Excellent');
  });

  it('floors at zero when the obligations exceed the FOIR limit', () => {
    const result = foirScore({ monthlyIncome: 50000, existingEmi: 40000 });

    expect(result.score).toBe(0);
    expect(result.label).toBe('Needs improvement');
    expect(result.availableEmi).toBe(0);
  });

  it('scores zero — not Infinity — without an income', () => {
    expect(foirScore({}).score).toBe(0);
    expect(foirScore({ monthlyIncome: 0, existingEmi: 5000 }).score).toBe(0);
  });
});

describe('eligibleLoanAmount', () => {
  it('turns the free EMI capacity back into a principal', () => {
    const principal = eligibleLoanAmount(
      { monthlyIncome: 200000, existingEmi: 20000 },
      { annualRate: 8.5, years: 20 }
    );

    // 60 % of 2 L less the 20 k already owed is an EMI of 1 L.
    expect(estimateEmi(principal, 8.5, 20)).toBe(100000);
  });

  it('is zero when the obligations leave no headroom', () => {
    expect(eligibleLoanAmount({ monthlyIncome: 50000, existingEmi: 50000 })).toBe(0);
  });
});

describe('startingEmi', () => {
  const banks = [
    { name: 'Garden City Bank', interestRateMin: 8.35 },
    { name: 'Metro Capital Bank', interestRateMin: 8.4 },
  ];

  it('quotes the cheapest active lender at 80 % over 20 years', () => {
    const result = startingEmi(12400000, banks);

    expect(result.annualRate).toBe(8.35);
    expect(result.ltvPercent).toBe(DEFAULT_LTV_PERCENT);
    expect(result.years).toBe(DEFAULT_TENURE_YEARS);
    expect(result.principal).toBe(9920000);
    expect(result.emi).toBe(estimateEmi(9920000, 8.35, 20));
  });

  it('is null with no lender, so the card hides the line rather than inventing a rate', () => {
    expect(startingEmi(12400000, [])).toBeNull();
    expect(startingEmi(12400000, [{ name: 'No rate published' }])).toBeNull();
  });

  it('is null without a price — a listing on request has no principal', () => {
    expect(startingEmi(null, banks)).toBeNull();
    expect(startingEmi(0, banks)).toBeNull();
  });
});
