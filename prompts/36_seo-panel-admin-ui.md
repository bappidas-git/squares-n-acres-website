# Prompt 36 — SEO panel (admin UI): General / Social / Advanced / Schema tabs, live analysis, previews, wired into property, article, page, locality, developer, category, author and property-type forms; score chips in lists

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §9.1–§9.6, the master spec SEO-02/SEO-05/SEO-10/SEO-11/SEO-13/SEO-22 restated below, §13 D34/D87), then `docs/PROJECT_STATE.md`, `docs/DECISIONS.md` and `docs/SEO_ENGINE.md`.
- Confirm prerequisites: prompts 01–35 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
`src/seo/` provides `analyze`, `suggestKeywords`, `generateDefaults`, `resolveTemplate`, `buildVariables`, `listVariables`, `titleWidth/descriptionWidth/truncateToWidth`, `schema.parseCustom/validate`, `urls.publicPathFor/canonicalFor`. Forms with SEO placeholders: property form tab 16 (`SeoPlaceholderTab`), article form (rail card), page form, locality/developer form pages, category/author/property-type dialogs (`MasterDataPage` `seoPanel: false`). `SeoScoreChip` exists (22). `seoService.overview({ type, perPage: 'all' })` returns rows for uniqueness checks; `seoService.settings()` (public) / `adminSettings()` give templates and `siteUrl`; `redirectService.admin*` exists for the Advanced tab redirect. Entities save `seo` through their forms (PUT) or `PATCH { seo }`.

## 2. Objective
When this prompt is finished `src/components/seo/SeoPanel/` is the RankMath-class panel: entity-type aware; **General** (focus keyword + up to 4 secondary chips with suggestions and "Use", snippet editor (SEO title with a variable-insert menu + char/pixel meters + colour states, permalink/slug editor with availability check, meta description with meters), live Google preview (desktop/mobile toggle, favicon, breadcrumb-style URL, truncation, date for articles), score card (big number + band + "N of M tests passed") with four accordion groups listing pass/warn/fail/skip rows with fix hints that focus the related field/tab (`onFocusField(path)`)), **Social** (OG title/description/image with "Use default", Twitter card type + fields, Facebook/LinkedIn and X previews, 1200×630 hint, auto `og:type`), **Advanced** (robots meta toggles incl. max-snippet/image/video preview, canonical override (default auto), breadcrumb title, redirect (enable + type + target → creates/updates a `redirects` record on save via `redirectService`), sitemap include/priority/changefreq overrides, "last modified", primary category (articles), read-only "Resolved values" box), **Schema** (auto type select from `SEO_SCHEMA_TYPES` per entity, custom JSON textarea with validation + errors, disabled auto types checklist, preview of the resolved graph); analysis re-runs on every change with a 400 ms debounce and writes `seo.score/scoreBand/testsPassed/testsTotal/analysis/lastAnalyzedAt` into the entity state; the panel is mounted in every form listed above (`variant="full"` for property/article/page, `variant="compact"` for locality/developer/category/author/property-type) and saves through the host form (PUT) or standalone `PATCH { seo }` when used in a dialog (37); lists show `SeoScoreChip` (properties already; add articles/pages/localities/developers); "Fix SEO" jump buttons in the property/article rails.

