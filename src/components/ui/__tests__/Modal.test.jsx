import { useState } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ConfirmDialog from '../ConfirmDialog';
import Modal from '../Modal';
import renderWith from '../../../test-utils';

function Harness({ children: render }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {render({ open, close: () => setOpen(false) })}
    </>
  );
}

describe('Modal', () => {
  it('is labelled by its title and traps focus inside the dialog', async () => {
    renderWith(
      <Modal open onClose={jest.fn()} title="Download brochure">
        <button type="button">Inside</button>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Download brochure');

    const close = screen.getByRole('button', { name: 'Close' });
    const inside = screen.getByRole('button', { name: 'Inside' });

    // Tabbing walks the dialog's own controls and wraps back to the first one
    // instead of escaping to the page behind the backdrop.
    await userEvent.tab();
    expect(close).toHaveFocus();
    await userEvent.tab();
    expect(inside).toHaveFocus();
    await userEvent.tab();
    await waitFor(() => expect(close).toHaveFocus());
  });

  it('closes on Escape and on the close button', async () => {
    const onClose = jest.fn();
    renderWith(
      <Modal open onClose={onClose} title="Filters">
        <p>Body</p>
      </Modal>
    );

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('does not close on Escape when it is not dismissible', async () => {
    const onClose = jest.fn();
    renderWith(
      <Modal open onClose={onClose} title="Saving" dismissible={false} showClose={false}>
        <p>Working</p>
      </Modal>
    );

    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('returns focus to the trigger after closing', async () => {
    renderWith(
      <Harness>
        {({ open, close }) => (
          <Modal open={open} onClose={close} title="Sheet">
            <p>Body</p>
          </Modal>
        )}
      </Harness>
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(trigger);
    await screen.findByRole('dialog');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

describe('ConfirmDialog', () => {
  it('renders cancel and confirm, and calls onConfirm', async () => {
    const onConfirm = jest.fn();
    renderWith(
      <ConfirmDialog
        open
        onClose={jest.fn()}
        onConfirm={onConfirm}
        title="Delete property"
        message="Lakeview Heights will be removed."
        confirmLabel="Delete"
        danger
      />
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('variant="alert" renders a single OK button that closes it', async () => {
    const onClose = jest.fn();
    renderWith(
      <ConfirmDialog
        open
        variant="alert"
        onClose={onClose}
        title="Brochure sent"
        message="Check your inbox."
      />
    );

    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onClose).toHaveBeenCalled();
  });
});
