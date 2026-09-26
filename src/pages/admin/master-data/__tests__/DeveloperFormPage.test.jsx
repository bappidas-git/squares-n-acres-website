/**
 * Admin → Master data → Developers → add / edit (QA-60).
 *
 * The form shares its save with the locality form (`useRecordPage`); what is
 * asserted here is the developer's own part and that it is wired to it.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation, useNavigationType } from 'react-router-dom';

import DeveloperFormPage from '../DeveloperFormPage';
import masterDataService from '../../../../services/masterDataService';
import redirectService from '../../../../services/redirectService';
import renderWith from '../../../../test-utils';

jest.mock('../../../../services/redirectService');
jest.mock('../../../../contexts/NavigationGuardContext', () => ({
  __esModule: true,
  useNavigationGuard: () => ({ register: () => () => {}, isBlocking: false }),
  NavigationGuardProvider: ({ children }) => children,
}));
jest.mock('../../../../contexts/AdminAuthContext', () => ({
  __esModule: true,
  useAdminAuth: () => ({ can: () => true }),
}));
jest.mock('../../../../contexts/MasterDataContext', () => ({
  __esModule: true,
  useMasterData: () => ({ refresh: jest.fn() }),
}));
jest.mock('../../../../components/seo/SeoPanel', () => ({
  __esModule: true,
  default: function MockSeoPanel() {
    return <div data-testid="seo-panel" />;
  },
}));
jest.mock('../../../../components/editor/RichTextField', () => ({
  __esModule: true,
  default: function MockRichTextField({ label, value, onChange }) {
    return (
      <label>
        {label}
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  },
}));

const service = masterDataService.developers;

const RECORD = {
  id: 3,
  name: 'Cauvery Homes',
  slug: 'cauvery-homes',
  shortDescription: 'Mid-market homes in the south.',
  description: '<p>Profile.</p>',
  logoUrl: null,
  coverImageUrl: null,
  establishedYear: 2004,
  headquarters: 'Bengaluru',
  website: null,
  totalProjects: 12,
  ongoingProjects: 3,
  completedProjects: 9,
  reraIds: [],
  highlights: ['On time', 'Clear titles'],
  isFeatured: false,
  isActive: true,
  order: 3,
  seo: { slug: 'cauvery-homes' },
  updatedAt: '2026-09-01T00:00:00.000Z',
};

function Elsewhere() {
  const location = useLocation();
  return <p data-testid="elsewhere">{`${useNavigationType()} ${location.pathname}`}</p>;
}

const renderForm = ({ record = RECORD, add = false } = {}) => {
  jest.spyOn(service, 'adminGet').mockResolvedValue({ data: record });
  const url = add
    ? '/admin/master-data/developers/add'
    : `/admin/master-data/developers/edit/${record.id}`;
  const path = add ? '/admin/master-data/developers/add' : '/admin/master-data/developers/edit/:id';
  return renderWith(
    <Routes>
      <Route path={path} element={<DeveloperFormPage />} />
      <Route path="*" element={<Elsewhere />} />
    </Routes>,
    { initialEntries: [url] }
  );
};

const loaded = () => screen.findByDisplayValue(RECORD.name);
const saveButton = () => screen.getAllByRole('button', { name: 'Save' })[0];

beforeEach(() => {
  jest.restoreAllMocks();
  // A dirty form keeps a copy of itself on the way out (prompt 51).
  window.localStorage.clear();
  jest.spyOn(service, 'checkSlug').mockResolvedValue({ data: { available: true } });
  jest
    .spyOn(service, 'adminList')
    .mockResolvedValue({ data: [], meta: { page: 1, perPage: 1, total: 8, totalPages: 8 } });
  jest
    .spyOn(service, 'update')
    .mockImplementation((id, body) =>
      Promise.resolve({ data: { ...RECORD, ...body, id: Number(id) } })
    );
  redirectService.deactivateByFromPath.mockResolvedValue(null);
  redirectService.upsertByFromPath.mockResolvedValue({ data: {} });
});

describe('DeveloperFormPage (QA-60)', () => {
  it('names the counts by their labels, and does not add up a negative one', async () => {
    renderForm();
    await loaded();

    fireEvent.change(screen.getByLabelText('Total projects'), { target: { value: '-1' } });
    await userEvent.click(saveButton());

    expect(await screen.findByText('The total projects must be at least 0.')).toBeInTheDocument();
    // "…more than the -1 total projects" was a sentence about a typo.
    expect(screen.queryByText(/more than the -1 total projects/)).toBeNull();
    await waitFor(() => expect(screen.getByLabelText('Total projects')).toHaveFocus());
    expect(service.update).not.toHaveBeenCalled();
  });

  it('passes by the counts warning to the field that stops the save', async () => {
    renderForm();
    await loaded();

    // Ongoing + completed over the total: a warning, not a refusal…
    fireEvent.change(screen.getByLabelText('Total projects'), { target: { value: '5' } });
    // …and a website without its protocol, which is one.
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'www.example.com' } });
    expect(screen.getByText(/add up to 12, which is more than the 5/)).toBeInTheDocument();

    await userEvent.click(saveButton());
    expect(
      await screen.findByText('Include the protocol — https://example.com.')
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Website')).toHaveFocus());
  });

  it('writes nothing when nothing has changed, and saves in place otherwise', async () => {
    renderForm();
    await loaded();

    await userEvent.click(saveButton());
    expect(await screen.findByText('No changes to save.')).toBeInTheDocument();
    expect(service.update).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Headquarters'), { target: { value: 'Mysuru' } });
    await userEvent.click(saveButton());
    expect(await screen.findByText('Developer saved')).toBeInTheDocument();
    expect(service.adminGet).toHaveBeenCalledTimes(1);
  });

  it('redirects a live developer’s old address when its URL changes', async () => {
    renderForm();
    await loaded();

    fireEvent.change(screen.getByDisplayValue('cauvery-homes'), {
      target: { value: 'cauvery-homes-ltd' },
    });
    expect(await screen.findByText(/This page is live at/)).toBeInTheDocument();
    await userEvent.click(saveButton());

    await waitFor(() =>
      expect(redirectService.upsertByFromPath).toHaveBeenCalledWith(
        expect.objectContaining({
          fromPath: '/builders/cauvery-homes',
          toPath: '/builders/cauvery-homes-ltd',
        })
      )
    );
  });

  it('gives every SEO hint a block to go to', async () => {
    renderForm();
    await loaded();

    for (const id of [
      'developer-description',
      'developer-images',
      'developer-highlights',
      'developer-slug',
    ]) {
      // eslint-disable-next-line testing-library/no-node-access -- the hints target ids
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it('proposes the end of the list for a new developer', async () => {
    renderForm({ add: true });
    await waitFor(() => expect(screen.getByLabelText('Order')).toHaveValue(9));
  });
});
