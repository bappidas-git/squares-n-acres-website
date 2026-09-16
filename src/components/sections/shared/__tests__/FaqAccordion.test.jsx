import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FaqAccordion from '../FaqAccordion';
import renderWith from '../../../../test-utils';

/** Three §6.9 FAQs, trimmed to what the accordion reads. */
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
  {
    id: 3,
    question: 'Can an NRI buy residential property in India?',
    answer: '<p>Yes, apart from agricultural land, plantations and farmhouses.</p>',
  },
];

describe('FaqAccordion', () => {
  it('renders one trigger per question, all closed', () => {
    renderWith(<FaqAccordion items={ITEMS} />);

    const triggers = screen.getAllByRole('button');
    expect(triggers).toHaveLength(3);
    triggers.forEach((trigger) => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('makes each question a heading at the requested level', () => {
    renderWith(<FaqAccordion items={ITEMS} headingLevel={2} />);

    expect(screen.getByRole('heading', { level: 2, name: /khata/ })).toBeInTheDocument();
  });

  it('opens the answer and points the trigger at the panel that holds it', async () => {
    renderWith(<FaqAccordion items={ITEMS} />);

    const trigger = screen.getByRole('button', { name: /RERA registered/ });
    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const panel = screen.getByRole('region');
    expect(panel).toHaveAttribute('id', trigger.getAttribute('aria-controls'));
    expect(panel).toHaveAttribute('aria-labelledby', trigger.getAttribute('id'));
    expect(within(panel).getByText(/K-RERA portal/)).toBeInTheDocument();
  });

  it('closes the open answer when another one is opened', async () => {
    renderWith(<FaqAccordion items={ITEMS} />);

    await userEvent.click(screen.getByRole('button', { name: /RERA registered/ }));
    await userEvent.click(screen.getByRole('button', { name: /khata/ }));

    expect(screen.getByRole('button', { name: /RERA registered/ })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.getByRole('button', { name: /khata/ })).toHaveAttribute('aria-expanded', 'true');
    // The panel that closed leaves the document once its collapse is over.
    await waitFor(() => expect(screen.getAllByRole('region')).toHaveLength(1));
  });

  it('keeps several open at once when it is not a single-open list', async () => {
    renderWith(<FaqAccordion items={ITEMS} single={false} />);

    await userEvent.click(screen.getByRole('button', { name: /RERA registered/ }));
    await userEvent.click(screen.getByRole('button', { name: /khata/ }));

    expect(screen.getAllByRole('region')).toHaveLength(2);
  });

  it('opens the answer a caller asks for at mount', () => {
    renderWith(<FaqAccordion items={ITEMS} defaultOpenId={2} />);

    expect(screen.getByRole('button', { name: /khata/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('is operable from the keyboard alone', async () => {
    renderWith(<FaqAccordion items={ITEMS} />);

    await userEvent.tab();
    const first = screen.getByRole('button', { name: /RERA registered/ });
    expect(first).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(first).toHaveAttribute('aria-expanded', 'true');

    await userEvent.keyboard(' ');
    expect(first).toHaveAttribute('aria-expanded', 'false');
  });

  it('reports every toggle to the caller', async () => {
    const onToggle = jest.fn();
    renderWith(<FaqAccordion items={ITEMS} onToggle={onToggle} />);

    await userEvent.click(screen.getByRole('button', { name: /khata/ }));
    expect(onToggle).toHaveBeenCalledWith(2, true);

    await userEvent.click(screen.getByRole('button', { name: /khata/ }));
    expect(onToggle).toHaveBeenCalledWith(2, false);
  });

  describe('search highlighting', () => {
    /** Everything the accordion has marked, however it is spelt. */
    const marks = () => screen.queryAllByText(/\S/, { selector: 'mark' });

    it('wraps every match in the question', () => {
      renderWith(<FaqAccordion items={ITEMS} highlight="rera" />);

      expect(marks()).toHaveLength(1);
      expect(marks()[0]).toHaveTextContent('RERA');
      // The question still reads as one sentence around the mark.
      expect(
        screen.getByRole('button', { name: 'How do I check whether a project is RERA registered?' })
      ).toBeInTheDocument();
    });

    it('leaves the answer alone — that HTML is not the search box’s to edit', async () => {
      renderWith(<FaqAccordion items={ITEMS} highlight="portal" />);

      await userEvent.click(screen.getByRole('button', { name: /RERA registered/ }));
      expect(screen.getByText(/K-RERA portal/)).toBeInTheDocument();
      expect(marks()).toHaveLength(0);
    });

    it('ignores a term too short to mean anything', () => {
      renderWith(<FaqAccordion items={ITEMS} highlight="a" />);

      expect(marks()).toHaveLength(0);
    });
  });

  it('renders the empty state it is given instead of an empty list', () => {
    renderWith(<FaqAccordion items={[]} emptyState={<p>No questions match</p>} />);

    expect(screen.getByText('No questions match')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
