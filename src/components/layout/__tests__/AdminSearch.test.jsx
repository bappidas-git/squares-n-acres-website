import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import AdminSearch, { phoneQuery } from '../AdminSearch';
import articleService from '../../../services/articleService';
import leadService from '../../../services/leadService';
import propertyService from '../../../services/propertyService';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';

jest.mock('../../../services/leadService');
jest.mock('../../../services/propertyService');
jest.mock('../../../services/articleService');
jest.mock('../../../contexts/AdminAuthContext', () => ({
  __esModule: true,
  useAdminAuth: jest.fn(),
}));

const envelope = (data, total = data.length) => ({
  data,
  meta: { page: 1, perPage: 5, total, totalPages: 1 },
});

const LEAD = { id: 12, name: 'Ravi Kumar', phone: '9876500100', status: 'new', property: null };
const LISTING = {
  id: 4,
  title: 'Aurelia Court',
  isActive: true,
  location: { locality: { name: 'Hebbal' } },
};
const ARTICLE = { id: 9, title: 'Khata transfer, explained', status: 'published' };

function Where() {
  const location = useLocation();
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>;
}

const renderSearch = () =>
  render(
    <MemoryRouter initialEntries={['/admin/dashboard']}>
      <AdminSearch />
      <label>
        Notes
        <input />
      </label>
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

const box = () => screen.getByRole('combobox', { name: 'Search leads, properties and articles' });

beforeEach(() => {
  useAdminAuth.mockReturnValue({ can: () => true });
  leadService.adminList.mockResolvedValue(envelope([LEAD], 3));
  propertyService.adminList.mockResolvedValue(envelope([LISTING]));
  articleService.adminList.mockResolvedValue(envelope([ARTICLE]));
});

describe('AdminSearch (prompt 51)', () => {
  it('is reached with "/" from anywhere but a field', async () => {
    renderSearch();

    fireEvent.keyDown(document.body, { key: '/' });
    await waitFor(() => expect(box()).toHaveFocus());

    const notes = screen.getByLabelText('Notes');
    notes.focus();
    fireEvent.keyDown(notes, { key: '/' });
    expect(notes).toHaveFocus();
  });

  it('looks in the three lists at once, five of each, and groups what it finds', async () => {
    renderSearch();
    await userEvent.type(box(), 'aur');

    await screen.findByRole('option', { name: /Ravi Kumar/ });
    const results = screen.getByRole('listbox', { name: 'Search results' });
    expect(within(results).getByRole('group', { name: 'Leads' })).toBeInTheDocument();
    expect(within(results).getByRole('option', { name: /Aurelia Court/ })).toBeInTheDocument();
    expect(within(results).getByRole('option', { name: /Khata transfer/ })).toBeInTheDocument();
    expect(within(results).getByRole('option', { name: 'See all 3 leads' })).toBeInTheDocument();

    expect(leadService.adminList).toHaveBeenCalledWith(
      { q: 'aur', perPage: 5 },
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(propertyService.adminList).toHaveBeenCalledWith(
      { q: 'aur', perPage: 5 },
      expect.anything()
    );
    expect(articleService.adminList).toHaveBeenCalledWith(
      { q: 'aur', perPage: 5 },
      expect.anything()
    );
  });

  it('walks the results with the arrows and opens one with Enter', async () => {
    renderSearch();
    await userEvent.type(box(), 'aur');
    await screen.findByRole('option', { name: /Aurelia Court/ });

    // Ravi Kumar, "See all 3 leads", Aurelia Court.
    fireEvent.keyDown(box(), { key: 'ArrowDown' });
    fireEvent.keyDown(box(), { key: 'ArrowDown' });
    fireEvent.keyDown(box(), { key: 'ArrowDown' });
    expect(box()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: /Aurelia Court/ }).id
    );
    fireEvent.keyDown(box(), { key: 'Enter' });

    expect(screen.getByTestId('where')).toHaveTextContent('/admin/properties/edit/4');
    expect(box()).toHaveValue('');
  });

  it('opens a list pre-filtered from its "See all"', async () => {
    renderSearch();
    await userEvent.type(box(), 'khata');

    // One match reads in the singular and names the list it opens.
    await userEvent.click(await screen.findByRole('option', { name: 'See 1 article in Articles' }));

    expect(screen.getByTestId('where')).toHaveTextContent('/admin/articles?q=khata');
  });

  it('finds a lead by a telephone number however it was typed', async () => {
    renderSearch();
    await userEvent.type(box(), '+91 98765 00100');

    await screen.findByRole('option', { name: /Ravi Kumar/ });
    expect(leadService.adminList).toHaveBeenLastCalledWith(
      { q: '9876500100', perPage: 5 },
      expect.anything()
    );
    expect(phoneQuery('98765-001')).toBe('98765001');
    expect(phoneQuery('Ravi')).toBe('Ravi');
  });

  it('searches only the lists the user may see', async () => {
    useAdminAuth.mockReturnValue({ can: (area) => area !== 'articles' });
    renderSearch();
    await userEvent.type(box(), 'aur');

    await screen.findByRole('option', { name: /Aurelia Court/ });
    expect(articleService.adminList).not.toHaveBeenCalled();
  });

  it('says when nothing matches', async () => {
    leadService.adminList.mockResolvedValue(envelope([]));
    propertyService.adminList.mockResolvedValue(envelope([]));
    articleService.adminList.mockResolvedValue(envelope([]));
    renderSearch();
    await userEvent.type(box(), 'zzz');

    expect(await screen.findByText('Nothing matches “zzz”.')).toBeInTheDocument();
  });
});
