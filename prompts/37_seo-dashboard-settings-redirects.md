# Prompt 37 — SEO dashboard, global SEO settings, redirects manager, SEO playbook page, bulk tools

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §6.14 `seoSettings`/`redirects`, §9.5 templates, §9.8 robots/llms defaults, the master spec SEO-04/SEO-16/SEO-19/SEO-20/SEO-21 restated below, §13 D30), then `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`, `docs/SEO_ENGINE.md`.
- Confirm prerequisites: prompts 01–36 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
`/admin/seo` is a placeholder page; `/admin/seo/settings`, `/admin/seo/redirects`, `/admin/seo/guide` are placeholders. `src/components/admin/SeoGuidelines.jsx` (16 accordion topics, HOM-era city examples and `yourdomain.com`) still exists unused since 35. Mock: `GET /admin/seo/overview` (type/q/scoreBand/index filters, `perPage=all`), `GET|PUT /admin/seo/settings` (deep merge), `GET /api/admin/seo/llms-preview`, redirects admin CRUD + `import` + `export` + `resolve`, per-entity `PATCH … { seo }`. `SeoPanel` (36) can be mounted standalone; `src/seo` provides `analyze`, `generateDefaults`, `resolveSeoOutput`, `listVariables`, `resolveTemplate`. `MasterDataPage`, `DataTable`, `useForm`, `downloadAuthenticated`, `csv.js` exist.

## 2. Objective
When this prompt is finished the SEO Manager module is complete: `/admin/seo` (overview cards: average score, counts per band, missing focus keyword, missing description, noindexed, duplicates; filters type/band/index/search; `DataTable` of all entities (title, type, focus keyword, score chip, index status, last analysed, "Edit SEO" → dialog with the full `SeoPanel` loading the entity via its admin service, analysing and saving `PATCH { seo }` (+ redirect side effect), "Open page"); "Re-analyse all" (client loop with progress: loads each entity, runs `analyze`, PATCHes changed scores); "Auto-generate missing" (fills empty title/description/focus keyword/OG with `generateDefaults`; "overwrite" checkbox; progress); Duplicates tab (identical titles/descriptions/focus keywords grouped with links); Issues tab (every failed critical test across the site with links); export CSV), `/admin/seo/settings` (tabs: Titles & Meta (separator, per-type templates with the variable helper and a live example, default description, default OG image, default robots, noindex rules), Knowledge graph (type, name, legal name, logo, description, phone, e-mail, address, geo, opening hours, price range, area served, `sameAs`), Webmaster verification (google/bing/pinterest/yandex), Analytics (link to site settings), Sitemap (enable, per-type include, changefreq/priority per type, exclusions, "Open sitemap" links), robots.txt editor (+ "Restore recommended"), llms.txt editor (+ "Regenerate from data"), Breadcrumbs, Custom head/body HTML (admin-only; manager sees read-only), "Head output preview" for the home page via `resolveSeoOutput`), `/admin/seo/redirects` (CRUD table from/to/type/active/hits/note, CSV import/export, validation (loops, `/` prefix), "Check a URL" tester using `redirectService.resolve`), `/admin/seo/guide` (the rewritten playbook: SNA-specific, RankMath-style scoring explained from `docs/SEO_ENGINE.md`, AI-search guidance, Indian real-estate examples with Bengaluru localities, no placeholder domains) and the Nginx snippet export for redirects. `SeoGuidelines.jsx` is replaced.

## 3. Scope
### Files to create
- `src/pages/admin/seo/SeoDashboardPage.jsx` (+ css), `SeoOverviewCards.jsx`, `SeoEntityTable.jsx`, `SeoEditDialog.jsx`, `SeoBulkTools.jsx` (re-analyse / auto-generate with progress dialog), `SeoDuplicatesTab.jsx`, `SeoIssuesTab.jsx`, `useSeoOverview.js`, `seoEntityServices.js` (map `type` → `{ get, patch, publicPath }`)
- `src/pages/admin/seo/SeoSettingsPage.jsx` (+ css), `settings-tabs/TitlesMetaTab.jsx`, `KnowledgeGraphTab.jsx`, `VerificationTab.jsx`, `AnalyticsTab.jsx`, `SitemapTab.jsx`, `RobotsTab.jsx`, `LlmsTab.jsx`, `BreadcrumbsTab.jsx`, `CustomHtmlTab.jsx`, `HeadPreviewTab.jsx`
- `src/pages/admin/seo/RedirectsPage.jsx` (+ css), `RedirectImportDialog.jsx`, `RedirectTester.jsx`, `nginxSnippet.js`
- `src/pages/admin/seo/SeoGuidePage.jsx` (+ css), `seoGuideContent.js` (structured topics)
- Tests: `src/pages/admin/seo/__tests__/SeoBulkTools.test.jsx` (progress + skip non-empty without overwrite), `RedirectsPage.test.jsx` (validation), `nginxSnippet.test.js`, `TitlesMetaTab.test.jsx` (live example resolves variables)
### Files to modify
- `src/routes/adminRouteConfig.js`, `src/services/seoService.js` (`llmsPreview`), `src/services/redirectService.js` (`import`, `exportUrl`, `resolve`), `docs/*`
### Files to delete
- `src/components/admin/SeoGuidelines.jsx`, `src/pages/admin/seo/SeoPlaceholderPage.jsx`
### May also touch
- `mock-server/routes/seo.js` (overview `duplicates` flags — compute `duplicateOf: { title: [ids], description: [ids], focusKeyword: [ids] }` server-side to avoid O(n²) on the client; registry/docs)

