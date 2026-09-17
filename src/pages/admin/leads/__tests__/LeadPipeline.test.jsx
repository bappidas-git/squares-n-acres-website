/**
 * The lead pipeline (prompt 29).
 *
 * The funnel is six rungs and "Lost" is not one of them, so the two things
 * worth asserting are the shape — every status of §6.17 except `lost`, in
 * order, with the current one marked — and the two ways a status changes:
 * forward immediately, backwards only after saying yes.
 */

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LeadPipeline from '../LeadPipeline';
import renderWith from '../../../../test-utils';

const FUNNEL = ['New', 'Contacted', 'Qualified', 'Site Visit', 'Negotiation', 'Converted'];

const setup = (props = {}) => {
  const onChange = jest.fn();
  const onLost = jest.fn();
  renderWith(<LeadPipeline status="qualified" onChange={onChange} onLost={onLost} {...props} />);
  return { onChange, onLost };
};

describe('LeadPipeline', () => {
  it('renders the funnel of §6.17 in order, and never “Lost” as a step', () => {
    setup();

    const steps = within(screen.getByRole('list', { name: 'Lead pipeline' })).getAllByRole(
      'listitem'
    );
    expect(steps).toHaveLength(FUNNEL.length);
    FUNNEL.forEach((label, index) => {
      expect(steps[index]).toHaveTextContent(label);
    });
    expect(screen.queryByRole('button', { name: /^Move to Lost$/ })).not.toBeInTheDocument();
  });

  it('marks where the lead stands', () => {
    setup({ status: 'site-visit' });

    expect(
      screen.getByRole('button', { name: 'Site Visit — the current stage' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move to Negotiation' })).toBeInTheDocument();
  });

  it('moves forward without asking', async () => {
    const { onChange } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Move to Negotiation' }));

    expect(onChange).toHaveBeenCalledWith('negotiation');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks before moving a lead backwards', async () => {
    const { onChange } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Move to Contacted' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Qualified');
    expect(dialog).toHaveTextContent('Contacted');
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Move it' }));
    expect(onChange).toHaveBeenCalledWith('contacted');
  });

  it('keeps the lead where it is when the confirmation is declined', async () => {
    const { onChange } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Move to New' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('hands “Mark as lost” to the caller, which asks for a reason', async () => {
    const { onChange, onLost } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Mark as lost' }));

    expect(onLost).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows a lost lead as outside the funnel, with its reason', () => {
    setup({ status: 'lost', lostReason: 'Bought elsewhere' });

    expect(screen.getByText('Lost')).toBeInTheDocument();
    expect(screen.getByText('Bought elsewhere')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as lost' })).not.toBeInTheDocument();
  });

  it('asks before reopening a lost lead', async () => {
    const { onChange } = setup({ status: 'lost' });

    await userEvent.click(screen.getByRole('button', { name: 'Move to Contacted' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
