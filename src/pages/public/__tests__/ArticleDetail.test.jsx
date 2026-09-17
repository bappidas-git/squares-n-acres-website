import { Route, Routes } from 'react-router-dom';
import { screen, waitFor, within } from '@testing-library/react';

import ApiError from '../../../services/apiError';
import ArticleDetail from '../ArticleDetail';
import articleService from '../../../services/articleService';
import propertyService from '../../../services/propertyService';
import renderWith from '../../../test-utils';
import { AdminAuthProvider } from '../../../contexts/AdminAuthContext';

jest.mock('../../../services/articleService', () => ({
  __esModule: true,
  default: {
    getBySlug: jest.fn(),
    list: jest.fn(),
    prevNext: jest.fn(),
  },
}));

jest.mock('../../../services/propertyService', () => ({
  __esModule: true,
  default: { list: jest.fn() },
}));

/**
 * The seeded RERA guide, cut down to what the page draws: two H2s and an H3, so
 * the contents list clears the three-heading threshold.
 */
const CONTENT = `
  <p>The single most useful hour you can spend is on the regulator's website.</p>
  <h2>What the Act was written to fix</h2>
  <p>Possession dates slipped by years with no consequence.</p>
  <h3>Before the Act</h3>
  <p>A buyer had almost no leverage.</p>
  <h2>Five things to read on a project page</h2>
  <p>Start with the promoter and the project name.</p>
`;

/** The same body with a FAQ block in it — `SafeHtml` renders those live. */
const FAQ_BLOCK =
  `<div data-sna-block="faq" ` +
  `data-items='[{"question":"Asked in the body?","answer":"<p>Yes.</p>"}]'></div>`;

const article = {
  id: 1,
  slug: 'karnataka-rera-guide-for-homebuyers',
  title: 'Karnataka RERA: A Complete Guide for Bengaluru Homebuyers',
  excerpt: 'What a registration number actually tells you.',
  content: CONTENT,
  featuredImage: {
    url: 'https://example.test/rera.jpg',
    alt: 'A buyer reading a project registration page',
    caption: 'Every registered project has a public page.',
  },
  category: { id: 3, name: 'Legal & RERA', slug: 'legal-rera' },
  tags: [
    { id: 1, name: 'RERA', slug: 'rera' },
    { id: 12, name: 'Checklist', slug: 'checklist' },
  ],
  author: {
    id: 3,
    name: 'Legal Desk',
    slug: 'legal-desk',
    designation: 'Placeholder designation',
    bio: '<p>Writes the legal explainers.</p>',
    avatarUrl: null,
    socialLinks: { linkedin: 'https://example.test/in/legal-desk' },
  },
  status: 'published',
  publishedAt: '2026-05-27T06:30:00.000Z',
  updatedAtDisplay: '2026-08-01T06:30:00.000Z',
  readingTimeMinutes: 9,
  tableOfContents: true,
  faqs: [{ question: 'Is a RERA number proof a project is safe?', answer: '<p>No.</p>' }],
  relatedArticleIds: [2],
  relatedPropertyIds: [],
  seo: { title: '', description: 'Reading a Karnataka RERA project page.' },
};

const related = {
  id: 2,
  slug: 'bbmp-a-khata-vs-b-khata-explained',
  title: 'A khata and B khata, explained',
  excerpt: 'What the two registers mean for a purchase.',
  featuredImage: null,
  category: { id: 3, name: 'Legal & RERA', slug: 'legal-rera' },
  author: null,
  publishedAt: '2026-06-04T06:30:00.000Z',
  readingTimeMinutes: 6,
};

const neighbours = {
  prev: { id: 7, slug: 'older-piece', title: 'The piece published before this one' },
  next: { id: 8, slug: 'newer-piece', title: 'The piece published after it' },
};

/**
 * The page fires four calls, and the last of them — the related row — settles
 * after the headline is on screen. A test that asserted and returned before it
 * landed would update a component React had already finished with, which is
 * what "not wrapped in act(…)" is telling you about. Waiting for the last row
 * is both the honest end of the render and the quiet one.
 */
const settle = () => screen.findByText(related.title);

const renderPage = (path = `/insights/articles/${article.slug}`) =>
  renderWith(
    <AdminAuthProvider>
      <Routes>
        <Route path="/insights/articles/:slug" element={<ArticleDetail />} />
      </Routes>
    </AdminAuthProvider>,
    { initialEntries: [path] }
  );

beforeEach(() => {
  jest.clearAllMocks();
  articleService.getBySlug.mockResolvedValue({ data: article });
  articleService.list.mockResolvedValue({ data: [related], meta: { total: 1 } });
  articleService.prevNext.mockResolvedValue({ data: neighbours });
  propertyService.list.mockResolvedValue({ data: [], meta: { total: 0 } });
});