## 4. Detailed tasks
1. **Overview data**: `useSeoOverview({ type, q, scoreBand, index, page, perPage })` (server-side table) + `useSeoOverview.all()` for cards/duplicates/issues (`perPage=all` — cached 60 s); cards computed from all rows: average score (analysed only), good/ok/poor/none counts, missing focus keyword, missing description, noindexed (`seo.robots.index === false`), duplicates count (from server `duplicateOf` flags).
2. **Table**: columns Title (+ type chip + slug), Focus keyword (or "—" warning), Score (`SeoScoreChip`), Index (chip "Indexed"/"Noindex"), Last analysed (`formatRelative`), Actions (Edit SEO, Open page (new tab; inactive → preview when supported), Open entity form). Filters type (all entity types), band, index, search; sort by score/updatedAt/title (server).
3. **Edit dialog**: loads the full entity with `seoEntityServices[type].get(id)`, mounts `SeoPanel variant="full"` with `context` (site index from the overview rows), Save → `patch(id, { seo })` + `applySeoSideEffects` → table row updated + `emit('seo:changed')`; unsaved guard on close.
4. **Bulk tools**: "Re-analyse all" → for each row (optionally filtered by type): get entity → `analyze` → if `score/analysis` differ → `patch({ seo: { ...seo, score, … } })`; progress dialog (n/N, errors list, cancel); "Auto-generate missing" → `generateDefaults(type, entity, seoSettings, { overwrite })` → patch only when something changed; summary toast.
5. **Duplicates tab**: groups by identical title / description / focus keyword (server flags) with links to edit; **Issues tab**: rows for every `fail` in `basic`/critical tests (`focus-keyword-set`, `title-length`, `description-length`, `keyword-in-title`, `indexable`, `og-image-set`, `canonical-set`, `image-count` for properties) across entities with "Fix" (opens the dialog focused on the field); export CSV of the current table (client `csv.js`: Type, Title, URL, Focus keyword, Score, Band, Index, Last analysed).
6. **Settings page**: `useForm` over `seoService.adminSettings()`; Titles & Meta (separator select `| – · —`, templates per type with `VariableMenu` and a live example resolved against a sample entity from the overview (first property/article…), default description, default OG image (`ImageField og`), default robots switches, noindex rules switches (search results, paginated, filtered, admin)), Knowledge graph (fields per §6.14; type select; opening hours as `MultiSelect creatable` of schema strings with a helper; `sameAs` URL list), Verification (4 fields), Analytics (info + link to `/admin/settings` integrations), Sitemap (enable, includes, changefreq/priority per type (0–1 step 0.1), exclusions list, links to `<API>/sitemap.xml` etc.), robots.txt (monospace textarea + "Restore recommended" (§9.8 default) + "Preview" link), llms.txt (textarea + "Regenerate from data" → `seoService.llmsPreview()` fills the textarea + preview link), Breadcrumbs (enabled, home label), Custom HTML (two textareas; visible/editable only for `admin`; manager sees read-only notice; helper: "Trusted admins only — rendered verbatim"), Head preview (`resolveSeoOutput('home', null, values)` → title/description/canonical/robots/OG/JSON-LD JSON in a read-only block). Save → `PUT /admin/seo/settings` → `SiteSettingsContext.refresh()`; manager read-only (`settings.view` only for `seo`? — SEO is admin+manager editable per §7 `seo` area, but `customHeadHtml` admin-only: enforce in the UI and add a mock rule: manager `PUT` with `customHeadHtml/customBodyEndHtml` changes → 403 (mock + docs + test)).
7. **Redirects page**: `MasterDataPage`-style `DataTable` (From, To, Type chip, Active switch, Hits, Note, Updated) with search/status filters; create/edit dialog (from path with `/` validation + uniqueness (409), to path/URL, type 301/302, active, note; loop/chain validation messages from the server 422); bulk activate/deactivate/delete; import dialog (paste CSV `fromPath,toPath,statusCode` or upload `.csv` → `redirectService.import({ rows })` → summary); export CSV (`downloadAuthenticated`); tester (input a path → `redirectService.resolve(path)` → shows the target or "No redirect"); "Nginx snippet" button → `nginxSnippet(rows)` → `location = /old { return 301 /new; }` lines in a copyable code block + download `redirects.nginx.conf`.
8. **Guide page**: `seoGuideContent.js` topics (≥ 18): how scoring works (bands, groups, weights from `WEIGHTS`), focus keyword strategy for Bengaluru real estate (locality + type + BHK patterns), titles (with `%variables%`), descriptions, slugs, content length per entity type, images/alt, internal linking (localities ↔ properties ↔ articles), external links, FAQs & FAQ schema, structured data explained (which types the site emits), local SEO (Google Business Profile, NAP consistency, locality pages), E-E-A-T (author pages), AI search readiness (llms.txt, robots allow-list, clear headings, answer-first paragraphs), page speed/Core Web Vitals, mobile, sitemaps/robots, redirects, measuring (GA4/GSC), publishing checklist; rendered as accordion cards with icons; no external placeholder domains; examples use SNA seed entities.
9. Delete `SeoGuidelines.jsx` and the placeholder; tests; format; update `docs/SEO_ENGINE.md` (dashboard/bulk semantics).

