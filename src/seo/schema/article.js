/**
 * An article as search engines read it (§9.3).
 *
 * `BlogPosting` by default — everything on this site's insights section is a
 * blog post — unless the record asks for `Article` or `NewsArticle` in
 * `seo.schema.type`.
 */

import { absolute, compact, isoDate, ref } from './graph';
import { organizationId } from './organization';
import { wordCount } from '../text';

const ARTICLE_TYPES = new Set(['Article', 'BlogPosting', 'NewsArticle']);

/**
 * @param {object} input the normalised record (`entityAdapters.toSeoInput`) of an article
 * @param {{seoSettings?: object, siteUrl?: string, authors?: Array<object>}} [context]
 * @returns {object|null}
 */
export function articleNode(input = {}, context = {}) {
  const article = input.entity ?? {};
  const canonical = input.canonical;
  if (!canonical) return null;

  const siteUrl = String(context.siteUrl ?? context.seoSettings?.siteUrl ?? '').replace(/\/+$/, '');
  const requested = input.seo?.schema?.type;
  const type = ARTICLE_TYPES.has(requested) ? requested : 'BlogPosting';

  const author =
    article.author ??
    (Array.isArray(context.authors)
      ? (context.authors.find((row) => String(row?.id) === String(article.authorId)) ?? null)
      : null);
  const keywords = [input.seo?.focusKeyword, ...(input.seo?.secondaryKeywords ?? [])].filter(
    Boolean
  );

  return compact({
    '@type': type,
    '@id': `${canonical}#article`,
    headline: input.title || input.effectiveTitle,
    description: input.description || input.summary,
    image: input.images.map((image) => absolute(siteUrl, image.src)).filter(Boolean),
    datePublished: isoDate(article.publishedAt),
    dateModified: isoDate(article.updatedAt ?? article.publishedAt),
    author: author?.name
      ? compact({
          '@type': 'Person',
          name: author.name,
          url: author.slug ? absolute(siteUrl, `/insights/authors/${author.slug}`) : undefined,
        })
      : undefined,
    publisher: ref(organizationId(siteUrl)),
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    wordCount: Number(article.wordCount) || wordCount(input.contentText) || undefined,
    articleSection: input.extras?.categoryName,
    keywords: keywords.length ? keywords.join(', ') : undefined,
    inLanguage: 'en-IN',
  });
}

export default articleNode;
