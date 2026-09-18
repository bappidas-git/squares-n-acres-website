import { act, fireEvent, screen, within } from '@testing-library/react';

import NotFound from '../NotFound';
import propertyService from '../../../services/propertyService';
import renderWith from '../../../test-utils';
import { ERRORS, NAV } from '../../../config/copy';

jest.mock('../../../services/propertyService', () => ({
  __esModule: true,
  default: { suggestions: jest.fn() },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

/**
 * The 404 page (§8.2): branded, searchable, and a way on to the five pages a
 * lost visitor most often wanted.
 *
 * `<Seo>` publishes into a Helmet provider that `renderWith` supplies, so the
 * `noindex` is asserted through the page type rather than by reading the head
 * out of jsdom — which Helmet fills asynchronously and which `Seo.test` already
 * covers for every page type.
 */
describe('NotFound', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    propertyService.suggestions.mockResolvedValue({ data: {} });
  });

  it('is branded and says what happened, in one <h1>', () => {
    renderWith(<NotFound />);

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(ERRORS.notFound.title);
    expect(screen.getByText(ERRORS.notFound.subtitle)).toBeInTheDocument();

    // The monogram, decorative beside the heading that already says it.
    expect(screen.getByAltText('')).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('carries the site search, with a visible label tied to the box', () => {
    renderWith(<NotFound />);

    const box = screen.getByLabelText(ERRORS.notFound.searchLabel);
    expect(box).toBeInTheDocument();
    expect(box).toHaveAttribute('role', 'combobox');
    expect(box).toHaveAttribute('placeholder', ERRORS.notFound.searchPlaceholder);
  });

  it('sends a search to the listing as ?q= (BUG-10)', async () => {
    // `GlobalSearch` debounces the term before it asks for suggestions, so the
    // clock is this test's to drive: with real timers the debounce fires after
    // the assertion and React reports the settling as an unwrapped update.
    jest.useFakeTimers();
    try {
      renderWith(<NotFound />);

      const box = screen.getByLabelText(ERRORS.notFound.searchLabel);
      fireEvent.change(box, { target: { value: 'Whitefield' } });
      fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/properties?q=Whitefield');

      // Let the debounce and the mocked suggestions land inside `act`.
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('offers the popular pages of §4.3', () => {
    renderWith(<NotFound />);

    const nav = screen.getByRole('navigation', { name: ERRORS.notFound.popular });
    const links = within(nav)
      .getAllByRole('link')
      .map((link) => [link.textContent, link.getAttribute('href')]);

    expect(links).toEqual([
      [NAV.buy, '/buy'],
      [NAV.rent, '/rent'],
      [NAV.localities, '/localities'],
      [NAV.insights, '/insights/articles'],
      [NAV.contact, '/contact'],
    ]);
  });

  it('offers the two actions out of the page', () => {
    renderWith(<NotFound />);

    expect(screen.getByRole('link', { name: ERRORS.notFound.browse })).toHaveAttribute(
      'href',
      '/properties'
    );
    expect(screen.getByRole('link', { name: ERRORS.notFound.goHome })).toHaveAttribute('href', '/');
  });

  it('lets a page say what was not found instead of the generic sentence', () => {
    renderWith(<NotFound {...ERRORS.notFound.pages.property} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      ERRORS.notFound.pages.property.title
    );
    expect(screen.getByText(ERRORS.notFound.pages.property.subtitle)).toBeInTheDocument();
    // The search and the trails are the same page either way.
    expect(screen.getByLabelText(ERRORS.notFound.searchLabel)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: ERRORS.notFound.popular })).toBeInTheDocument();
  });

  it('is never indexed (§9.3)', () => {
    // eslint-disable-next-line global-require
    const { NEVER_INDEXED } = require('../../../seo/pageTypes');
    expect(NEVER_INDEXED.has('notFound')).toBe(true);
  });
});