## 5. Data contract touched
Consumed: `GET /admin/seo/overview` (+ `duplicateOf` flags — mock change documented), `GET|PUT /admin/seo/settings` (+ manager 403 rule for custom HTML — mock change), `GET /admin/seo/llms-preview`, `/admin/redirects*` (`import`, `export`, `resolve`), entity `GET`/`PATCH { seo }` for every SEO entity type.

## 6. UI/UX requirements
Dashboard cards 6-up → 3 → 2; table dense with chips; dialog `maxWidth="lg"` full-screen on mobile; bulk progress dialog with a cancel button; settings tabs scrollable; monospace editors; guide accordions readable; keyboard accessible; manager read-only states clearly labelled.

## 7. Edge cases that must work
- Re-analyse with 60+ entities shows progress and can be cancelled (partial results persisted).
- Auto-generate never overwrites non-empty values unless "overwrite" is ticked; skipped counts reported.
- Duplicate detection ignores empty values.
- Redirect import with an invalid row → reported as skipped with the reason; loops rejected.
- Custom HTML tab hidden for manager; manager saving other tabs succeeds.
- Head preview updates live while typing templates.
- Sitemap "Open" links point to the API base (works on mock and production).

## 8. Acceptance criteria
- [ ] `/admin/seo` cards/table/dialog/bulk tools/duplicates/issues/export work against the seed (bulk re-analyse fills scores for all entities → chips show bands).
- [ ] `/admin/seo/settings` saves every field; robots restore/llms regenerate/head preview work; manager restrictions enforced (UI + mock).
- [ ] `/admin/seo/redirects` CRUD/import/export/tester/Nginx snippet work; `/admin/seo/guide` renders the SNA playbook; `SeoGuidelines.jsx` deleted.
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run test:mock`, `npm run smoke` pass; no console warnings.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run test:mock
npm run dev   (then) npm run smoke
```
Manual QA (desktop + 390 px): dashboard → Re-analyse all → cards populate; filter Poor → Edit SEO on one → fix → score improves in the table; Auto-generate missing (no overwrite) → missing descriptions filled; duplicates tab; issues tab "Fix"; settings → change the property template → head preview; restore robots; regenerate llms; redirects → create `/old-x → /properties` → tester resolves; import CSV; Nginx snippet; guide page reads well on mobile.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 37 report; Known issues: BUG-11 (SeoGuidelines) closed, additional defect 20 (AdminSeo) closed; Pending rewrites: none for SEO admin; next prompt: 38.
- `docs/DECISIONS.md`: D30, server-side duplicate flags, custom HTML admin-only enforcement, critical test list for Issues.

## 11. Commit
`git add -A && git commit -m "feat(seo): SEO dashboard with bulk tools, global SEO settings, redirects manager and SNA SEO playbook"`

## 12. Guardrails
- Do not touch: public `<Seo>` (38), `db.json`, `theme.js`, `global.css`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, placeholder domains, or HOM traces.
- Do not reduce or remove existing functionality (the legacy AdminSeo table/edit dialog/bulk auto-generate/guidelines all have successors).
