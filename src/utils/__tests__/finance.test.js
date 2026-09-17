import {
  DEFAULT_LTV_PERCENT,
  DEFAULT_TENURE_YEARS,
  EMI_NUMERIC_VALUES,
  FOIR,
  MONTHLY_INCOME_VALUES,
  affordableProperty,
  eligibleLoan,
  emiBreakdown,
  estimateEmi,
  existingEmiOf,
  foirScore,
  monthlyIncomeOf,
  recommendations,
  scoreBand,
  startingEmi,
} from '../finance';
import copy from '../../components/sections/property/finance/financeCopy';

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
  it('borrows the chosen share and splits principal from interest', () => {
    const result = emiBreakdown({ price: 12500000, loanPercent: 80, rate: 8.5, years: 20 });

    expect(result.principal).toBe(10000000);
    expect(result.downPayment).toBe(2500000);
    expect(result.months).toBe(240);
    expect(result.emi).toBe(86782);
    expect(result.totalPayable).toBe(86782 * 240);
    expect(result.totalInterest).toBe(86782 * 240 - 10000000);
    expect(result.principalShare + result.interestShare).toBe(100);
  });

  it('defaults to 80 % over 20 years, as the price card quotes it', () => {
    const result = emiBreakdown({ price: 10000000, rate: 8.5 });

    expect(result.loanPercent).toBe(DEFAULT_LTV_PERCENT);
    expect(result.months).toBe(DEFAULT_TENURE_YEARS * 12);
  });

  it('never reports a negative interest or a share of nothing', () => {
    const result = emiBreakdown({ price: 0, loanPercent: 80, rate: 8.5, years: 20 });

    expect(result.totalInterest).toBe(0);
    expect(result.principalShare).toBe(0);
    expect(result.interestShare).toBe(0);
  });

  it('is an empty scenario rather than a throw when called with nothing', () => {
    expect(emiBreakdown().emi).toBe(0);
  });
});

describe('the lookup tables', () => {
  it('cover every bracket the form offers, and only those (D57)', () => {
    expect(Object.keys(MONTHLY_INCOME_VALUES).sort()).toEqual(
      copy.INCOME_RANGES.map((option) => option.value).sort()
    );
    expect(Object.keys(EMI_NUMERIC_VALUES).sort()).toEqual(
      copy.EXISTING_EMI_RANGES.map((option) => option.value).sort()
    );
  });

  it('reads a bracket, an exact amount or a plain number', () => {
    expect(monthlyIncomeOf({ monthlyIncome: '50000-100000' })).toBe(75000);
    expect(monthlyIncomeOf({ monthlyIncome: 'exact', exactMonthlyIncome: '91000' })).toBe(91000);
    expect(monthlyIncomeOf({ monthlyIncome: 120000 })).toBe(120000);
    expect(existingEmiOf({ existingEmi: '10000-25000' })).toBe(17500);
    expect(existingEmiOf({ existingEmi: '0' })).toBe(0);
    expect(existingEmiOf({})).toBe(0);
  });

  it('counts a co-applicant only when the visitor says there is one (D57)', () => {
    const alone = { monthlyIncome: '50000-100000' };
    const declared = { ...alone, hasCoApplicant: 'yes', coApplicantIncome: '25000-50000' };

    expect(monthlyIncomeOf(alone)).toBe(75000);
    expect(monthlyIncomeOf(declared)).toBe(75000 + 37500);
    // A bracket left behind after switching the toggle back is not income.
    expect(monthlyIncomeOf({ ...declared, hasCoApplicant: 'no' })).toBe(75000);
    // "Yes" with nothing chosen adds nothing (§7 of prompt 25).
    expect(monthlyIncomeOf({ ...alone, hasCoApplicant: 'yes' })).toBe(75000);
  });
});

