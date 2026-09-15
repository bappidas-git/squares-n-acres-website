import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Button from '../Button';
import renderWith from '../../../test-utils';

describe('Button', () => {
  it('renders a button by default and calls onClick', async () => {
    const onClick = jest.fn();
    renderWith(<Button onClick={onClick}>Enquire now</Button>);

    const button = screen.getByRole('button', { name: 'Enquire now' });
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders an anchor when href is given', () => {
    renderWith(<Button href="https://example.com">Open</Button>);
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      'https://example.com'
    );
  });

  it('renders a router link when to is given', () => {
    renderWith(<Button to="/properties">Browse</Button>);
    expect(screen.getByRole('link', { name: 'Browse' })).toHaveAttribute('href', '/properties');
  });

  it('marks itself busy and blocks clicks while loading', async () => {
    const onClick = jest.fn();
    renderWith(
      <Button loading onClick={onClick}>
        Saving
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Saving' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not navigate when a link is disabled', () => {
    renderWith(
      <Button to="/properties" disabled>
        Browse
      </Button>
    );
    const element = screen.getByRole('link', { name: 'Browse' });
    expect(element).toHaveAttribute('aria-disabled', 'true');
    expect(element).not.toHaveAttribute('href');
  });
});
