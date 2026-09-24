/**
 * What a form attached to a lead, as the desk reads it (D56, QA-53).
 *
 * The card used to print stored values — `monthlyIncome: 50000-100000`,
 * `preferredTime: evening` — and coloured the eligibility score with the SEO
 * score's bands, so a 78 the visitor was told is "Excellent" showed as a
 * warning. It now reads each answer in the words of the form that asked it.
 */

import { screen } from '@testing-library/react';

import LeadMetaCard from '../LeadMetaCard';
import renderWith from '../../../../test-utils';

/** What `finance/assessmentLead.js` sends. */
const ASSESSMENT = {
  score: 78,
  band: 'Excellent',
  occupation: 'salaried',
  employmentYears: '5-10',
  monthlyIncome: '150000-250000',
  exactMonthlyIncome: '',
  existingEmi: '10000-25000',
  emiTenure: '24+',
  creditScore: 'excellent',
  downPayment: '20',
  hasCoApplicant: 'yes',
  coApplicantIncome: '60000',
  propertyPrice: 12500000,
  bank: 'Garden City Bank',
};

/** The value printed under a label: the definition paired with its term. */
const valueOf = (label) => {
  const terms = screen.getAllByRole('term').map((term) => term.textContent);
  return screen.getAllByRole('definition')[terms.indexOf(label)]?.textContent;
};

describe('LeadMetaCard', () => {
  it('renders nothing for a lead without a payload', () => {
    const { container } = renderWith(<LeadMetaCard meta={null} source="contact-page" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('gives the score the band the visitor was shown, and names the bank', () => {
    renderWith(<LeadMetaCard meta={ASSESSMENT} source="financial-assessment" />);

    expect(screen.getByText('Score 78 · Excellent')).toBeInTheDocument();
    expect(screen.getByText('Garden City Bank')).toBeInTheDocument();
  });

  it('reads the eligibility answers in the form’s own words', () => {
    renderWith(<LeadMetaCard meta={ASSESSMENT} source="financial-assessment" />);

    expect(valueOf('Occupation')).toBe('Salaried');
    expect(valueOf('Years in the job')).toBe('5 – 10 years');
    expect(valueOf('Monthly income')).toBe('₹1,50,000 – ₹2,50,000');
    expect(valueOf('Existing EMIs')).toBe('₹10,000 – ₹25,000');
    expect(valueOf('EMIs still to run')).toBe('More than 24 months');
    expect(valueOf('Credit score')).toBe('Excellent (750+)');
    expect(valueOf('Down payment')).toBe('20%');
    expect(valueOf('Co-applicant')).toBe('Yes');
    expect(valueOf('Co-applicant’s income')).toBe('₹60,000');
    expect(valueOf('Property price')).toBe('₹1.25 Cr');
    // An empty answer is not a row.
    expect(screen.queryByText('Monthly income, exact')).not.toBeInTheDocument();
  });

  it('prints an exact income as the income', () => {
    renderWith(
      <LeadMetaCard
        meta={{ ...ASSESSMENT, monthlyIncome: 'exact', exactMonthlyIncome: '185000' }}
        source="financial-assessment"
      />
    );

    expect(valueOf('Monthly income')).toBe('₹1.85 L');
    expect(screen.queryByText('Monthly income, exact')).not.toBeInTheDocument();
  });

  it('labels a source’s own boxes with that form’s question and options', () => {
    renderWith(
      <LeadMetaCard
        meta={{ preferredDate: '2026-09-27', preferredTime: 'evening' }}
        source="site-visit-request"
      />
    );

    expect(valueOf('Preferred time')).toBe('Evening (4 pm – 8 pm)');
    expect(valueOf('Preferred date')).toBe('27 Sep 2026');
  });

  it('reads the home-loan bands with the home-loan form’s options', () => {
    renderWith(
      <LeadMetaCard
        meta={{ monthlyIncome: '1l-2l', desiredLoanAmount: '50l-1cr' }}
        source="home-loan"
      />
    );

    expect(valueOf('Monthly income')).toBe('₹1,00,000 – ₹2,00,000');
    expect(valueOf('Loan amount')).toBe('₹50 L – ₹1 Cr');
  });

  it('still renders a key nobody has seen before', () => {
    renderWith(
      <LeadMetaCard meta={{ teamSize: 12, needsParking: true }} source="flexible-workspace" />
    );

    expect(valueOf('Team size')).toBe('12');
    expect(valueOf('Needs parking')).toBe('Yes');
  });
});
