import { screen, within } from '@testing-library/react';

import ArticleCard from '../ArticleCard';
import renderWith from '../../../../test-utils';

/** A §6.8 `ArticleSummary` with everything a card can draw. */
const article = {
  id: 1,
  slug: 'karnataka-rera-guide-for-homebuyers',
  title: 'Karnataka RERA: A Complete Guide for Bengaluru Homebuyers',
  excerpt: 'What a registration number tells you, and how to read a project page.',
  featuredImage: { url: 'https://example.test/rera.jpg', alt: 'A project page on a laptop' },
  category: { id: 3, name: 'Legal & RERA', slug: 'legal-rera' },
  tags: [{ id: 1, name: 'RERA', slug: 'rera' }],
  author: { id: 3, name: 'Legal Desk', slug: 'legal-desk', avatarUrl: null },
  publishedAt: '2026-05-27T06:30:00.000Z',
  readingTimeMinutes: 7,
};

describe('ArticleCard', () => {
  it('links the headline to the article and the chip to its category', () => {
    renderWith(<ArticleCard article={article} />);

    const heading = screen.getByRole('heading', { level: 3 });
    expect(within(heading).getByRole('link', { name: article.title })).toHaveAttribute(
      'href',
      '/insights/articles/karnataka-rera-guide-for-homebuyers'
    );
    expect(screen.getByRole('link', { name: 'Legal & RERA' })).toHaveAttribute(
      'href',
      '/insights/articles/category/legal-rera'
    );
  });

  it('prints the excerpt, the byline, the date and the reading time', () => {
    renderWith(<ArticleCard article={article} />);

    expect(screen.getByText(article.excerpt)).toBeInTheDocument();
    expect(screen.getByText('Legal Desk')).toBeInTheDocument();
    expect(screen.getByText('27 May 2026')).toBeInTheDocument();
    expect(screen.getByText('7 min read')).toBeInTheDocument();
  });

  it('takes the heading level the row around it needs', () => {
    renderWith(<ArticleCard article={article} headingLevel={2} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(article.title);
  });

  it('leaves the excerpt and the byline out of a compact card', () => {
    renderWith(<ArticleCard article={article} variant="compact" />);

    expect(screen.queryByText(article.excerpt)).not.toBeInTheDocument();
    expect(screen.queryByText('Legal Desk')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('draws the placeholder rather than a broken image when there is none', () => {
    renderWith(<ArticleCard article={{ ...article, featuredImage: null }} />);

    expect(screen.getByTestId('lazy-image-placeholder')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /project page/i })).not.toBeInTheDocument();
  });

  it('draws a record with no category, author or date at all', () => {
    renderWith(
      <ArticleCard
        article={{
          id: 9,
          slug: 'bare',
          title: 'A piece with nothing attached',
          excerpt: '',
          featuredImage: null,
          category: null,
          author: null,
          publishedAt: null,
          readingTimeMinutes: null,
        }}
      />
    );

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'A piece with nothing attached'
    );
    expect(screen.queryByText(/min read/)).not.toBeInTheDocument();
  });

  it('renders nothing at all without an article', () => {
    const { container } = renderWith(<ArticleCard article={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
