import { screen } from '@testing-library/react';

import FaqsSection, { withTypeFaqs } from '../FaqsSection';
import renderWith from '../../../../test-utils';

/** The listing's own questions, then its type's from the FAQ library (QA-59). */
describe('withTypeFaqs', () => {
  const own = [
    { id: 2, question: 'Is parking included?', answer: '<p>Two covered bays.</p>', order: 2 },
    { id: 1, question: 'When is possession?', answer: '<p>March 2027.</p>', order: 1 },
  ];
  const library = [
    { id: 7, question: 'Do you charge the buyer a fee?', answer: '<p>No.</p>', order: 3 },
    { id: 9, question: 'when is  POSSESSION', answer: '<p>Asked by the listing.</p>', order: 4 },
  ];

  it('keeps the listing’s own first, in their order, and adds the type’s after them', () => {
    expect(withTypeFaqs(own, library).map((faq) => faq.question)).toEqual([
      'When is possession?',
      'Is parking included?',
      'Do you charge the buyer a fee?',
    ]);
  });

  it('gives a library question an id no listing question can hold', () => {
    const [, , fromLibrary] = withTypeFaqs(own, library);
    expect(fromLibrary.id).toBe('faq-7');
  });

  it('is the listing’s own list when the type has none', () => {
    expect(withTypeFaqs(own, []).map((faq) => faq.id)).toEqual([1, 2]);
    expect(withTypeFaqs(undefined, library).map((faq) => faq.id)).toEqual(['faq-7', 'faq-9']);
  });

  it('draws the section from the type’s questions alone', () => {
    renderWith(
      <FaqsSection property={{ title: 'Greenfield Axis', faqs: withTypeFaqs([], library) }} />
    );
    expect(screen.getByText('Do you charge the buyer a fee?')).toBeInTheDocument();
  });
});
