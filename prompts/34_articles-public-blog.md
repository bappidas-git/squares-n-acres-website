# Prompt 34 — Public blog: index, category/tag/author pages, article page (TOC, SafeHtml blocks, share, related, FAQs, CTA), RSS link

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §6.8, §5.14 article rows, the master spec ART-09/ART-10 (JSON-LD via `<Seo>` in 38), §13 D26/D28), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–33 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
`src/pages/public/Articles.js` (index with `useApiList` since 11, category chips, search, sidebar trending + newsletter form) and `ArticleDetail.js` (breadcrumbs, `SafeHtml` since 32, TOC from H2 only, share links, related by ids, `LeadForm` `article`) are functional but on the old layout/features. Mock: `GET /articles` (filters `categoryId|categorySlug|tagId|tagSlug|authorId|authorSlug|q|isFeatured|ids`, sort `newest|popular`), `/articles/slug/:slug` (`?preview=`; increments views), `/articles/trending`, `/article-categories`, `/article-tags`, `/authors`, `/authors/slug/:slug`; `GET /rss.xml`. `SafeHtml` exposes `onFaqItems` and adds heading ids; `LeadCaptureContext`, `NewsletterSection`, `Pagination`, `Breadcrumbs`, `LazyImage`, `Avatar`, `ShareButton`, `FaqAccordion`, `PropertyCard` exist.

## 2. Objective
When this prompt is finished the blog matches ART-09: `/insights/articles` (featured hero article, category tabs, tag cloud, search, paginated grid (12) of cards with image/category/reading time/date, sidebar: trending (by views), newsletter, CTA card → lead modal `article`), `/insights/articles/category/:slug`, `/insights/articles/tag/:slug`, `/insights/authors/:slug` (author box + articles grid), `/insights/articles/:slug` (breadcrumbs Home › Insights › Category › Title, H1, meta row (author link, published/updated dates, reading time, category chip), featured image with caption, sticky TOC (desktop) / collapsible (mobile) built from H2/H3 ids, content via `SafeHtml` (live CTA/property/FAQ blocks), share bar (WhatsApp, X, LinkedIn, Facebook, copy), tags, author box, related articles (admin-selected or same category fallback), related properties (`ids`), FAQs accordion (article `faqs` + FAQ blocks), CTA lead form (`article`, `articleId`), prev/next (by `publishedAt` within the category), scheduled/draft handling with `?preview=`), `rss.xml` `<link rel="alternate">` in the head (temporary Helmet; `<Seo>` in 38), `noindex` for `?preview`.

## 3. Scope
### Files to create
- `src/pages/public/Articles.jsx` (rewritten, replaces `Articles.js`), `ArticleDetail.jsx` (rewritten, replaces `ArticleDetail.js`), `ArticleCategory.jsx`, `ArticleTag.jsx`, `AuthorPage.jsx` (+ css modules)
- `src/components/sections/article/ArticleCard.jsx`, `ArticleHero.jsx` (featured), `ArticleMeta.jsx`, `TableOfContents.jsx`, `ArticleShareBar.jsx`, `AuthorBox.jsx`, `RelatedArticles.jsx`, `RelatedProperties.jsx`, `ArticleCta.jsx`, `ArticlePrevNext.jsx`, `TrendingList.jsx`, `TagCloud.jsx`, `CategoryTabs.jsx`, `BlogSidebar.jsx`
- `src/utils/toc.js` (`buildToc(html)` → nested H2/H3 `{ id, text, level }` matching `SafeHtml` id generation — share the slug function), `src/utils/__tests__/toc.test.js`
- Tests: `src/pages/public/__tests__/ArticleDetail.test.jsx` (renders meta/TOC/related from fixtures; preview banner), `src/components/sections/article/__tests__/ArticleCard.test.jsx`
### Files to modify
- `src/routes/publicRoutes.js` (category/tag/author routes; `/insights/articles/:slug` stays), `src/routes/paths.js`, `src/components/sections/home/LatestInsights.jsx` (use `ArticleCard`), `src/services/articleService.js` (`prevNext` helper via two list calls), `docs/*`
### Files to delete
- `src/pages/public/Articles.js`, `ArticleDetail.js` (+ old css)
### May also touch
- `mock-server/routes/articles.js` (add `GET /articles/:id/adjacent?categoryId=` → `{ data: { prev, next } }` if two list calls are awkward — prefer adding this small endpoint + registry + smoke; record)

