/**
 * The quiz block (prompt 30).
 *
 * What is worth asserting is the behaviour a visitor meets: one question at a
 * time, the explanation the moment an answer is picked — right or wrong,
 * because the explanation is the content — a score at the end, and a retake
 * that really starts over. Nothing is persisted, so there is nothing to clear
 * between these cases.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import QuizBlock, { scoreBand } from '../blocks/QuizBlock';
import renderWith from '../../../test-utils';

const QUESTIONS = [
  {
    question: 'What does a khata prove?',
    options: ['Ownership', 'Tax liability', 'Plan approval', 'No encumbrance'],
    answerIndex: 1,
    explanation: 'A khata is a municipal record of tax liability.',
  },
  {
    question: 'What is an encumbrance certificate?',
    options: ['A tax receipt', 'A record of charges', 'A floor plan', 'A sale deed'],
    answerIndex: 1,
    explanation: 'It lists the transactions registered against a property.',
  },
];

const setup = (data = {}) =>
  renderWith(<QuizBlock data={{ title: 'Test yourself', questions: QUESTIONS, ...data }} />);

describe('QuizBlock', () => {
  it('renders nothing when the block has no questions', () => {
    const { container } = renderWith(
      <QuizBlock data={{ title: 'Test yourself', questions: [] }} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows one question at a time, with its progress', () => {
    setup();

    expect(screen.getByText('What does a khata prove?')).toBeInTheDocument();
    expect(screen.queryByText('What is an encumbrance certificate?')).not.toBeInTheDocument();

    const progress = screen.getByRole('progressbar', { name: 'Quiz progress' });
    expect(progress).toHaveAttribute('aria-valuenow', '1');
    expect(progress).toHaveAttribute('aria-valuemax', '2');
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
  });

  it('explains a right answer and moves on', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: /Tax liability/ }));

    expect(screen.getByText('Correct.')).toBeInTheDocument();
    expect(screen.getByText(/municipal record of tax liability/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Next question/ }));
    expect(screen.getByText('What is an encumbrance certificate?')).toBeInTheDocument();
  });

  it('explains a wrong answer too, and does not count it', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: /Ownership/ }));
    expect(screen.getByText('Not quite.')).toBeInTheDocument();
    expect(screen.getByText(/municipal record of tax liability/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Next question/ }));
    await userEvent.click(screen.getByRole('button', { name: /A floor plan/ }));
    await userEvent.click(screen.getByRole('button', { name: /See the result/ }));

    expect(screen.getByText('0 / 2')).toBeInTheDocument();
    expect(screen.getByText('Worth a read')).toBeInTheDocument();
  });

  it('refuses a second answer to the same question', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: /Tax liability/ }));
    const other = screen.getByRole('button', { name: /Ownership/ });
    expect(other).toBeDisabled();

    await userEvent.click(other);
    expect(screen.getByText('Correct.')).toBeInTheDocument();
  });

  it('scores the run and congratulates a good one', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: /Tax liability/ }));
    await userEvent.click(screen.getByRole('button', { name: /Next question/ }));
    await userEvent.click(screen.getByRole('button', { name: /A record of charges/ }));
    await userEvent.click(screen.getByRole('button', { name: /See the result/ }));

    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByText('Well done')).toBeInTheDocument();
  });

  it('starts over on “Retake”', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: /Ownership/ }));
    await userEvent.click(screen.getByRole('button', { name: /Next question/ }));
    await userEvent.click(screen.getByRole('button', { name: /A floor plan/ }));
    await userEvent.click(screen.getByRole('button', { name: /See the result/ }));
    await userEvent.click(screen.getByRole('button', { name: /Retake/ }));

    expect(screen.getByText('What does a khata prove?')).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
    expect(screen.queryByText('Not quite.')).not.toBeInTheDocument();
  });

  describe('scoreBand', () => {
    it('passes at 60 % and above', () => {
      expect(scoreBand(3, 5).key).toBe('pass');
      expect(scoreBand(5, 5).key).toBe('pass');
    });

    it('does not pass below it', () => {
      expect(scoreBand(2, 5).key).toBe('learn');
      expect(scoreBand(0, 5).key).toBe('learn');
    });

    it('says nothing about a quiz with no questions', () => {
      expect(scoreBand(0, 0).key).toBe('none');
    });
  });
});
