/**
 * The lead list's dialogs (prompt 29, QA-53).
 *
 * One lead's status, priority or owner is confirmable only once it has been
 * changed — confirming the value it already had used to send a PATCH that
 * changed nothing and a toast that said it had. "Lost" asks why for a batch as
 * it does for one lead, within the length the API stores.
 */

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AssignDialog from '../AssignDialog';
import LostReasonDialog, { MAX_REASON_LENGTH } from '../LostReasonDialog';
import renderWith from '../../../../test-utils';
import { LeadPriorityDialog, LeadStatusDialog } from '../LeadStatusMenu';

const USERS = [
  { id: 2, name: 'Manager User', role: 'manager' },
  { id: 3, name: 'Sales User', role: 'sales' },
];

describe('LeadStatusDialog', () => {
  it('waits for a different status before one lead can be confirmed', async () => {
    const onConfirm = jest.fn();
    renderWith(
      <LeadStatusDialog
        open
        title="Change status"
        initialStatus="contacted"
        requireChange
        onConfirm={onConfirm}
        onClose={() => {}}
      />
    );

    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Change status' });
    expect(confirm).toBeDisabled();

    await userEvent.selectOptions(within(dialog).getByLabelText('Status'), 'qualified');
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('qualified');
  });

  it('lets the bulk bar confirm whatever is chosen', async () => {
    renderWith(
      <LeadStatusDialog open title="Change status" onConfirm={() => {}} onClose={() => {}} />
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Change status' })).toBeEnabled();
  });
});

describe('LeadPriorityDialog', () => {
  it('starts on the lead’s own priority', async () => {
    renderWith(
      <LeadPriorityDialog
        open
        title="Set the priority"
        initialPriority="high"
        requireChange
        onConfirm={() => {}}
        onClose={() => {}}
      />
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Priority')).toHaveValue('high');
    expect(within(dialog).getByRole('button', { name: 'Set priority' })).toBeDisabled();
  });
});

describe('AssignDialog', () => {
  it('names each colleague with their role as the users screen says it', async () => {
    renderWith(
      <AssignDialog open title="Assign" users={USERS} onConfirm={() => {}} onClose={() => {}} />
    );

    const select = within(await screen.findByRole('dialog')).getByLabelText('Assign to');
    expect(within(select).getByRole('option', { name: 'Sales User (Sales)' })).toBeInTheDocument();
    expect(
      within(select).getByRole('option', { name: 'Manager User (Manager)' })
    ).toBeInTheDocument();
  });

  it('shows an owner the directory no longer lists, marked inactive', async () => {
    renderWith(
      <AssignDialog
        open
        title="Assign"
        users={USERS}
        value={9}
        current={{ id: 9, name: 'Former Sales' }}
        requireChange
        onConfirm={() => {}}
        onClose={() => {}}
      />
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Assign to')).toHaveValue('9');
    expect(within(dialog).getByRole('option', { name: 'Former Sales (inactive)' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Assign' })).toBeDisabled();
  });

  it('hands back an id, or null for "Unassigned"', async () => {
    const onConfirm = jest.fn();
    renderWith(
      <AssignDialog
        open
        title="Assign"
        users={USERS}
        value={3}
        requireChange
        onConfirm={onConfirm}
        onClose={() => {}}
      />
    );

    const dialog = await screen.findByRole('dialog');
    await userEvent.selectOptions(within(dialog).getByLabelText('Assign to'), '');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Assign' }));
    expect(onConfirm).toHaveBeenCalledWith(null);
  });
});

describe('LostReasonDialog', () => {
  it('asks for a reason of three characters or more', async () => {
    const onConfirm = jest.fn();
    renderWith(
      <LostReasonDialog open name="Ananya Rao" onConfirm={onConfirm} onClose={() => {}} />
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('“Ananya Rao” leaves the pipeline here.');

    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'ab');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as lost' }));
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'c ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as lost' }));
    expect(onConfirm).toHaveBeenCalledWith('abc');
  });

  it('speaks to a batch from the bulk bar', async () => {
    renderWith(<LostReasonDialog open count={3} onConfirm={() => {}} onClose={() => {}} />);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Mark the selected leads as lost?');
    expect(dialog).toHaveTextContent('3 leads leave the pipeline here.');
  });

  it('stops at the length the API stores', async () => {
    renderWith(<LostReasonDialog open name="Ananya Rao" onConfirm={() => {}} onClose={() => {}} />);

    const box = within(await screen.findByRole('dialog')).getByLabelText(/Reason/);
    expect(box).toHaveAttribute('maxLength', String(MAX_REASON_LENGTH));
    expect(MAX_REASON_LENGTH).toBe(300);
  });
});
