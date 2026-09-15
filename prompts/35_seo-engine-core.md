# Prompt 35 — SEO engine core (`src/seo/`): analyzers, scoring, readability, snippet widths, template variables, schema generators/validator, keywords, URLs — fully unit-tested

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §9.1, §9.3 (JSON-LD graph), §9.4, §9.5 variables, §9.6 `seo` object, §6.17 `SEO_SCORE_BANDS`, the master spec SEO-01/SEO-05…SEO-09/SEO-12/SEO-14 restated below, §13 D85), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–34 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
`src/utils/seoScoring.js` (9 weighted checks, grades A+…F) and `src/utils/seoGenerator.js` (title/description/keywords/canonical/schema string generation from the old property shape) still exist and are imported only by the legacy `src/pages/admin/AdminSeo.js` (read-only since 11). `src/config/enums.js` has `SEO_SCORE_BANDS.bandOf`, `SEO_SCHEMA_TYPES`, `SEO_ENTITY_TYPES`. `utils/format.js` has `formatPrice/formatArea/formatBhk/formatDate`; `utils/toc.js` has the heading slug function; `SafeHtml` strips HTML for text via `mock-server/lib/html.js`-equivalent? — no client helper exists: create `src/seo/text.js`. The `seo` object shape is §9.6; entities have `seo.focusKeyword/secondaryKeywords/title/description/slug/robots/og/twitter/schema/sitemap/redirect`.

## 2. Objective
When this prompt is finished `src/seo/` is a pure, framework-free engine with Jest tests for every function: `analyze(entityType, entity, context)` → `{ score, band, testsPassed, testsTotal, groups: { basic[], additional[], titleReadability[], contentReadability[] } }` implementing every test of SEO-06…SEO-09 with entity-type applicability and documented `WEIGHTS` summing to 100 per type; `readability.js` (Flesch Reading Ease, sentence/paragraph stats, subheading distribution, passive-voice heuristic, transition words); `snippet.js` (character + pixel width via canvas in the browser and a width table in Node); `variables.js` (`resolveTemplate(template, vars)` with all §9.5 variables + `cleanTitle`); `schema/` generators for every JSON-LD type of §9.3 with stable `@id`s + `validate.js` + `graph.js`; `keywords.js` (density, distribution, first-10 % check, stemming-light matching with Indian-English plurals, uniqueness helpers); `urls.js` (canonical builder, index-worthy filter rules of §9.4, path builders for every entity type); `suggestions.js` (focus keyword suggestions per entity type); `autoGenerate.js` (title/description/focus keyword/OG defaults from entity data using the templates — never overwrites non-empty values unless asked); `data/powerWords.js`, `data/stopWords.js`. `seoScoring.js`/`seoGenerator.js` are deleted (the legacy `AdminSeo.js` becomes a placeholder until 37).

## 3. Scope
### Files to create
- `src/seo/index.js`, `analyze.js`, `score.js` (`WEIGHTS`, `computeScore(results, entityType)`), `analyzers/basic.js`, `analyzers/additional.js`, `analyzers/titleReadability.js`, `analyzers/contentReadability.js`, `analyzers/index.js`, `readability.js`, `snippet.js`, `variables.js`, `keywords.js`, `urls.js`, `text.js` (`stripHtml`, `wordCount`, `sentences`, `paragraphs`, `headings(html)` → `[{level, text}]`, `images(html)` → `[{src, alt}]`, `links(html)` → `[{href, rel, internal}]`), `suggestions.js`, `autoGenerate.js`, `entityAdapters.js` (`toSeoInput(entityType, entity, context)` → normalised `{ title, slug, description, contentHtml, images[], links[], headings[], url, seo, extras }` for property/article/page/locality/developer/articleCategory/author/propertyType), `schema/index.js`, `schema/graph.js`, `schema/validate.js`, `schema/organization.js`, `website.js`, `breadcrumb.js`, `realEstateListing.js`, `article.js`, `faqPage.js`, `itemList.js`, `place.js`, `developerOrganization.js`, `person.js`, `webPage.js`, `videoObject.js`, `review.js`, `data/powerWords.js`, `data/stopWords.js`, `data/transitionWords.js`
- Tests in `src/seo/__tests__/`: `analyze.test.js`, `score.test.js`, `basic.test.js`, `additional.test.js`, `titleReadability.test.js`, `contentReadability.test.js`, `readability.test.js`, `snippet.test.js`, `variables.test.js`, `keywords.test.js`, `urls.test.js`, `text.test.js`, `suggestions.test.js`, `autoGenerate.test.js`, `schema.test.js`, `entityAdapters.test.js`, with fixtures in `src/seo/__tests__/fixtures/` (a full property, article, page, locality, developer from the seed)
### Files to modify
- `src/pages/admin/AdminSeo.js` → replaced by `src/pages/admin/seo/SeoPlaceholderPage.jsx` ("SEO dashboard arrives in prompt 37") to drop the legacy imports, `src/routes/adminRouteConfig.js`, `docs/*`
### Files to delete
- `src/utils/seoScoring.js`, `src/utils/seoGenerator.js`, `src/pages/admin/AdminSeo.js`
### May also touch
- nothing else

