import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AssessmentForm from '../AssessmentForm';
import { assessmentLead, validateAnswers } from '../assessmentLead';
import { leadStorage } from '../../../../../utils/leadStorage';
import leadService from '../../../../../services/leadService';
import renderWith from '../../../../../test-utils';

jest.mock('../../../../../services/leadService', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

const answered = {
  name: 'Asha Rao',
  phone: '9876543210',
  email: '',
  occupation: 'salaried',
  employmentYears: '3-5',
  monthlyIncome: '150000-250000',
  exactMonthlyIncome: '',
  existingEmi: '10000-25000',
  emiTenure: '12-24',
  creditScore: 'good',
  downPayment: '20',
  hasCoApplicant: 'no',
  coApplicantIncome: '',
};

/** Answers the whole form on screen; the two chip rows are buttons. */
async function fillIn() {
  await userEvent.type(screen.getByLabelText(/full name/i), answered.name);
  await userEvent.type(screen.getByLabelText(/phone number/i), answered.phone);
  await userEvent.click(screen.getByRole('button', { name: /salaried/i }));
  await userEvent.selectOptions(
    screen.getByLabelText(/years in this job/i),
    answered.employmentYears
  );
  await userEvent.selectOptions(screen.getByLabelText(/^monthly income/i), answered.monthlyIncome);
  await userEvent.selectOptions(
    screen.getByLabelText(/emis you already pay/i),
    answered.existingEmi
  );
  await userEvent.selectOptions(screen.getByLabelText(/months still to run/i), answered.emiTenure);
  await userEvent.click(screen.getByRole('button', { name: /good \(700/i }));
}

beforeEach(() => {
  jest.clearAllMocks();
  leadStorage.clear();
  leadService.create.mockResolvedValue({ id: 91 });
});

describe('validateAnswers', () => {
  it('accepts a complete set of answers', () => {
    expect(validateAnswers(answered)).toEqual({});
  });

  it('asks for the six answers the arithmetic needs', () => {
    const errors = validateAnswers({ name: 'Asha Rao', phone: '9876543210' });

    expect(Object.keys(errors).sort()).toEqual([
      'creditScore',
      'employmentYears',
      'existingEmi',
      'monthlyIncome',
      'occupation',
    ]);
  });

  it('asks for a remaining tenure only when there is an EMI to have one', () => {
    expect(
      validateAnswers({ ...answered, existingEmi: '0', emiTenure: '' }).emiTenure
    ).toBeUndefined();
    expect(validateAnswers({ ...answered, emiTenure: '' }).emiTenure).toEqual(expect.any(String));
  });

  it('asks for the amount behind "enter an exact amount"', () => {
    const missing = validateAnswers({
      ...answered,
      monthlyIncome: 'exact',
      exactMonthlyIncome: '',
    });
    const zero = validateAnswers({ ...answered, monthlyIncome: 'exact', exactMonthlyIncome: '0' });
    const given = validateAnswers({
      ...answered,
      monthlyIncome: 'exact',
      exactMonthlyIncome: '91000',
    });

    expect(missing.exactMonthlyIncome).toEqual(expect.any(String));
    expect(zero.exactMonthlyIncome).toEqual(expect.any(String));
    expect(given.exactMonthlyIncome).toBeUndefined();
  });

  it('refuses a name or a phone number the API would', () => {
    expect(validateAnswers({ ...answered, name: '' }).name).toEqual(expect.any(String));
    expect(validateAnswers({ ...answered, phone: '12345' }).phone).toEqual(expect.any(String));
    expect(validateAnswers({ ...answered, email: 'not-an-address' }).email).toEqual(
      expect.any(String)
    );
  });
});

describe('assessmentLead', () => {
  it('carries every answer in meta and one line in message (D56)', () => {
    const { body, score } = assessmentLead({
      values: answered,
      source: 'bank-eligibility',
      propertyId: 7,
      propertyPrice: 12500000,
      bank: { id: 2, name: 'Garden City Bank' },
    });

    expect(body.source).toBe('bank-eligibility');
    expect(body.propertyId).toBe(7);
    expect(body.meta).toMatchObject({
      score: score.score,
      occupation: 'salaried',
      employmentYears: '3-5',
      monthlyIncome: '150000-250000',
      existingEmi: '10000-25000',
      emiTenure: '12-24',
      creditScore: 'good',
      downPayment: '20',
      hasCoApplicant: 'no',
      propertyPrice: 12500000,
      bank: 'Garden City Bank',
    });
    expect(body.message).toContain('Garden City Bank');
    expect(body.message).toContain(`${score.score}/100`);
  });

  it('leaves an untouched e-mail out of the body rather than sending "" (NEW-31)', () => {
    expect(
      assessmentLead({ values: answered, source: 'financial-assessment' }).body
    ).not.toHaveProperty('email');
  });

  it('drops a co-applicant income the visitor said not to count', () => {
    const { body } = assessmentLead({
      values: { ...answered, hasCoApplicant: 'no', coApplicantIncome: '50000-100000' },
      source: 'financial-assessment',
    });

    expect(body.meta.coApplicantIncome).toBe('');
  });
});

describe('<AssessmentForm>', () => {
  it('shows the conditional fields only when they apply', async () => {
    renderWith(<AssessmentForm source="financial-assessment" onComplete={jest.fn()} />);

    expect(screen.queryByLabelText(/months still to run/i)).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText(/emis you already pay/i), '10000-25000');
    expect(screen.getByLabelText(/months still to run/i)).toBeInTheDocument();

    // Choosing "no existing EMIs" takes the tenure question away again.
    await userEvent.selectOptions(screen.getByLabelText(/emis you already pay/i), '0');
    expect(screen.queryByLabelText(/months still to run/i)).not.toBeInTheDocument();

    expect(screen.queryByLabelText(/^your monthly income/i)).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText(/^monthly income/i), 'exact');
    expect(screen.getByLabelText(/^your monthly income/i)).toBeInTheDocument();

    expect(screen.queryByLabelText(/co-applicant’s monthly income/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^yes$/i }));
    expect(screen.getByLabelText(/co-applicant’s monthly income/i)).toBeInTheDocument();
  });

  it('refuses to submit an incomplete form and says what is missing', async () => {
    renderWith(<AssessmentForm source="financial-assessment" onComplete={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /check my eligibility/i }));

    expect(leadService.create).not.toHaveBeenCalled();
    expect(await screen.findByText(/choose what you do/i)).toBeInTheDocument();
    expect(screen.getByText(/choose your monthly income/i)).toBeInTheDocument();
  });

  it('files the lead and hands the reading over on success', async () => {
    const onComplete = jest.fn();
    renderWith(
      <AssessmentForm
        source="financial-assessment"
        propertyId={7}
        propertyPrice={12500000}
        onComplete={onComplete}
      />
    );

    await fillIn();
    await userEvent.click(screen.getByRole('button', { name: /check my eligibility/i }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(leadService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Asha Rao',
        phone: '9876543210',
        source: 'financial-assessment',
        propertyId: 7,
        meta: expect.objectContaining({ occupation: 'salaried', propertyPrice: 12500000 }),
      })
    );

    // 60 % of ₹2,00,000 is ₹1,20,000; ₹17,500 of it is already committed.
    const { score } = onComplete.mock.calls[0][0];
    expect(score.score).toBe(85);
    expect(score.label).toBe('Excellent');
  });

  it('opens the gated content on the listing, because the questions asked for more', async () => {
    renderWith(
      <AssessmentForm source="financial-assessment" propertyId={7} onComplete={jest.fn()} />
    );

    await fillIn();
    await userEvent.click(screen.getByRole('button', { name: /check my eligibility/i }));

    await waitFor(() => expect(leadStorage.isUnlocked(7, 'documents')).toBe(true));
    expect(leadStorage.isUnlocked(7, 'floorPlans')).toBe(true);
  });

  it('keeps the visitor on the form when the POST fails, with no reading (ADD-13)', async () => {
    const onComplete = jest.fn();
    leadService.create.mockRejectedValueOnce(new Error('Network unreachable'));
    renderWith(
      <AssessmentForm source="financial-assessment" propertyId={7} onComplete={onComplete} />
    );

    await fillIn();
    await userEvent.click(screen.getByRole('button', { name: /check my eligibility/i }));

    expect(await screen.findByText(/network unreachable/i)).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    expect(leadStorage.isUnlocked(7, 'documents')).toBe(false);

    // The answers are still there: a retry is one click.
    leadService.create.mockResolvedValueOnce({ id: 92 });
    await userEvent.click(screen.getByRole('button', { name: /check my eligibility/i }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });
});
