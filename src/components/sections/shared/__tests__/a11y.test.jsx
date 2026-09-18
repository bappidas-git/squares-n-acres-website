/**
 * The accessibility contract of the FAQ accordion — the disclosure pattern the
 * public site reuses on five pages (prompt 42 §4.5).
 */

import { fireEvent, screen } from '@testing-library/react';

import FaqAccordion from '../FaqAccordion';
import renderWith from '../../../../test-utils';
import { expectNamedControls, expectNoDuplicateIds } from '../../../../test-utils/a11y';

const ITEMS = [
  {
    id: 1,
    question: 'How do I check whether a project is RERA registered?',
    answer: '<p>Search the K-RERA portal for the promoter and the project number.</p>',
  },
  {
    id: 2,
    question: 'What is khata and why does it matter?',
    answer: '<p>It is the municipal record of ownership for tax purposes.</p>',
  },
];

describe('FaqAccordion', () => {
  it('names every trigger, states whether it is open, and repeats no id', () => {
    const { container } = renderWith(<FaqAccordion items={ITEMS} />);

    const triggers = screen.getAllByRole('button');
    expect(triggers).toHaveLength(2);
    triggers.forEach((trigger) => {
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-controls');
    });

    expectNamedControls(container);
    expectNoDuplicateIds(container);
  });

  it('labels the answer by the question that opened it', () => {
    renderWith(<FaqAccordion items={ITEMS} />);

    fireEvent.click(screen.getByRole('button', { name: /RERA registered/i }));

    expect(screen.getByRole('region')).toHaveAccessibleName(
      'How do I check whether a project is RERA registered?'
    );
  });

  it('keeps two accordions on one page from sharing ids', () => {
    const { container } = renderWith(
      <>
        <FaqAccordion items={ITEMS} />
        <FaqAccordion items={ITEMS} />
      </>
    );

    expectNoDuplicateIds(container);
  });
});
