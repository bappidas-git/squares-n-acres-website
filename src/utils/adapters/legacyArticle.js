/**
 * TEMPORARY — the contract article of §6.8 in the field names `AdminArticles`
 * and `ArticleForm` still read (`image`, `category` as a string, `author` as a
 * string, `readTime`).
 *
 * Prompts 33 (articles admin) and 34 (public blog) rewrite those screens
 * against the real shape and delete this file. Registered in
 * `docs/PROJECT_STATE.md` → "Pending rewrites".
 */

const list = (value) => (Array.isArray(value) ? value : []);

/**
 * @param {object|null} article a record from `/articles*`
 * @returns {object|null}
 */
export function toLegacyArticle(article) {
  if (!article || typeof article !== 'object') return null;

  return {
    ...article,
    image: article.featuredImage?.url ?? '',
    imageAlt: article.featuredImage?.alt ?? article.title ?? '',
    category: article.category?.name ?? '',
    categorySlug: article.category?.slug ?? '',
    author: article.author?.name ?? '',
    authorSlug: article.author?.slug ?? '',
    tags: list(article.tags)
      .map((tag) => tag?.name ?? tag)
      .filter(Boolean),
    readTime: article.readingTimeMinutes ?? null,
    isActive: article.status === 'published',
  };
}

/** `toLegacyArticle` over a list. */
export const toLegacyArticles = (articles) => list(articles).map(toLegacyArticle).filter(Boolean);

export default toLegacyArticle;
