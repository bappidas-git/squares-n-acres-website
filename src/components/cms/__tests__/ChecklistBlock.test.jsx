/**
 * The checklist block (prompt 30).
 *
 * The behaviour worth asserting is the one the visitor relies on: a tick
 * survives leaving the page, it is kept per page rather than per site, and
 * "Reset" really clears it. The storage key is `sna_checklist:<pageSlug>`
 * (§4.2, D10).
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ChecklistBlock, { checklistStorageKey } from '../blocks/ChecklistBlock';
import renderWith from '../../../test-utils';

const DATA = {
  title: 'What the lender will ask for',
  intro: 'Originals seen, copies retained.',
  items: [
    { text: 'Identity and address proof', detail: 'For every applicant.' },
    { text: 'Income proof' },
    { text: 'Property papers' },
  ],
};

const PAGE = { slug: 'buyer-assistance/home-loan' };

const setup = (page = PAGE, data = DATA) => renderWith(<ChecklistBlock data={data} page={page} />);

beforeEach(() => {
  window.localStorage.clear();
});

describe('ChecklistBlock', () => {
  it('renders nothing when the block has no items', () => {
    const { container } = renderWith(
      <ChecklistBlock data={{ title: 'Empty', items: [] }} page={PAGE} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('opens with nothing ticked and a progress bar that says so', () => {
    setup();

    const progress = screen.getByRole('progressbar', {
      name: 'What the lender will ask for progress',
    });
    expect(progress).toHaveAttribute('aria-valuenow', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '3');
    expect(screen.getByText('0 of 3 done')).toBeInTheDocument();
  });

  it('counts a tick and writes it to this page’s own key', async () => {
    setup();

    await userEvent.click(screen.getByRole('checkbox', { name: /Identity and address proof/ }));

    expect(screen.getByText('1 of 3 done')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(checklistStorageKey(PAGE.slug)))).toEqual(['0']);
  });

  it('brings the ticks back when the page is opened again', () => {
    window.localStorage.setItem(checklistStorageKey(PAGE.slug), JSON.stringify(['0', '2']));

    setup();

    expect(screen.getByText('2 of 3 done')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Identity and address proof/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Income proof/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Property papers/ })).toBeChecked();
  });

  it('keeps one page’s progress out of another’s', () => {
    window.localStorage.setItem(checklistStorageKey('some-other-page'), JSON.stringify(['0', '1']));

    setup();

    expect(screen.getByText('0 of 3 done')).toBeInTheDocument();
  });

  it('unticks an item that is ticked', async () => {
    window.localStorage.setItem(checklistStorageKey(PAGE.slug), JSON.stringify(['1']));
    setup();

    await userEvent.click(screen.getByRole('checkbox', { name: /Income proof/ }));

    expect(screen.getByText('0 of 3 done')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(checklistStorageKey(PAGE.slug)))).toEqual([]);
  });

  it('clears everything on “Reset”, storage included', async () => {
    window.localStorage.setItem(checklistStorageKey(PAGE.slug), JSON.stringify(['0', '1', '2']));
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByText('0 of 3 done')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(checklistStorageKey(PAGE.slug)))).toEqual([]);
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
  });

  it('files a page with no slug under a key of its own rather than throwing', async () => {
    setup({});

    await userEvent.click(screen.getByRole('checkbox', { name: /Income proof/ }));
    expect(JSON.parse(window.localStorage.getItem('sna_checklist:page'))).toEqual(['1']);
  });
});
