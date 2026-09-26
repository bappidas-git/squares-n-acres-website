/**
 * The rail's SEO card: the score, the first failing test, and the one button
 * that goes there — handing the host the failing test's field **and** its
 * message, so the host can say which test it opened on (prompt 51).
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SeoSummaryCard, { firstFailure } from '../SeoSummaryCard';
import renderWith from '../../../../test-utils';

const FAILING = {
  score: 42,
  scoreBand: 'poor',
  testsPassed: 12,
  testsTotal: 32,
  analysis: {
    basic: [
      { id: 'keyword-set', status: 'pass', message: 'A focus keyword is set.' },
      {
        id: 'keyword-in-title',
        status: 'fail',
        message: 'The title does not carry the focus keyword.',
        field: 'seo.title',
      },
    ],
    additional: [{ id: 'images', status: 'fail', message: 'No images.', field: 'images' }],
  },
};

const PASSING = {
  score: 88,
  scoreBand: 'good',
  testsPassed: 30,
  testsTotal: 32,
  analysis: { basic: [{ id: 'keyword-set', status: 'pass', message: 'A focus keyword is set.' }] },
};

describe('firstFailure', () => {
  it('is the first failing test in the order the panel lists them', () => {
    expect(firstFailure(FAILING.analysis)).toMatchObject({ field: 'seo.title' });
    expect(firstFailure(PASSING.analysis)).toBeNull();
  });
});

describe('SeoSummaryCard', () => {
  it('hands "Fix SEO" the failing test’s field and message', async () => {
    const onOpen = jest.fn();
    renderWith(<SeoSummaryCard seo={FAILING} onOpen={onOpen} />);

    await userEvent.click(screen.getByRole('button', { name: 'Fix SEO' }));

    expect(onOpen).toHaveBeenCalledWith({
      field: 'seo.title',
      message: 'The title does not carry the focus keyword.',
    });
  });

  it('opens the tab with null while nothing is failing', async () => {
    const onOpen = jest.fn();
    renderWith(<SeoSummaryCard seo={PASSING} onOpen={onOpen} />);

    await userEvent.click(screen.getByRole('button', { name: 'Open the SEO tab' }));

    expect(onOpen).toHaveBeenCalledWith(null);
  });

  it('hands a field of null when the failing test names none', async () => {
    const onOpen = jest.fn();
    const seo = {
      ...FAILING,
      analysis: { basic: [{ id: 'x', status: 'fail', message: 'Something is off.' }] },
    };
    renderWith(<SeoSummaryCard seo={seo} onOpen={onOpen} />);

    await userEvent.click(screen.getByRole('button', { name: 'Fix SEO' }));

    expect(onOpen).toHaveBeenCalledWith({ field: null, message: 'Something is off.' });
  });

  it('offers no button without a host to open', () => {
    renderWith(<SeoSummaryCard seo={FAILING} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('The title does not carry the focus keyword.')).toBeInTheDocument();
  });
});
