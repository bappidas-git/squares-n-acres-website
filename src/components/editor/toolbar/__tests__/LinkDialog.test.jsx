/**
 * The editor's link dialog (prompt 51): "Save link" with an empty address or
 * empty words returned in silence. Each box now says what it is missing, and
 * the button is off until both are right.
 */

import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LinkDialog from '../LinkDialog';
import renderWith from '../../../../test-utils';

const open = (value = {}, onSubmit = jest.fn()) => {
  renderWith(
    <LinkDialog
      open
      value={{ href: '', text: '', newTab: false, noFollow: false, hasSelection: false, ...value }}
      onSubmit={onSubmit}
      onClose={jest.fn()}
    />
  );
  return onSubmit;
};

const save = () => screen.getByRole('button', { name: 'Save link' });

describe('LinkDialog', () => {
  it('keeps Save link off until the address and the words are there', async () => {
    const onSubmit = open();
    expect(save()).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Address/), '/localities/whitefield');
    expect(save()).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/^Text/), 'Whitefield guide');
    expect(save()).toBeEnabled();

    await userEvent.click(save());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ href: '/localities/whitefield', text: 'Whitefield guide' })
    );
  });

  it('says what each box is missing once it has been left', () => {
    open();

    fireEvent.blur(screen.getByLabelText(/Address/));
    fireEvent.blur(screen.getByLabelText(/^Text/));

    expect(screen.getByText('Enter the address the link goes to.')).toBeInTheDocument();
    expect(screen.getByText('Enter the words the link shows.')).toBeInTheDocument();
  });

  it('says an address is malformed', () => {
    open({ href: 'not a link' });
    fireEvent.blur(screen.getByLabelText(/Address/));
    expect(
      screen.getByText('Use https://…, mailto:…, tel:… or a path starting with /.')
    ).toBeInTheDocument();
  });

  it('asks no words of a link over selected text', () => {
    open({ href: 'https://example.com', hasSelection: true });
    expect(screen.queryByLabelText(/^Text/)).not.toBeInTheDocument();
    expect(save()).toBeEnabled();
  });
});
