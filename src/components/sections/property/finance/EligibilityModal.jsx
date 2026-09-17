import { useEffect, useState } from 'react';

import { DEFAULT_TENURE_YEARS } from '../../../../utils/finance';
import { Modal } from '../../../ui';
import AssessmentForm from './AssessmentForm';
import AssessmentResult from './AssessmentResult';
import copy from './financeCopy';

import styles from './finance.module.css';

/**
 * The same questionnaire, asked about one lender.
 *
 * The lender changes two things and nothing else: the lead's source becomes
 * `bank-eligibility` and carries the bank in `meta` (D56), and the indicative
 * loan figure is quoted at that lender's own published starting rate rather
 * than at the section default. It is still Squares N Acres asking — the dialog
 * says so, because a visitor must not think they have applied to a bank.
 *
 * `Modal` provides the focus trap, the Escape handler and `role="dialog"`, and
 * is full-screen below 900 px; the boilerplate's dialog had none of that and
 * wrote `document.body.style.overflow` by hand (ADD-13).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {object|null} props.bank the lender of §6.6
 * @param {number|string|null} props.propertyId
 * @param {number|null} props.propertyPrice
 */
export default function EligibilityModal({ open, onClose, bank, propertyId, propertyPrice }) {
  const [answered, setAnswered] = useState(null);

  // A second lender is a second question: the dialog reopens on the form.
  useEffect(() => {
    if (open) setAnswered(null);
  }, [open, bank?.id]);

  if (!bank) return null;

  const rate = Number(bank.interestRateMin) > 0 ? Number(bank.interestRateMin) : undefined;
  const years =
    Number(bank.maxTenureYears) > 0
      ? Math.min(DEFAULT_TENURE_YEARS, Number(bank.maxTenureYears))
      : DEFAULT_TENURE_YEARS;

  return (
    <Modal
      open={open}
      onClose={onClose}
      mobile="fullscreen"
      size="lg"
      title={`Check eligibility — ${bank.name}`}
      description={copy.ELIGIBILITY_MODAL_INTRO}
    >
      <div className={styles.modalBody}>
        {answered ? (
          <AssessmentResult
            values={answered.values}
            score={answered.score}
            rate={rate ?? undefined}
            years={years}
            bank={bank}
            onDone={onClose}
            onRetake={() => setAnswered(null)}
          />
        ) : (
          <AssessmentForm
            source="bank-eligibility"
            propertyId={propertyId}
            propertyPrice={propertyPrice}
            bank={bank}
            onComplete={setAnswered}
          />
        )}
      </div>
    </Modal>
  );
}
