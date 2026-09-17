/**
 * `SafeHtml` (prompt 32) — the only place in the app that renders HTML it did
 * not build. It has to do three things at once: sanitise, apply the site's
 * typography, and turn the three `data-sna-block` placeholders into live
 * components instead of printing them as empty divs.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import SafeHtml from '../SafeHtml';
import ToastProvider from '../../common/ToastProvider';
import propertyService from '../../../services/propertyService';

jest.mock('../../../services/propertyService');

const listing = (id, title) => ({
  id,
  title,
  slug: `listing-${id}`,
  listingType: 'sale',
  pricing: { price: 9000000 },
  area: { superBuiltUpArea: 1200, areaUnit: 'sqft' },
  images: [{ url: 'https://example.com/a.jpg', alt: title, isCover: true }],
  locality: { name: 'Whitefield' },
  badges: [],
});

// A listing card carries a shortlist button, which needs the toast bus; the
// router is what its `<Link>` needs.
const draw = (ui) =>
  render(
    <MemoryRouter>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>
  );

beforeEach(() => {
  propertyService.list.mockResolvedValue({ data: [listing(1, 'Lakeview Heights')], meta: {} });
});

describe('SafeHtml', () => {
  it('renders sanitised markup inside .prose', () => {
    draw(
      <SafeHtml
        data-testid="body"
        html="<h2>Heading</h2><p>Body</p><script>window.alert(1)</script>"
      />
    );

    expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByTestId('body')).toHaveClass('prose');
    expect(screen.getByTestId('body').innerHTML).not.toContain('alert');
  });

  it('gives every H2 and H3 a de-duplicated id, for a table of contents', () => {
    draw(<SafeHtml html="<h2>What it costs</h2><h3>What it costs</h3><h2>Next</h2>" />);

    const ids = screen.getAllByRole('heading').map((heading) => heading.id);
    expect(ids).toEqual(['what-it-costs', 'what-it-costs-2', 'next']);
  });

  it('gives an external link rel="noopener" and an image loading="lazy"', () => {
    draw(
      <SafeHtml html='<p><a href="https://example.com">Out</a></p><p><img src="https://example.com/a.png" alt="A"></p>' />
    );

    expect(screen.getByRole('link', { name: 'Out' })).toHaveAttribute(
      'rel',
      expect.stringContaining('noopener')
    );
    expect(screen.getByAltText('A')).toHaveAttribute('loading', 'lazy');
  });

  it('renders a cta placeholder as the real band', async () => {
    draw(
      <SafeHtml
        html={
          '<p>Before</p><div data-sna-block="cta" data-title="Need help choosing?" ' +
          'data-text="Talk to an advisor." data-button-label="Talk to us" ' +
          'data-lead-source="article"></div><p>After</p>'
        }
      />
    );

    // The prose around the block is there at once; the band itself arrives with
    // its chunk.
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(await screen.findByText('Need help choosing?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Talk to us' })).toBeInTheDocument();
  });

  it('renders a properties placeholder as live cards', async () => {
    draw(<SafeHtml html='<div data-sna-block="properties" data-ids="1,3"></div>' />);

    await waitFor(() => expect(propertyService.list).toHaveBeenCalled());
    expect(propertyService.list).toHaveBeenCalledWith(
      expect.objectContaining({ ids: '1,3' }),
      expect.anything()
    );
    expect(await screen.findByText('Lakeview Heights')).toBeInTheDocument();
  });

  it('leaves the listings block out when the caller asks it to', () => {
    draw(
      <SafeHtml html='<div data-sna-block="properties" data-ids="1"></div>' propertyCards={false} />
    );

    expect(propertyService.list).not.toHaveBeenCalled();
  });

  it('renders a faq placeholder as the accordion and reports its questions', async () => {
    const onFaqItems = jest.fn();
    const items = [{ id: 1, question: 'Is it registered?', answer: '<p>Yes.</p>' }];

    draw(
      <SafeHtml
        html={`<div data-sna-block="faq" data-items='${JSON.stringify(items)}'></div>`}
        onFaqItems={onFaqItems}
      />
    );

    // The accordion is fetched on demand, so the questions reach the page's
    // structured data before the band itself is on screen.
    expect(onFaqItems).toHaveBeenCalledWith(items);
    expect(await screen.findByRole('button', { name: /Is it registered\?/ })).toBeInTheDocument();
  });

  it('renders nothing for a block type it does not know', () => {
    draw(
      <SafeHtml
        data-testid="body"
        html='<p>Kept</p><div data-sna-block="wormhole" data-ids="1"></div>'
      />
    );

    expect(screen.getByText('Kept')).toBeInTheDocument();
    expect(screen.getByTestId('body').innerHTML).not.toContain('data-sna-block');
  });

  it('renders nothing at all for an empty value', () => {
    const { container } = draw(<SafeHtml html="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