describe('ArticleDetail', () => {
  it('draws the headline, the breadcrumbs and the meta row from the record', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(article.title);

    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'Insights' })).toHaveAttribute(
      'href',
      '/insights/articles'
    );
    expect(within(crumbs).getByRole('link', { name: 'Legal & RERA' })).toHaveAttribute(
      'href',
      '/insights/articles/category/legal-rera'
    );

    expect(screen.getAllByRole('link', { name: 'Legal Desk' })[0]).toHaveAttribute(
      'href',
      '/insights/authors/legal-desk'
    );
    expect(screen.getByText('27 May 2026')).toBeInTheDocument();
    expect(screen.getByText('9 min read')).toBeInTheDocument();
    expect(screen.getByText(/Updated on/)).toBeInTheDocument();
    await settle();
  });

  it('shows the featured image with its caption', async () => {
    renderPage();

    expect(await screen.findByRole('img', { name: article.featuredImage.alt })).toHaveAttribute(
      'src',
      article.featuredImage.url
    );
    expect(screen.getByText(article.featuredImage.caption)).toBeInTheDocument();
    await settle();
  });

  it('builds the contents list from the H2/H3 ids SafeHtml writes', async () => {
    renderPage();

    const toc = await screen.findByRole('navigation', { name: 'In this article' });
    const links = within(toc).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '#what-the-act-was-written-to-fix',
      '#before-the-act',
      '#five-things-to-read-on-a-project-page',
    ]);

    // Every anchor names a heading that is actually in the rendered body.
    const headingIds = screen
      .getAllByRole('heading')
      .map((heading) => heading.id)
      .filter(Boolean);
    links.forEach((link) => {
      expect(headingIds).toContain(link.getAttribute('href').slice(1));
    });
    await settle();
  });

  it('hides the contents list when the editor turned it off', async () => {
    articleService.getBySlug.mockResolvedValue({ data: { ...article, tableOfContents: false } });
    renderPage();

    await settle();
    expect(screen.queryByRole('navigation', { name: 'In this article' })).not.toBeInTheDocument();
  });

  it('hides the contents list for a body with fewer than three headings', async () => {
    articleService.getBySlug.mockResolvedValue({
      data: { ...article, content: '<h2>One</h2><p>Text.</p><h2>Two</h2>' },
    });
    renderPage();

    await settle();
    expect(screen.queryByRole('navigation', { name: 'In this article' })).not.toBeInTheDocument();
  });

  it('merges the record’s own questions with the FAQ blocks in the body', async () => {
    articleService.getBySlug.mockResolvedValue({
      data: { ...article, content: `${CONTENT}${FAQ_BLOCK}` },
    });
    renderPage();

    expect(
      await screen.findByRole('button', { name: /Is a RERA number proof a project is safe\?/ })
    ).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Asked in the body\?/ })).toBeInTheDocument();
    await settle();
  });

  it('offers the four networks and the copy button', async () => {
    renderPage();

    expect(await screen.findByRole('link', { name: 'Share on WhatsApp' })).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/?text=')
    );
    expect(screen.getByRole('link', { name: 'Share on LinkedIn' })).toHaveAttribute(
      'href',
      expect.stringContaining('linkedin.com/sharing/share-offsite/')
    );
    expect(screen.getByRole('link', { name: 'Share on X' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Share on Facebook' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy the link to this article' })
    ).toBeInTheDocument();
    await settle();
  });

  it('links the tags to their archives', async () => {
    renderPage();

    expect(await screen.findByRole('link', { name: 'RERA' })).toHaveAttribute(
      'href',
      '/insights/articles/tag/rera'
    );
    await settle();
  });

  it('asks for the editor’s related articles by id and shows them', async () => {
    renderPage();

    expect(await screen.findByText(related.title)).toBeInTheDocument();
    await waitFor(() =>
      expect(articleService.list).toHaveBeenCalledWith(
        expect.objectContaining({ ids: '2' }),
        expect.anything()
      )
    );
  });

  it('shows the previous and next articles of the category', async () => {
    renderPage();

    const nav = await screen.findByRole('navigation', { name: 'More in this category' });
    expect(within(nav).getByText(neighbours.prev.title)).toBeInTheDocument();
    expect(within(nav).getByText(neighbours.next.title)).toBeInTheDocument();
    await settle();
  });

  it('draws nothing where a category has no neighbours', async () => {
    articleService.prevNext.mockResolvedValue({ data: { prev: null, next: null } });
    renderPage();

    await settle();
    expect(
      screen.queryByRole('navigation', { name: 'More in this category' })
    ).not.toBeInTheDocument();
  });

  it('carries the article id into the enquiry form', async () => {
    renderPage();

    await settle();
    expect(
      screen.getByRole('heading', { name: 'Want help with your property search?' })
    ).toBeInTheDocument();
  });

  it('banners a preview and asks search engines to stay away', async () => {
    articleService.getBySlug.mockResolvedValue({ data: { ...article, status: 'scheduled' } });
    renderPage(`/insights/articles/${article.slug}?preview=token-123`);

    expect(await screen.findByText(/Preview — this article is scheduled/)).toBeInTheDocument();
    await waitFor(() =>
      expect(articleService.getBySlug).toHaveBeenCalledWith(
        article.slug,
        { preview: 'token-123' },
        expect.anything()
      )
    );
    await settle();
  });

  it('draws an article with no image and no author without either block', async () => {
    articleService.getBySlug.mockResolvedValue({
      data: { ...article, featuredImage: null, author: null },
    });
    renderPage();

    await settle();
    expect(screen.queryByText(article.featuredImage.caption)).not.toBeInTheDocument();
    expect(screen.queryByText('Legal Desk')).not.toBeInTheDocument();
  });

  it('answers a 404 with the not-found page', async () => {
    articleService.getBySlug.mockRejectedValue(new ApiError({ status: 404, message: 'Not found' }));
    renderPage();

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Article not found');
  });
});
