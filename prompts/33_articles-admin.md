# Prompt 33 — Articles admin: list, editor form (Tiptap), scheduling, preview, categories/tags/authors CRUD

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §6.8 articles/categories/tags/authors, §5.14 article rows, the master spec ART-06…ART-08, §13 D26/D28/D76), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–32 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
Legacy `src/pages/admin/AdminArticles.js` (client filters, trending toggles, partial updates → PATCH since 11) and `ArticleForm.jsx` (Markdown textarea + help modal, `generateExcerpt`, tags input, related articles Autocomplete, SEO title/description counters, `author` free text) run on the `legacyArticle.js` adapter. Mock: `GET /admin/articles` (filters `status|categoryId|authorId|tagId|q|isFeatured`, sorts), CRUD with `contentText/wordCount/readingTimeMinutes` computed, `scheduled` validation, bulk publish/unpublish/archive/delete/feature/unfeature, `check-slug`, `GET /admin/articles/:id/preview-token`; master data CRUD for `article-categories` (slugged, `articleCount`), `article-tags`, `authors` (slugged). `RichTextEditor` (32), `SafeHtml`, `MasterDataPage`, `SlugField`, `ImageField`, `EntityPicker`, `MultiSelect creatable`, `SeoScoreChip`, `AdminTabs`, `useForm`, `useUnsavedChanges` exist. The SEO panel arrives in 36 (placeholder card here).

## 2. Objective
When this prompt is finished: `/admin/articles` (server-side `DataTable`: thumbnail, title (+ slug), category, author, status (with scheduled date), published date, views, SEO score chip, updated; filters `q`, status, category, author, tag, featured; sorts; bulk publish/unpublish/archive/delete/feature/unfeature; row actions Edit, Preview, View (published), Duplicate, Delete; "New article"), `/admin/articles/add|edit/:id` (two-column: main = title (20–100) with live `SlugField` (base `/insights/articles/`), excerpt (counter ≤ 300, "Generate from content" button), `RichTextEditor` full variant with `onRequestImage` (URL dialog until 39) and `focusKeyword` from the SEO placeholder; right rail = status & scheduling (Draft / Publish now / Schedule at datetime (Asia/Kolkata display) / Archive), featured toggle, category (single select, "add" quick-create), tags (`MultiSelect creatable` → creates tags via `masterDataService.articleTags.create`), author select, featured image (`ImageField` hint `og`, alt required), related articles (`EntityPicker` articles, max 5), related properties (`EntityPicker` properties, max 4), table-of-contents toggle, FAQ items repeater (question/answer compact editor), reading time/word count (from the editor stats), "Preview" (token → new tab), SEO placeholder card with title/description/focus keyword counters; validation: title 20–100, excerpt required for publish, featured image + alt required for publish, category required, content ≥ 300 words to publish (warning < 600 shown in the rail), scheduled requires a future date; autosave draft `sna_article_draft:<id|new>` every 10 s with a restore banner; unsaved guard; 422 mapping), `/admin/articles/categories`, `/admin/articles/tags`, `/admin/articles/authors` (`MasterDataPage` configs; authors with avatar, designation, bio (compact editor), social links, e-mail (private), active; categories/authors with SEO placeholder). Legacy article admin files and `legacyArticle.js` deleted.

## 3. Scope
### Files to create
- `src/pages/admin/articles/ArticlesListPage.jsx` (+ css), `articleColumns.jsx`, `ArticleFormPage.jsx` (+ css), `ArticleStatusCard.jsx`, `ArticleTaxonomyCard.jsx`, `ArticleRelatedCard.jsx`, `ArticleFaqsCard.jsx`, `useArticleForm.js` (thin wrapper over `useForm` with autosave + stats), `src/pages/admin/articles/taxonomyConfigs.js`, `CategoriesPage.jsx`, `TagsPage.jsx`, `AuthorsPage.jsx`
- `src/utils/articleUtils.js` (`generateExcerpt(html)` → first 300 chars of the first paragraph text, `wordCount(html)`, `readingTime(words)`), `src/utils/__tests__/articleUtils.test.js`
- Tests: `src/pages/admin/articles/__tests__/ArticleFormPage.test.jsx` (publish validation; schedule requires future date; autosave restore), `ArticlesListPage.test.jsx` (bulk publish)
### Files to modify
- `src/routes/adminRouteConfig.js`, `src/components/admin/MasterDataForm.jsx` (nothing expected), `docs/*`
### Files to delete
- `src/pages/admin/AdminArticles.js`, `src/pages/admin/ArticleForm.jsx`, `src/utils/adapters/legacyArticle.js`
### May also touch
- `src/services/articleService.js` (add `duplicate` client-side helper: create from an existing record)