## 4. Detailed tasks
1. **Text utilities (`text.js`)**: HTML → text (decode entities, keep sentence boundaries), word count (Unicode-aware), sentences (split on `.?!` + newline, ignore abbreviations like "sq." "ft." "Rs."), paragraphs (`<p>`/blank lines), headings/images/links extraction via a tiny regex-free parser (`DOMParser` in the browser, a minimal tag scanner in Node — both must yield identical results in tests).
2. **Analyzer results**: each test returns `{ id, group, status: 'pass'|'warn'|'fail'|'skip', message, hint (fix text), field (dotted path to focus: 'seo.title', 'seo.description', 'slug', 'content', 'images', 'faqs', …), weight }`; `skip` = not applicable to the entity type (excluded from totals).
3. **Basic tests (SEO-06)** ids: `focus-keyword-set`, `keyword-in-title`, `keyword-in-description`, `keyword-in-slug`, `keyword-in-first-10-percent`, `keyword-in-content`, `content-length` (thresholds per type: article ≥ 600 good / ≥ 300 ok; property ≥ 300 / ≥ 150; page ≥ 300; locality/developer ≥ 200; propertyType/category/author skip), `title-length` (chars 50–60 + pixels ≤ 580; warn 40–49/61–65; fail otherwise), `description-length` (120–160 chars + ≤ 920 px), `description-unique` (uses `context.siteIndex` = the SEO overview rows → warn when identical to another entity's).
4. **Additional tests (SEO-07)** ids: `keyword-in-subheading`, `keyword-in-image-alt`, `keyword-density` (0.5–2.5 %), `slug-quality` (≤ 75, lowercase, no stop-words (hint only), not numbers-only), `internal-link` (articles/pages), `external-dofollow-link` (articles), `keyword-unique-site` (context index), `image-count` (property ≥ 5 with alt on all; article ≥ 1), `og-image-set`, `canonical-set`, `indexable`, property-specific: `price-present` (or on request acknowledged), `locality-in-title`, `rera-present` (warn), `faqs-min-3` (warn), `floor-plan-or-units` (warn), `amenities-min-8` (warn), `description-mentions-locality-and-type`; locality-specific: `connectivity-present`, `highlights-present`; article-specific: `excerpt-present`, `category-assigned`, `tags-min-2`, `featured-image-alt-keyword` (warn), `faq-block-present` (warn), `related-links-present` (warn).
5. **Title readability (SEO-08)** ids: `keyword-at-start`, `title-has-number` (warn), `title-power-word` (warn; `data/powerWords.js` real-estate list: premium, spacious, ready-to-move, verified, best, guide, checklist, affordable, luxury, new launch, top, complete, ultimate, essential, proven, trusted, exclusive, smart, step-by-step, 2026…), `title-not-all-caps`, `title-unique-site` (context index).
6. **Content readability (SEO-09)** (articles, pages, localities): `toc-present` (articles with ≥ 3 H2 → `tableOfContents` true), `short-paragraphs` (≤ 150 words), `has-media`, `flesch-reading-ease` (≥ 50 warn; value shown), `sentence-length` (avg ≤ 25), `subheading-distribution` (every ≤ 300 words), `passive-voice` (≤ 10 % warn; heuristic: "was|were|is|are|been|be|being" + past participle `-ed|-en|known|given|…`), `transition-words` (≥ 20 % of sentences contain one from `data/transitionWords.js`).
7. **`score.js`**: `WEIGHTS[entityType][testId]` tables (documented in a comment-free `docs/SEO_ENGINE.md` — create this doc: purpose, test list per type with weights, bands, how to extend); pass = full weight, warn = half, fail = 0, skip = excluded (weights re-normalised to 100 over applicable tests); `band` via `SEO_SCORE_BANDS.bandOf`; `testsPassed/testsTotal` count pass only over applicable tests.
8. **`snippet.js`**: `titleWidth(text)`/`descriptionWidth(text)` → px (canvas `measureText` with `20px Arial`/`14px Arial` when `document` exists; else a width table for ASCII + average 8 px/char fallback); `truncateToWidth(text, maxPx)` for previews; constants `TITLE_MAX_PX 580`, `DESC_MAX_PX 920`, char guides.
9. **`variables.js`**: `buildVariables(entityType, entity, context)` → all §9.5 variables (`%price%` via `formatPrice`, `%bhk%` via `formatBhk` or empty for plots/commercial, `%listingtype%` via `LISTING_TYPES.verbOf`, `%status%`, `%locality%`, `%city%`, `%developer%`, `%projectname%`, `%count%`, `%page%`, `%date%`/`%modified%` `formatDate`, `%currentyear%`, `%sep%`, `%sitename%`, `%tagline%`, `%excerpt%`, `%category%`, `%author%`, `%propertytype%`, `%area%`); `resolveTemplate(template, vars)` + `cleanTitle` (collapse doubled separators/spaces, trim dangling `–`/`|`/`,`); `listVariables()` for the panel's insert menu.
10. **`urls.js`**: `publicPathFor(entityType, entity)` (property `/properties/<slug>`, article `/insights/articles/<slug>`, category `/insights/articles/category/<slug>`, tag, author `/insights/authors/<slug>`, locality `/localities/<slug>`, developer `/builders/<slug>`, page `/<slug>`, propertyType `/buy/<slug>` or `/commercial/<slug>`), `canonicalFor(siteUrl, path, query, rules)` implementing §9.4 (index-worthy keys in order; trailing slash none), `isNoindexListing(query, seoSettings)`.
11. **`keywords.js`**: `normalize(text)` (lowercase, strip punctuation, collapse spaces), `containsKeyword(text, keyword)` with stemming-light (plural `s`/`es`, `flats`↔`flat`, `bhks`, hyphen/space equivalence `ready-to-move`↔`ready to move`), `density(text, keyword)`, `firstOccurrencePercent(text, keyword)`, `inFirstPercent(text, keyword, 10)`.
12. **`schema/`**: generators take `(input, context)` and return graph nodes with `@id`s (§9.3); `validate.js` structural checks (`@context`, `@type` in a known list from `SEO_SCHEMA_TYPES` + the generated types, required props per type, valid absolute URLs, ISO dates) → `{ valid, errors[] }`; `graph.js` `mergeGraph(nodes[])` de-duplicates by `@id` and wraps as `{ '@context': 'https://schema.org', '@graph': [...] }`; `parseCustom(jsonString)` → validated node(s) or errors.
13. **`suggestions.js`**: keyword suggestions per type (property: "<bhk> <type> for sale in <locality>", "<type> in <locality>", "<projectName>", "<developer> <locality>"; locality: "properties in <name>", "<name> real estate", "flats in <name>"; article: from title n-grams (2–4 words, without stop-words) + category; developer: "<name> projects in Bengaluru"; page: title n-grams).
14. **`autoGenerate.js`**: `generateDefaults(entityType, entity, seoSettings, { overwrite })` → `{ title, description, focusKeyword, og.imageUrl }` from templates/variables, description from `shortDescription/excerpt/first paragraph` trimmed to 155 chars ending at a word boundary, OG image = cover/featured/hero.
15. Delete the legacy scoring/generator and `AdminSeo.js`; placeholder route; `docs/SEO_ENGINE.md`; tests (≥ 150 assertions total; each test id exercised with pass/warn/fail/skip fixtures); format.

## 5. Data contract touched
None (pure code). `context.siteIndex` shape = SEO overview rows (`GET /admin/seo/overview` — consumed by 36/37, not here).

## 6. UI/UX requirements
N/A.

## 7. Edge cases that must work
- Empty entity (new record) → score 0, every applicable test `fail`/`warn`, no exceptions.
- Keyword with special characters/hyphens; description identical except case → considered identical.
- Node environment (`document` undefined) → width table used; results deterministic.
- Property with `priceOnRequest` → `price-present` passes with the message "Price on request acknowledged".
- Article HTML with an H1 inside → `keyword-in-subheading` ignores it and a `heading-hierarchy` warn is raised (add test id `heading-hierarchy` to content readability).
- `resolveTemplate` with unresolved variables → removed and cleaned (`"– | Squares N Acres"` → `"Squares N Acres"`).
- `validate` rejects `@type: 'Foo'`, non-absolute `url`, malformed dates.

## 8. Acceptance criteria
- [ ] `src/seo/index.js` exports `analyze`, `computeScore`, `WEIGHTS`, `resolveTemplate`, `buildVariables`, `listVariables`, `titleWidth`, `descriptionWidth`, `suggestKeywords`, `generateDefaults`, `schema.*`, `urls.*`, `text.*`, `keywords.*`.
- [ ] `WEIGHTS` sum to 100 per entity type (test); every test id in SEO-06…SEO-09 exists and is documented in `docs/SEO_ENGINE.md`.
- [ ] All `src/seo/__tests__` pass; `seoScoring.js`/`seoGenerator.js`/`AdminSeo.js` deleted; `/admin/seo` shows the placeholder.
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run smoke` pass.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run test:ci -- --coverage --collectCoverageFrom="src/seo/**/*.js"   (report ≥ 90 % statements for src/seo; record the number)
npm run lint
npm run build:ci
npm run check:traces
npm run dev   (then) npm run smoke
```
Manual QA: `node -e` is not possible for ESM src — use Jest; open `/admin/seo` → placeholder; the app otherwise unchanged.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 35 report (coverage %); Known issues: additional defect 27 closed; Pending rewrites: "SeoPlaceholderPage → dashboard (37)"; next prompt: 36.
- `docs/DECISIONS.md`: D85, weight tables rationale, passive-voice heuristic, stemming rules, `heading-hierarchy` test.

## 11. Commit
`git add -A && git commit -m "feat(seo): pure SEO engine with analyzers, scoring, readability, snippet widths, variables, schema generators and tests"`

## 12. Guardrails
- Do not touch: UI components (except the placeholder page), mock server, `db.json`, `theme.js`, `global.css`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (the legacy SEO score/auto-generate capabilities are superseded by this engine and re-exposed in 36/37).