describe('foirScore', () => {
  it('scores the whole EMI capacity when nothing is owed', () => {
    expect(foirScore({ monthlyIncome: 150000 }).score).toBe(100);
  });

  it('is the free share of the FOIR limit', () => {
    const result = foirScore({ monthlyIncome: 100000, existingEmi: 30000 });

    expect(result.maxEmiCapacity).toBe(FOIR * 100000);
    expect(result.availableEmi).toBe(30000);
    expect(result.score).toBe(50);
    expect(result.label).toBe('Good');
  });

  it('counts a declared co-applicant into the household income (D57)', () => {
    const together = foirScore({
      monthlyIncome: 100000,
      hasCoApplicant: 'yes',
      coApplicantIncome: 100000,
      existingEmi: 30000,
    });

    expect(together.monthlyIncome).toBe(200000);
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

  it('reads the answers the form collects', () => {
    const result = foirScore({ monthlyIncome: '150000-250000', existingEmi: '25000-50000' });

    expect(result.monthlyIncome).toBe(200000);
    expect(result.existingEmi).toBe(37500);
    expect(result.score).toBe(69);
  });
});

describe('scoreBand', () => {
  it('names the four bands at their boundaries', () => {
    expect(scoreBand(100).label).toBe('Excellent');
    expect(scoreBand(75).label).toBe('Excellent');
    expect(scoreBand(74).label).toBe('Good');
    expect(scoreBand(50).label).toBe('Good');
    expect(scoreBand(49).label).toBe('Moderate');
    expect(scoreBand(25).label).toBe('Moderate');
    expect(scoreBand(24).label).toBe('Needs improvement');
    expect(scoreBand(0).label).toBe('Needs improvement');
  });

  it('gives every band a message to print', () => {
    [100, 60, 30, 0].forEach((score) => {
      expect(copy.BAND_MESSAGES[scoreBand(score).key]).toEqual(expect.any(String));
    });
  });
});

describe('eligibleLoan', () => {
  it('turns the free EMI capacity back into a principal', () => {
    const principal = eligibleLoan({ monthlyIncome: 200000, existingEmi: 20000 }, 8.5, 20);

    // 60 % of 2 L less the 20 k already owed is an EMI of 1 L.
    expect(estimateEmi(principal, 8.5, 20)).toBe(100000);
  });

  it('is zero when the obligations leave no headroom', () => {
    expect(eligibleLoan({ monthlyIncome: 50000, existingEmi: 50000 })).toBe(0);
  });

  it('is zero rather than Infinity without a tenure', () => {
    expect(eligibleLoan({ monthlyIncome: 200000 }, 8.5, 0)).toBe(0);
  });

  it('lends more over a longer tenure and less at a higher rate', () => {
    const base = eligibleLoan({ monthlyIncome: 200000 }, 8.5, 20);

    expect(eligibleLoan({ monthlyIncome: 200000 }, 8.5, 30)).toBeGreaterThan(base);
    expect(eligibleLoan({ monthlyIncome: 200000 }, 11, 20)).toBeLessThan(base);
  });
});

describe('affordableProperty', () => {
  it('adds the down payment to the loan', () => {
    // A 40 L loan with 20 % down reaches a 50 L property.
    expect(affordableProperty(4000000, 20)).toBe(5000000);
    expect(affordableProperty(4000000, '50')).toBe(8000000);
  });

  it('is the loan itself with no down payment, and nothing without a loan', () => {
    expect(affordableProperty(4000000, 0)).toBe(4000000);
    expect(affordableProperty(0, 20)).toBe(0);
  });
});

describe('recommendations', () => {
  it('always ends with the advisor line, and every line has copy', () => {
    const tips = recommendations({ existingEmi: '0', downPayment: '20' }, 80);

    expect(tips[tips.length - 1].id).toBe('advisor');
    tips.forEach((tip) => expect(copy.RECOMMENDATIONS[tip.id]).toEqual(expect.any(String)));
  });

  it('uses the answers FOIR cannot (D57)', () => {
    const ids = (data, score) => recommendations(data, score).map((tip) => tip.id);

    expect(ids({ creditScore: 'fair', existingEmi: '0', downPayment: '20' }, 60)).toContain(
      'credit'
    );
    expect(
      ids({ creditScore: 'excellent', existingEmi: '0', downPayment: '20' }, 90)
    ).not.toContain('credit');
    expect(ids({ existingEmi: '10000-25000', downPayment: '20' }, 60)).toContain('existing-emi');
    expect(ids({ existingEmi: '0', downPayment: '10' }, 60)).toContain('down-payment');
    expect(ids({ existingEmi: '0', downPayment: '20', employmentYears: '0-1' }, 60)).toContain(
      'employment'
    );
    expect(ids({ existingEmi: '0', downPayment: '20', hasCoApplicant: 'yes' }, 60)).not.toContain(
      'co-applicant'
    );
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