## 4. Detailed tasks
1. **List** per the objective (`useApiList(articleService.adminList, { syncToUrl: true, defaults: { sort: 'updatedAt', order: 'desc', perPage: 20 } })`); status chip tones from `ARTICLE_STATUS`; scheduled shows "Scheduled · 12 Oct 2026 09:00"; Preview → `articleService.previewToken(id)` → `window.open(url)`; Duplicate → `articleService.create({ ...record without ids/counters, title: title + ' (Copy)', slug: '', status: 'draft', publishedAt: null })`.
2. **Form** per the objective; status control = radio group Draft / Published / Scheduled / Archived with a datetime field for Scheduled (`DateField` with time; converts to ISO UTC on save; displays in Asia/Kolkata); "Publish now" sets `status: published` and leaves `publishedAt` to the server (or keeps an existing one); featured image alt hint uses `seo.focusKeyword`; excerpt "Generate" uses `generateExcerpt(content)`; stats from `editorRef.getStats()`; TOC toggle; FAQ repeater (question text, answer `RichTextEditor variant="compact"`); related pickers; category quick-create dialog (name → slug auto); tags creatable; author select (active authors; default the first author for new articles? — no default: required); save actions Save draft / Save (keeps status) / Publish (sets published + validates publish rules) / Schedule; Ctrl+S; toasts; after create navigate to edit. Autosave/restore like the property form (`sna_article_draft:<id|new>`).
3. **Taxonomy pages**: categories (name, slug, description, order, active; delete guard (articles); SEO placeholder), tags (name, slug; delete guard), authors (name, slug, designation, bio compact editor, avatar (`ImageField avatar`), e-mail (private, admin-visible), social links linkedin/twitter/website, active; SEO placeholder; delete guard).
4. **Content quality helpers**: rail card "Content checks" listing: word count (≥ 300 to publish; ≥ 600 recommended), excerpt present, featured image + alt, category, ≥ 2 tags (recommended), FAQ items (recommended) — computed client-side (the full SEO analysis arrives in 36).
5. Delete legacy files/adapter; tests; format.

## 5. Data contract touched
Consumed: `GET /admin/articles` (all filters), `POST|GET|PUT|PATCH|DELETE /admin/articles(/:id)`, `POST /admin/articles/bulk`, `GET /admin/articles/check-slug`, `GET /admin/articles/:id/preview-token`, `/admin/article-categories*`, `/admin/article-tags*`, `/admin/authors*`, `GET /properties?ids=` (related). Storage: `sna_article_draft:<id|new>`.

## 6. UI/UX requirements
Two-column form (main 1fr / rail 340 px sticky ≥ 1200 px; stacked below with a sticky bottom bar); editor sticky toolbar; rail cards compact; status radio with helper text; datetime picker native `datetime-local`; thumbnails 56×36 in the list; scheduled/archived chips; mobile cards; every field labelled; unsaved guard.

## 7. Edge cases that must work
- Scheduling in the past → inline error; the mock also rejects (422 mapped).
- Publishing without a featured image alt → blocked with the rail check highlighted.
- Tags typed with spaces/uppercase → created as lowercase slugs, de-duplicated.
- Autosave restore for a new article after a crash; draft cleared after save.
- Deleting a category used by articles → guard dialog; author deletion guard.
- Duplicate creates a draft with a new unique slug (`-copy`).

## 8. Acceptance criteria
- [ ] Articles list/form/taxonomy pages work end-to-end (create, schedule, preview, publish, duplicate, bulk); validation rules enforced; autosave/restore works.
- [ ] Legacy article admin files and `legacyArticle.js` deleted; `grep -rn "legacyArticle\|Markdown" src` → 0.
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run smoke` pass; no console warnings.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run dev   (then) npm run smoke
```
Manual QA (desktop + 390 px): create an article with 2 headings, an image, a CTA block, tags "khata, bbmp", schedule it for tomorrow → list shows Scheduled → preview via token → edit → Publish now → public URL renders (legacy public page until 34; content via `SafeHtml`); duplicate; bulk archive; categories/tags/authors CRUD.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 33 report; Known issues: additional defect 20 (ArticleForm) closed; Pending rewrites: "Article/category/author SEO placeholder → panel (36)", "public blog (34)"; next prompt: 34.
- `docs/DECISIONS.md`: D26, D28, D76, duplicate strategy, no default author.

## 11. Commit
`git add -A && git commit -m "feat(articles): admin list and Tiptap editor form with scheduling, preview, taxonomy CRUD"`

## 12. Guardrails
- Do not touch: public blog pages (34), mock server, `db.json`, `theme.js`, `global.css`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (trending toggles are replaced by `isFeatured` + view-based trending — record).
