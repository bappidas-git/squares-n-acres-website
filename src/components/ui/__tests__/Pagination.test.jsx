import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Pagination from '../Pagination';
import renderWith from '../../../test-utils';

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = renderWith(<Pagination page={1} totalPages={1} onChange={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('marks the current page and reports it to assistive tech', () => {
    renderWith(<Pagination page={3} totalPages={5} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = renderWith(<Pagination page={1} totalPages={4} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();

    rerender(<Pagination page={4} totalPages={4} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('reports the page the visitor picked', async () => {
    const onChange = jest.fn();
    renderWith(<Pagination page={2} totalPages={6} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(onChange).toHaveBeenCalledWith(3);

    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('collapses long ranges with ellipses', () => {
    renderWith(<Pagination page={10} totalPages={20} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 20' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Page 5' })).not.toBeInTheDocument();
  });
});
