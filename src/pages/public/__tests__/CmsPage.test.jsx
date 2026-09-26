import { screen, waitFor } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';

import CmsPage from '../CmsPage';
import pageService from '../../../services/pageService';
import renderWith from '../../../test-utils';
import { resetDraftPreviews, stashDraftPreview } from '../../../utils/draftPreview';

jest.mock('../../../services/pageService', () => ({
  __esModule: true,
  default: { getBySlug: jest.fn() },
}));

jest.mock('../../../contexts/AdminAuthContext', () => ({
  useAdminAuth: () => ({ isAuthenticated: false }),
}));

/** Where the router ended up, drawn so the test can read it. */
function Where() {
  const location = useLocation();
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>;
}

function renderAt(path) {
  renderWith(
    <Routes>
      <Route path="/" element={<Where />} />
      <Route path="/:slug/*" element={<CmsPage />} />
    </Routes>,
    { initialEntries: [path] }
  );
}

/**
 * A CMS page at its address (§6.10) — and the one address that is not one
 * (QA-56): the `home` record is the home page, so `/home` is the site root.
 * The admin list linked to `/home` as "the home page", and it drew two of the
 * home page's bands on an otherwise empty page.
 */
describe('CmsPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends /home to the site root without asking for the record', async () => {
    renderAt('/home');

    expect(await screen.findByTestId('where')).toHaveTextContent(/^\/$/);
    expect(pageService.getBySlug).not.toHaveBeenCalled();
  });

  it('keeps the preview token on the way, so "Save & preview" opens the real home page', async () => {
    renderAt('/home?preview=abc123');

    expect(await screen.findByTestId('where')).toHaveTextContent('/?preview=abc123');
  });

  it('still asks for any other page by its slug', async () => {
    pageService.getBySlug.mockResolvedValue({
      data: { id: 2, slug: 'about', title: 'About Us', status: 'published', blocks: [] },
    });

    renderAt('/about');

    await waitFor(() =>
      expect(pageService.getBySlug).toHaveBeenCalledWith('about', undefined, expect.anything())
    );
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });
});

describe('CmsPage — "Preview changes" (prompt 51)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    resetDraftPreviews();
  });

  it('draws the editor’s unsaved page from this browser, and fetches nothing', async () => {
    const id = stashDraftPreview('page', {
      id: 2,
      slug: 'about',
      title: 'About us, rewritten',
      status: 'published',
      blocks: [],
    });

    renderAt(`/about?draftPreview=${id}`);

    expect(
      await screen.findByText('Previewing unsaved changes — not what visitors see.')
    ).toBeInTheDocument();
    expect(pageService.getBySlug).not.toHaveBeenCalled();
  });

  it('says a spent preview has expired rather than answering 404', async () => {
    renderAt('/about?draftPreview=never-written');

    expect(await screen.findByText('This preview has expired')).toBeInTheDocument();
    expect(pageService.getBySlug).not.toHaveBeenCalled();
  });
});
