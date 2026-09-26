/**
 * "Log activity" (prompt 51): one form for what happened and what happens
 * next — the conversation, a new status, and the next follow-up, with the three
 * presets a desk uses a press away.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LogActivityPanel from '../LogActivityPanel';
import renderWith from '../../../../test-utils';
import { followUpPresets, istDateOf, istInstant } from '../followUpPresets';

const LEAD = { id: 7, name: 'Ananya Rao', status: 'new' };

const mount = (props = {}) => {
  const onLog = jest.fn(() => Promise.resolve(true));
  const view = renderWith(<LogActivityPanel lead={LEAD} onLog={onLog} {...props} />);
  return { onLog, ...view };
};

describe('LogActivityPanel', () => {
  it('logs a call with how it went, a new status and a preset follow-up', async () => {
    const { onLog } = mount();

    await userEvent.type(screen.getByLabelText('How it went'), 'Wants a Saturday visit');
    await userEvent.type(screen.getByLabelText('Note'), 'Wife joins.');
    await userEvent.selectOptions(screen.getByLabelText('Status now'), 'contacted');
    await userEvent.click(screen.getByRole('button', { name: /^Tomorrow 11:00/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Log call' }));

    // Logged: the form is ready for the next one.
    await waitFor(() => expect(screen.getByLabelText('How it went')).toHaveValue(''));
    expect(screen.getByLabelText('Status now')).toHaveValue('');
    const [entry, changes] = onLog.mock.calls[0];
    expect(entry).toEqual({ type: 'call', outcome: 'Wants a Saturday visit', note: 'Wife joins.' });
    expect(changes).toEqual({
      status: 'contacted',
      followUpAt: followUpPresets()[0].at,
    });
  });

  it('sends no change when the status is kept and no follow-up is set', async () => {
    const { onLog } = mount();

    await userEvent.click(screen.getByRole('radio', { name: /Meeting/ }));
    await userEvent.type(screen.getByLabelText('Note'), 'Met at the site office.');
    await userEvent.click(screen.getByRole('button', { name: 'Log meeting' }));

    await waitFor(() => expect(screen.getByLabelText('Note')).toHaveValue(''));
    expect(onLog).toHaveBeenCalledWith(
      { type: 'meeting', outcome: null, note: 'Met at the site office.' },
      null
    );
  });

  it('asks why before logging a lead as lost', async () => {
    const { onLog } = mount();

    await userEvent.selectOptions(screen.getByLabelText('Status now'), 'lost');
    await userEvent.click(screen.getByRole('button', { name: 'Log call' }));
    expect(await screen.findByText(/Say why the lead was lost/)).toBeInTheDocument();
    expect(onLog).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText(/Why it was lost/), 'Bought elsewhere');
    await userEvent.click(screen.getByRole('button', { name: 'Log call' }));
    await waitFor(() => expect(screen.queryByLabelText(/Why it was lost/)).not.toBeInTheDocument());
    expect(onLog.mock.calls[0][1]).toEqual({ status: 'lost', lostReason: 'Bought elsewhere' });
  });

  it('is readied by a press on WhatsApp without taking the focus', () => {
    const { rerender } = mount();
    // Somewhere the reader already is: the prefill must leave it there.
    screen.getByLabelText('Note').focus();

    rerender(
      <LogActivityPanel lead={LEAD} onLog={jest.fn()} prefill={{ type: 'whatsapp', nonce: 1 }} />
    );

    expect(screen.getByRole('radio', { name: /WhatsApp/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Log WhatsApp' })).toBeInTheDocument();
    expect(screen.getByLabelText('Note')).toHaveFocus();
  });
});

describe('followUpPresets', () => {
  it('lands on IST days at 11:00, and Saturday is always a later one', () => {
    // Saturday 26 Sep 2026, 15:00 IST.
    const saturday = Date.parse('2026-09-26T09:30:00.000Z');
    const [tomorrow, threeDays, nextSaturday] = followUpPresets(saturday);

    expect(tomorrow.at).toBe(istInstant('2026-09-27', '11:00'));
    expect(threeDays.at).toBe(istInstant('2026-09-29', '11:00'));
    expect(nextSaturday.at).toBe(istInstant('2026-10-03', '11:00'));
    expect(istDateOf(tomorrow.at)).toBe('2026-09-27');

    // Late on a Friday in IST, which is still Friday in UTC.
    const friday = Date.parse('2026-09-25T17:00:00.000Z');
    expect(followUpPresets(friday)[2].at).toBe(istInstant('2026-09-26', '11:00'));
  });
});
