import { useState } from 'react';
import { Icon } from '@iconify/react';

import { Button } from '../../../ui';
import { DEFAULT_ASSESSMENT_RATE, DEFAULT_TENURE_YEARS } from '../../../../utils/finance';
import AssessmentForm from './AssessmentForm';
import AssessmentResult from './AssessmentResult';
import copy from './financeCopy';

import styles from './finance.module.css';

/**
 * The "Check eligibility" tab: the questionnaire, the reading it produces, and
 * the acknowledgement at the end.
 *
 * The three states are a small machine rather than three booleans — `form`
 * until the lead is filed, `result` while the visitor reads it, `done` once
 * they close it — and `AssessmentForm` moves it forward only from its own
 * success handler, so a failed `POST` cannot produce a score (ADD-13).
 *
 * @param {object} props
 * @param {number|string|null} props.propertyId
 * @param {number|null} props.propertyPrice
 * @param {number} [props.rate] the lowest active lender's rate
 * @param {number} [props.years]
 */
export default function EligibilityAssessment({
  propertyId,
  propertyPrice,
  rate = DEFAULT_ASSESSMENT_RATE,
  years = DEFAULT_TENURE_YEARS,
}) {
  const [stage, setStage] = useState('form');
  const [answered, setAnswered] = useState(null);

  if (stage === 'done' && answered) {
    return (
      <div className={styles.thankYou}>
        <Icon icon="mdi:check-circle-outline" className={styles.thankYouIcon} aria-hidden="true" />
        <h3 className={styles.thankYouTitle}>{copy.THANK_YOU_TITLE}</h3>
        <p className={styles.thankYouText}>{copy.THANK_YOU_TEXT}</p>
        <Button variant="outline" onClick={() => setStage('result')}>
          Read my reading again
        </Button>
      </div>
    );
  }

  if (stage === 'result' && answered) {
    return (
      <AssessmentResult
        values={answered.values}
        score={answered.score}
        rate={rate}
        years={years}
        onDone={() => setStage('done')}
        onRetake={() => {
          setAnswered(null);
          setStage('form');
        }}
      />
    );
  }

  return (
    <AssessmentForm
      source="financial-assessment"
      propertyId={propertyId}
      propertyPrice={propertyPrice}
      onComplete={(result) => {
        setAnswered(result);
        setStage('result');
      }}
    />
  );
}