## 4. Detailed tasks
1. **Index** (`/insights/articles`): `useApiList(articleService.list, { syncToUrl: true, paramKeys: ['q','categorySlug','tagSlug','page','sort'], defaults: { perPage: 12, sort: 'newest' } })`; `ArticleHero` = newest `isFeatured` article (only on page 1 without filters; excluded from the grid); `CategoryTabs` (All + categories with counts, `?categorySlug=`); search input (`?q=`); sort (Newest/Popular); `ArticleCard` grid 3/2/1 (image 16/9 `LazyImage`, category chip, title (H3), excerpt clamp 3, author avatar + name, date, reading time); `Pagination` with `rel=prev/next`; sidebar (`BlogSidebar`): `TrendingList` (`articleService.trending()` numbered), `TagCloud` (tags with counts → `/insights/articles/tag/<slug>`), `NewsletterSection` compact, CTA card ("Need advice on a purchase?" → `openLeadModal({ entry: 'article' })`); skeletons; empty state "No articles found" + reset; breadcrumbs Home › Insights; H1 "Real estate insights & guides"; temporary Helmet + `<link rel="alternate" type="application/rss+xml" href="<API base>/rss.xml">`.
2. **Category / tag / author pages**: reuse the index engine with fixed `categorySlug`/`tagSlug`/`authorSlug`; H1 "<Category> articles" / "Articles tagged <tag>" / author page = `AuthorBox` hero (avatar, name, designation, bio via `SafeHtml`, social links `rel="noopener nofollow me"`) + grid; breadcrumbs; 404 when the taxonomy record is unknown (`articleService.categories()`/`tags()`/`authorBySlug`).
3. **Article page**: `useApi(articleService.bySlug(slug, { preview }))`; 404 handling; preview banner (`noindex`); layout: breadcrumbs (Home › Insights › Category › Title), `ArticleMeta` row, H1, excerpt as lede, featured image (`LazyImage` 16/9 + caption), two columns ≥ 1200 px (content 1fr / TOC 280 px sticky when `tableOfContents` and ≥ 3 headings; below 1200 px the TOC is a collapsible "In this article" above the content), `SafeHtml` (`onFaqItems` collects FAQ blocks), `ArticleShareBar` (WhatsApp `https://wa.me/?text=`, X `https://twitter.com/intent/tweet?text=&url=`, LinkedIn `https://www.linkedin.com/sharing/share-offsite/?url=`, Facebook `https://www.facebook.com/sharer/sharer.php?u=`, copy → toast; `track('share', { network })`), tags row, `AuthorBox` (compact), `RelatedArticles` (admin `relatedArticleIds` via `ids`; fallback: same category `perPage: 3` excluding self), `RelatedProperties` (`ids` → `PropertyCard`s), FAQs (`article.faqs` + collected FAQ-block items → `FaqAccordion`), `ArticleCta` (`LeadForm` inline, source `article`, `articleId`, title "Want help with your property search?"), `ArticlePrevNext` (previous/next published in the same category by `publishedAt`), "Updated on" when `updatedAtDisplay`; temporary Helmet with title/description/canonical/og image + `article:published_time`.
4. **Trending/home**: `LatestInsights` uses `ArticleCard`; `TrendingList` numbered 01–06.
5. Delete the legacy pages; tests; format.

## 5. Data contract touched
Consumed: `GET /articles` (all filters), `/articles/slug/:slug`, `/articles/trending`, `/article-categories`, `/article-tags`, `/authors`, `/authors/slug/:slug`, `GET /properties?ids=`, optional new `GET /articles/:id/adjacent` (mock + registry + smoke + docs if implemented), `POST /leads` (`article`).

## 6. UI/UX requirements
Editorial layout: hero article with large image, cards with consistent ratios, `.prose` content 72ch, TOC with active heading highlight (IntersectionObserver), share bar sticky at the content bottom on mobile? — keep it below the content; author box on surface; related grids 3/2/1; H1 once; breadcrumbs; reduced motion; no CLS.

## 7. Edge cases that must work
- Article without featured image → hero/meta without image block (no broken image); without author → meta omits author.
- TOC hidden when `tableOfContents` false or < 3 headings; heading ids unique even with duplicate titles.
- Scheduled article slug without token → 404; with token → preview banner.
- Category with 0 articles → empty state; unknown tag → 404.
- Prev/next absent at the ends.
- Share on desktop without `navigator.share` → menu/links; copy works.

## 8. Acceptance criteria
- [ ] Blog index, category/tag/author pages and the article page implement ART-09 features (verify each element on the seed article `karnataka-rera-guide-for-homebuyers`, which contains a table, figure, CTA block, property embed).
- [ ] TOC/anchors work; FAQ blocks and `faqs` merge; related/prev-next correct; lead CTA creates an `article` lead with `articleId`.
- [ ] Legacy `Articles.js`/`ArticleDetail.js` deleted; tests pass.
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run smoke` (+ `test:mock` if the adjacent endpoint was added) pass; no console warnings.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run dev   (then) npm run smoke
```
Manual QA (desktop + 390 px): `/insights/articles` → hero, tabs → Legal & RERA → URL; search "khata"; open the RERA article → TOC highlights while scrolling; property cards render inside the content; CTA block opens the modal; share copy; related; prev/next; `/insights/authors/editorial-team`; `/insights/articles/tag/rera`; a scheduled article via admin preview token.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 34 report; Known issues: BUG-18 (articles) closed, additional defect 16 closed; Pending rewrites: "blog Helmet → `<Seo type="article|articleCategory|author">` (38)"; next prompt: 35.
- `docs/DECISIONS.md`: adjacent endpoint decision, TOC threshold (≥ 3 headings), share networks.

## 11. Commit
`git add -A && git commit -m "feat(blog): public articles index, taxonomy pages and article page with TOC, live blocks, share, related and FAQs"`

## 12. Guardrails
- Do not touch: admin, `db.json`, `theme.js`, `global.css`, mock beyond the optional adjacent endpoint.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (search, category filter, trending, newsletter sidebar, related, share all survive).