## 3. Scope
### Files to create
- `src/components/seo/SeoPanel/SeoPanel.jsx` (+ css), `useSeoAnalysis.js` (debounced `analyze` with `context` = `{ siteIndex, seoSettings, banksAvailable }`), `SeoPanelContext.js`, `tabs/GeneralTab.jsx`, `tabs/SocialTab.jsx`, `tabs/AdvancedTab.jsx`, `tabs/SchemaTab.jsx`, `parts/FocusKeywordField.jsx`, `parts/SnippetEditor.jsx`, `parts/VariableMenu.jsx`, `parts/SeoMeter.jsx`, `parts/GooglePreview.jsx`, `parts/SocialPreview.jsx`, `parts/ScoreCard.jsx`, `parts/TestList.jsx`, `parts/RobotsFields.jsx`, `parts/RedirectFields.jsx`, `parts/SitemapFields.jsx`, `parts/ResolvedValues.jsx`, `parts/SchemaEditor.jsx`, `SeoSummaryCard.jsx` (rail summary: score chip + "Fix SEO" button), `useSiteSeoIndex.js` (loads `seoService.overview({ perPage: 'all' })` once per admin session, refreshes after saves)
- Tests: `src/components/seo/SeoPanel/__tests__/SeoPanel.test.jsx` (analysis updates on change; hint click calls `onFocusField`; variable insert; skip rows hidden count), `SnippetEditor.test.jsx` (meters/colours), `SchemaEditor.test.jsx` (invalid JSON error)
### Files to modify
- Property form: `tabs/SeoTab.jsx` (replaces `SeoPlaceholderTab.jsx`), `StatusRail.jsx` (`SeoSummaryCard`), `toPayload.js` (pass `seo` through incl. analysis), `validators/property.js` (`seo.title` ≤ 70 warn only), `usePropertyForm.js` (`focusField(path)` → tab jump); Article form (`ArticleFormPage`: SEO tab via `AdminTabs` + rail summary), `PageFormPage`, `LocalityFormPage`, `DeveloperFormPage` (panel sections), `MasterDataForm.jsx` (`seoPanel: 'compact'` config → renders the panel in dialog/page forms), `contentConfigs.js`/`masterDataConfigs.js`/`taxonomyConfigs.js` (enable for categories, authors, property types), list columns for articles/pages/localities/developers (`SeoScoreChip`), `docs/*`
### Files to delete
- `src/pages/admin/properties/property-form/tabs/SeoPlaceholderTab.jsx`, every "SEO placeholder card" `Alert` in forms
### May also touch
- `src/services/redirectService.js` (`upsertByFromPath`)

