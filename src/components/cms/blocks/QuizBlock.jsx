import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import { Button, Container, Section, SectionHeader } from '../../ui';

import styles from './blocks.module.css';

/**
 * A short multiple-choice quiz (§6.10 `quiz`, D27) — the awareness page's
 * "how much do you know" band.
 *
 * One question at a time, four answers as buttons, and the explanation shown
 * the moment an answer is picked, right or wrong: the explanation is the
 * content, the score is the excuse for reading it. Nothing is stored — a quiz
 * a visitor cannot retake is a test, and this is not one.
 *
 * Every control is a real `<button>` and the progress bar is a real
 * `role="progressbar"`, so the whole thing works from a keyboard (§8.3).
 */

/** Getting this share right is what the result screen congratulates. */
export const PASS_RATIO = 0.6;

/** The band a score falls into. Exported for the unit test. */
export function scoreBand(correct, total) {
  if (total === 0) return { key: 'none', title: '', text: '' };
  const ratio = correct / total;
  if (ratio >= PASS_RATIO) {
    return {
      key: 'pass',
      title: 'Well done',
      text: 'You know the ground rules. The guides below go further.',
    };
  }
  return {
    key: 'learn',
    title: 'Worth a read',
    text: 'A few of these are worth going over again — the explanations above cover each one.',
  };
}

export default function QuizBlock({ data = {}, background = 'surface' }) {
  const questions = useMemo(
    () =>
      (Array.isArray(data.questions) ? data.questions : []).filter(
        (question) =>
          question?.question && Array.isArray(question.options) && question.options.length > 0
      ),
    [data.questions]
  );

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  if (questions.length === 0) return null;

  const question = questions[Math.min(index, questions.length - 1)];
  const answerIndex = Number(question.answerIndex) || 0;
  const answered = picked !== null;
  const isLast = index === questions.length - 1;

  const pick = (at) => {
    if (answered) return;
    setPicked(at);
    if (at === answerIndex) setCorrect((current) => current + 1);
  };

  const next = () => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setIndex((current) => current + 1);
    setPicked(null);
  };

  const retake = () => {
    setIndex(0);
    setPicked(null);
    setCorrect(0);
    setFinished(false);
  };

  const band = scoreBand(correct, questions.length);

  return (
    <Section background={background} spacing="lg">
      <Container size="narrow">
        {data.title ? <SectionHeader title={data.title} subtitle={data.intro} /> : null}

        {finished ? (
          <div className={styles.quizResult}>
            <p className={styles.quizScore}>
              {correct} / {questions.length}
            </p>
            <h3 className={styles.quizBandTitle}>{band.title}</h3>
            <p className={styles.quizBandText}>{band.text}</p>
            <Button
              variant="outline"
              onClick={retake}
              icon={<Icon icon="mdi:refresh" width="18" height="18" />}
            >
              Retake
            </Button>
          </div>
        ) : (
          <div className={styles.quiz}>
            <div className={styles.progress}>
              <div
                className={styles.progressTrack}
                role="progressbar"
                aria-valuenow={index + 1}
                aria-valuemin={1}
                aria-valuemax={questions.length}
                aria-label="Quiz progress"
              >
                <div
                  className={styles.progressFill}
                  style={{ width: `${((index + 1) / questions.length) * 100}%` }}
                />
              </div>
              <p className={styles.progressText}>
                Question {index + 1} of {questions.length}
              </p>
            </div>

            <h3 className={styles.quizQuestion}>{question.question}</h3>

            <ul className={styles.quizOptions}>
              {question.options.map((option, at) => (
                <li key={`${option}-${at}`}>
                  <button
                    type="button"
                    className={[
                      styles.quizOption,
                      answered && at === answerIndex ? styles.quizRight : '',
                      answered && at === picked && at !== answerIndex ? styles.quizWrong : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-pressed={picked === at}
                    disabled={answered}
                    onClick={() => pick(at)}
                  >
                    <span className={styles.quizOptionText}>{option}</span>
                    {answered && at === answerIndex ? (
                      <Icon icon="mdi:check-circle-outline" width="20" height="20" aria-hidden />
                    ) : null}
                    {answered && at === picked && at !== answerIndex ? (
                      <Icon icon="mdi:close-circle-outline" width="20" height="20" aria-hidden />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>

            {answered ? (
              <div className={styles.quizExplanation} role="status">
                <p className={styles.quizVerdict}>
                  {picked === answerIndex ? 'Correct.' : 'Not quite.'}
                </p>
                {question.explanation ? <p>{question.explanation}</p> : null}
                <Button
                  onClick={next}
                  iconRight={<Icon icon="mdi:arrow-right" width="18" height="18" />}
                >
                  {isLast ? 'See the result' : 'Next question'}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </Container>
    </Section>
  );
}

QuizBlock.isEmpty = (data) =>
  !(Array.isArray(data?.questions) ? data.questions : []).some(
    (question) =>
      question?.question && Array.isArray(question.options) && question.options.length > 0
  );
