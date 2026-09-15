# Prompt 16 — Developers (builders): admin CRUD page and public `/builders`, `/builders/:slug`

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §6.5 developers, §5.14 developers rows, §9.3 (Organization JSON-LD — placeholder until 38), §13 D65), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–15 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
The mock serves `GET /developers` (filters `isFeatured|q`, `propertyCount`), `GET /developers/slug/:slug`, admin CRUD with `check-slug`, `bulk`, delete guard. Seed has 8 fictional developers (`aurelia-estates` first). The property form's legacy `DeveloperTab.jsx` edits a free-text developer (rewritten in 20 to a select + quick-create). `LocalityFormPage` (prompt 14) is the pattern for page-level master-data forms. `BuilderOverview.jsx` (property section) reads `developerInfo` via the adapter (rewritten in 24). The admin route `/admin/master-data/developers` renders a placeholder.

## 2. Objective
When this prompt is finished developers are manageable at `/admin/master-data/developers` (list + page-level form with logo/cover/description/stats/RERA ids/highlights/featured/active/order + SEO placeholder) and public at `/builders` (index cards: logo, name, projects count, featured) and `/builders/:slug` (cover, logo, name, short description, stats row (established, total/ongoing/completed), RERA ids, highlights, description, all active properties of the developer in a grid with a "View all" link, CTA lead form source `developer-page`). The home "Top builders" row (prompt 27) and the property "About the builder" section (24) will reuse `DeveloperCard`/`DeveloperStats`.

## 3. Scope
### Files to create
- `src/pages/admin/master-data/DevelopersPage.jsx`, `DeveloperFormPage.jsx` (+ css)
- `src/pages/public/Builders.jsx` (+ css), `src/pages/public/BuilderDetail.jsx` (+ css)
- `src/components/sections/developer/DeveloperCard.jsx`, `DeveloperHero.jsx`, `DeveloperStats.jsx`, `DeveloperProperties.jsx`, `DeveloperCta.jsx`
- Tests: `src/components/sections/developer/__tests__/DeveloperCard.test.jsx`, `src/pages/public/__tests__/BuilderDetail.test.jsx`
### Files to modify
- `src/routes/publicRoutes.js` (`/builders`, `/builders/:slug`), `src/routes/adminRouteConfig.js`, `src/routes/paths.js` (already has `builders`/`builder(slug)` — verify), `docs/*`
### Files to delete
- none
### May also touch
- import fixes

## 4. Detailed tasks
1. **Admin list** (`MasterDataPage`, `formMode: 'page'`): columns Logo, Name (+ slug, headquarters), Projects (`propertyCount`), Established, Featured (star), Active (switch), Updated; filters `q`, `isFeatured`, `isActive`; sort `order|name|propertyCount|updatedAt`; reorder; row actions Edit, View on site, Delete (guard lists properties).
2. **Admin form page** (`useForm`, `schemas.masterData.developer`): Basics (name, `SlugField` base `/builders/`, short description ≤ 300, description textarea (HTML; editor in 32), logo `ImageField` hint `logo`, cover `ImageField` hint `hero`), Facts (established year 1950–current, headquarters, website url, total/ongoing/completed projects numbers with the rule `ongoing + completed ≤ total` (client warning, not blocker), RERA ids `MultiSelect creatable`), Highlights (`SortableList` text rows), Status (featured, active, order), SEO placeholder `Alert` (prompt 36). Save / Save & view / Cancel; unsaved guard; 422 mapping.
3. **Public `/builders`**: H1 "Builders and developers in Bengaluru", intro copy, sort select (`name|propertyCount`), search field (`?q=` synced), grid of `DeveloperCard` (logo in a white box with `object-fit: contain`, name (H3), "12 projects", featured badge, short description clamped to 2 lines), skeletons, empty state, breadcrumbs Home › Builders, temporary Helmet title.
4. **Public `/builders/:slug`**: `useApi(getBySlug)`; 404 handling; `DeveloperHero` (cover with overlay, logo box, H1 name, headquarters, website link `rel="noopener nofollow"`), breadcrumbs Home › Builders › Name, `DeveloperStats` (`StatCard`s with `useCountUp`: Established, Total projects, Ongoing, Completed — each only when present; RERA ids as chips), description (`LegacyHtml` → `SafeHtml` in 32) + highlights, `DeveloperProperties` (H2 "Projects by <name>", `propertyService.list({ developerId, perPage: 12 })` grid + "View all" → `/properties?developerId=<id>`; hidden when 0), `DeveloperCta` (LeadForm source `developer-page`, hidden field `meta.developerId`? — use `pageSlug` = `/builders/<slug>` and `message` prefix "Interested in projects by <name>"), sections only when data.
5. Property form quick-create hook: expose `developerService.quickCreate({ name })` in `masterDataService.developers.create` usage later (prompt 20) — nothing to do here except ensuring `POST /admin/developers` accepts a minimal body (`name` only → slug auto, defaults) — verify against the mock; if the schema requires more, relax `shortDescription`/`description` to optional (update `models.js`, `schemas/masterData.js`, seed validator, docs) — record the decision.
6. Tests; format.

## 5. Data contract touched
Consumed: `GET /developers`, `GET /developers/slug/:slug`, `GET /properties?developerId=`, `POST /leads` (`developer-page`), admin `/admin/developers*`. Possible schema relaxation for minimal developer creation (documented).

## 6. UI/UX requirements
Logo boxes 120×60 with padding on white; cover hero 280 px (mobile 200 px); stats row wraps to 2×2 on mobile; property grid 3/2/1 columns; CTA card on surface; admin form two columns with a sticky bottom action bar on mobile.

## 7. Edge cases that must work
- Developer without cover → hero uses `--color-charcoal` background with the logo box; without logo → monogram placeholder.
- Zero active properties → the projects section is hidden and the index card shows "0 projects" (still listed) — decision: hide developers with 0 active properties **only** when `isFeatured` is false? No — list all active developers; show the count.
- Slug/404 as in localities.
- `website` without protocol entered in admin → validation asks for `https://`.

## 8. Acceptance criteria
- [ ] Admin developers list/form/reorder/toggle/delete-guard work; minimal create (`name` only) succeeds.
- [ ] `/builders` and `/builders/aurelia-estates` render per task 3–4; CTA lead lands in admin with source "Developer Page".
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run smoke` (+ `test:mock` if the schema changed) pass; no console warnings.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run dev   (then) npm run smoke
```
Manual QA (desktop + 390 px): create developer "Test Builders" with logo URL, mark featured, open `/builders` → appears; open its page → stats hidden (no numbers), CTA works; delete it → allowed (no properties); try deleting `aurelia-estates` → guard.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 16 report; Pending rewrites: "DeveloperHero description LegacyHtml → SafeHtml (32)", "Developer SEO placeholder → panel (36)"; next prompt: 17.
- `docs/DECISIONS.md`: D65, minimal-create relaxation (if applied), index listing rule.

## 11. Commit
`git add -A && git commit -m "feat(developers): admin CRUD page and public builders index/detail"`

## 12. Guardrails
- Do not touch: property form/detail beyond nothing, `theme.js`, `global.css`, `db.json` (schema relaxation only in models/schemas if needed).
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality.