## 4. Detailed tasks
1. **Panel contract:** `<SeoPanel entityType entity seo onChange(seoPatch) onFocusField(path) variant siteUrl seoSettings context />`; internal state mirrors `seo`; every edit calls `onChange` with the patch merged into the host form (`setField('seo', …)`); `useSeoAnalysis` recomputes on `[entity, seo]` (debounced 400 ms) and calls `onChange({ score, scoreBand, testsPassed, testsTotal, analysis, lastAnalyzedAt })` only when values change (avoid loops).
2. **General tab** per the objective: keyword suggestions from `suggestKeywords(entityType, entity)` (chips with "Use"); secondary keywords chips (max 4, creatable); `SnippetEditor` title field with `VariableMenu` (inserts `%variable%` at the caret; shows the resolved preview), meters (chars + px with thresholds → muted/success/warning/error), slug field (`SlugField` bound to the entity slug — D34: editing here updates the entity slug too), description with meters + "Generate" (from `generateDefaults`); `GooglePreview` (desktop 600 px / mobile 380 px frames; favicon = monogram; URL breadcrumb style `squaresnacres.com › properties › slug`; title truncated by pixels with "…"; date prefix for articles); `ScoreCard` (number, band colour, tests passed, "Re-analyse" button, "Auto-fill missing" → `generateDefaults` without overwrite) and `TestList` groups (Basic SEO, Additional, Title readability, Content readability) with counts per status, rows with icon/status/message/hint; clicking a hint → `onFocusField(field)` (the host form switches tab and focuses).
3. **Social tab**: OG fields with "Use default" (fills from title/description/cover), image `ImageField` hint `og`; Twitter card select + fields; previews (Facebook/LinkedIn card 500×261 image area, X summary_large_image card); `og:type` shown read-only.
4. **Advanced tab**: `RobotsFields` (index/follow switches, noarchive, nosnippet, noimageindex, max-snippet number, max-image-preview select none/standard/large, max-video-preview), canonical override (URL; "Auto" shows the computed canonical), breadcrumb title, `RedirectFields` (enable, type 301/302, target path/URL; on host save the panel exposes `getRedirectPayload()` → the host form calls `redirectService.upsertByFromPath({ fromPath: publicPath, toPath, statusCode, isActive: enabled })` after the entity save — implement in each host form's save flow via a shared `applySeoSideEffects(seo, entityType, entity)` helper in `src/components/seo/seoSideEffects.js`), `SitemapFields` (include, priority 0–1 step 0.1, changefreq select), last modified (read-only `updatedAt`), primary category (articles: select among assigned categories — single category only, so read-only display), `ResolvedValues` (title after template, description, canonical, robots string, OG tags, computed from the same resolvers the public `<Seo>` will use — export `resolveSeoOutput(entityType, entity, seoSettings)` from `src/seo/resolve.js` (create now; `<Seo>` in 38 uses it)).
5. **Schema tab**: type select (`auto` + allowed types per entity), `SchemaEditor` (textarea monospace, "Validate", errors list, "Format JSON"), disabled auto types checklist (from the generated node types), graph preview (`schema.buildGraph(entityType, entity, seoSettings)` — add to `src/seo/schema/index.js` if missing) as read-only JSON.
6. **Hosts**: property tab 16 = full panel; `StatusRail` gets `SeoSummaryCard` (score chip, "Fix SEO" → tab 16 + focus first failing field); article form gets an "SEO" tab (`AdminTabs`: Content / SEO) + rail summary; page form: SEO section below blocks (full); locality/developer pages: compact panel section; `MasterDataForm` with `seoPanel: 'compact'` for categories/authors/property types; `focusField` implementations map `seo.*` to the panel, `content` → editor focus, `images` → media tab, `faqs` → FAQ tab, etc.
7. **Lists**: `SeoScoreChip` column in articles, pages, localities, developers lists (+ existing properties); filter `seoScoreBand` where the endpoint supports it (properties only now; others via client column only).
8. **Site index**: `useSiteSeoIndex` (cached rows for uniqueness tests; refreshed after any save through a small event bus `src/utils/events.js` `emit('seo:changed')`).
9. Tests; format; delete placeholders.

## 5. Data contract touched
Consumed: `GET /admin/seo/overview?perPage=all`, `GET /seo/settings`, `GET /admin/redirects` + `POST|PATCH /admin/redirects` (upsert), entity PUT/PATCH with `seo` (all forms). No mock changes expected (verify `redirects` upsert can be done via list+create/patch; if a `fromPath` lookup is missing add `GET /admin/redirects?fromPath=` filter to the mock + registry).

## 6. UI/UX requirements
Panel tabs as `AdminTabs`; meters as thin bars with labels ("52 chars · 480 px · Good"); previews inside bordered frames with the actual fonts (Arial 20/14 px); score card with a circular gauge (tones); test rows with status icons and readable hints; compact variant = General (keyword/title/description/preview + score) + Social collapsed; mobile: single column, previews scaled; keyboard accessible; no layout shift while analysing (skeleton rows only on first run).

## 7. Edge cases that must work
- New entity without slug/title → panel works with empty values and suggestions from partial data.
- Focus keyword uniqueness against the site index excludes the entity itself.
- Variable insertion into an empty title yields the template; preview resolves `%locality%` from the current form values (not saved ones).
- Custom schema JSON invalid → save allowed? — **no**: the host form blocks save with a field error `seo.schema.custom` until valid or empty.
- Redirect enabled with an empty target → validation error; disabling deletes/deactivates the redirect record.
- Analysis cost: property with 20 images and long HTML analyses < 100 ms (no UI jank; measured with `performance.now()` in a test).

## 8. Acceptance criteria
- [ ] Panel implements every field/test/preview of SEO-05…SEO-13 for all listed entity types; saves persist `seo` incl. `score/analysis` (verify JSON in the mock).
- [ ] Hint → field focus works in the property and article forms; redirect side effect creates a redirect; `resolveSeoOutput` matches the Resolved values box.
- [ ] `SeoScoreChip` in all lists; placeholders removed.
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run smoke` (+ `test:mock` if the redirects filter was added) pass; no console warnings.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run dev   (then) npm run smoke
```
Manual QA (desktop + 390 px): property 1 → SEO tab → set focus keyword "3 bhk apartment in whitefield" → score updates; click a failing hint → jumps to the tab; insert `%price%` into the title → preview shows "₹1.42 Cr"; Social "Use default"; Advanced → enable redirect from `/old-lakeview` → Save → `/admin/seo/redirects` (37) / `GET /api/redirects` shows it; Schema → invalid JSON → save blocked; article form SEO tab; locality compact panel; lists show score chips.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 36 report; Pending rewrites: remove every "SEO placeholder → panel" entry; Known issues: additional defect 22 (SeoTagsTab) closed; next prompt: 37.
- `docs/DECISIONS.md`: D34, D87, custom-schema blocking rule, side-effects helper.

## 11. Commit
`git add -A && git commit -m "feat(seo): RankMath-class SEO panel with live analysis, previews, social/advanced/schema tabs wired into all entity forms"`

## 12. Guardrails
- Do not touch: public `<Seo>` (38), mock server (except the optional redirects filter), `db.json`, `theme.js`, `global.css`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (every legacy SeoTagsTab/AdminSeo dialog field exists in the panel: keywords, canonical, OG, Twitter, schema).
