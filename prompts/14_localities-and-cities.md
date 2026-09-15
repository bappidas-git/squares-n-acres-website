# Prompt 14 — Localities and cities: admin CRUD (page-level with SEO placeholder) and public `/localities`, `/localities/:slug`

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §6.2 localities/cities, §5.14 localities rows, §8 UI kit, §9 `<Seo>` (placeholder until 38), §13 D13/D25), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–13 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
The mock serves `GET /localities` (filters `zone|isFeatured|q|cityId`, sort `order|name|propertyCount`, embeds `city`, `propertyCount`), `GET /localities/slug/:slug`, `GET /cities`, and admin CRUD (`/admin/localities` incl. `check-slug`, `bulk`, delete guard 409; `/admin/cities`). `MasterDataContext` exposes `localities` and `cities`. The old admin page `src/pages/admin/AdminNeighborhoods.js` (name/image/propertyCount/city/isActive dialog) reads localities through the adapter; the old public strip `ExploreLocalities.jsx` links to `/localities/<slug>` (404 today). The admin kit (`MasterDataPage`, `useForm`, `SlugField`, `ImageField`, `SortableList`) exists. Rich text is a textarea until prompt 32 (descriptions are HTML strings; render via the temporary `LegacyHtml` until `SafeHtml` exists in 32 — register in Pending rewrites). The listing engine (properties tabs on the locality page) arrives in **prompt 26**: this prompt renders a "Properties in <locality>" section with `propertyService.list({ localityId, perPage: 6 })` cards + a "View all" link to `/properties?localityId=<id>`; prompt 26 replaces it with the tabbed listing engine.

## 2. Objective
When this prompt is finished localities are a first-class module: admin `/admin/master-data/localities` (list with search/zone/featured filters, drag reorder, active/featured toggles, delete guard) and `/admin/master-data/localities/add|edit/:id` (page-level form: name, slug, city, zone, short description, description (HTML textarea for now), hero image, latitude/longitude with a map preview, pincodes (tags), highlights (list), connectivity (label/value repeater), avg price per sq ft, price trend note, featured/active, order, SEO placeholder card "SEO panel arrives in prompt 36"), `/admin/master-data/cities` (simple `MasterDataPage`), and the public pages `/localities` (index with zone filter, cards: image, name, zone chip, avg price, property count) and `/localities/:slug` (hero, guide content, highlights, connectivity table, price trend, properties section, FAQs (none yet), CTA lead form with source `locality-page`). `AdminNeighborhoods.js` is deleted.

## 3. Scope
### Files to create
- `src/pages/admin/master-data/LocalitiesPage.jsx`, `LocalityFormPage.jsx` (+ css), `CitiesPage.jsx`
- `src/pages/public/Localities.jsx` (+ css), `src/pages/public/LocalityDetail.jsx` (+ css)
- `src/components/sections/locality/LocalityHero.jsx`, `LocalityGuide.jsx`, `LocalityConnectivity.jsx`, `LocalityProperties.jsx` (temporary simple version), `LocalityCta.jsx`, `LocalityCard.jsx`
- `src/components/common/MapEmbed.jsx` (`{ latitude, longitude, zoom = 15, title }` → iframe `https://www.google.com/maps?q=<lat>,<lng>&z=<zoom>&output=embed`, lazy, with a placeholder when coords are missing; reused by property location, contact page, admin previews)
- Tests: `src/pages/public/__tests__/LocalityDetail.test.jsx` (renders guide sections from a fixture; hides empty ones), `src/components/sections/locality/__tests__/LocalityCard.test.jsx`
### Files to modify
- `src/routes/publicRoutes.js` (add `/localities`, `/localities/:slug`), `src/routes/adminRouteConfig.js` (localities/cities routes → real pages), `src/components/sections/home/ExploreLocalities.jsx` (card = `LocalityCard`), `docs/*`
### Files to delete
- `src/pages/admin/AdminNeighborhoods.js`
### May also touch
- import fixes; `src/config/rbac.js` labels if needed

## 4. Detailed tasks
1. **Admin list** (`LocalitiesPage` = `MasterDataPage` with `formMode: 'page'`): columns Image (thumb), Name (+ slug), Zone (`LOCALITY_ZONES.labelOf`), Avg ₹/sq ft, Properties (`propertyCount`), Featured (star toggle → `patch({ isFeatured })`), Active (switch), Updated; filters `q`, `zone`, `isFeatured`, `isActive`; sort `order|name|propertyCount|updatedAt`; drag reorder (`order` PATCH) when sorted by `order`; row actions Edit (→ form page), "View on site" (`/localities/<slug>`, new tab), Delete (guard). Bulk activate/deactivate/feature/unfeature/delete.
2. **Admin form page** (`LocalityFormPage`, `useForm` with `schemas.masterData.locality`): sections via `FormSection` — Basics (name, `SlugField` base `/localities/`, city select from `MasterDataContext.cities`, zone select, short description with 300-char counter, description textarea (HTML allowed; prompt 32 swaps in the editor), hero image `ImageField` hint `hero`), Location (latitude/longitude number fields with range validation + `MapEmbed` preview updating on blur; pincodes `MultiSelect creatable`), Content (highlights `SortableList` of text rows; connectivity repeater `{label, value}`; avg price per sq ft number with ₹ prefix; price trend note), Status (featured, active, order), SEO (placeholder card with the text "The SEO panel is added in prompt 36" — **not** a TODO comment: a visible `Alert` component). Actions: Save (create → navigate to edit), Save & view, Cancel; unsaved-changes guard; 422 mapping.
3. **Cities** (`CitiesPage` = `MasterDataPage` dialog mode): name, slug, state, active. Delete guard shows localities/properties using it.
4. **Public index `/localities`**: `PageHero`-style header (H1 "Localities in Bengaluru", intro from `settings.general.tagline`? — no: fixed copy "Explore neighbourhoods across Bengaluru: connectivity, prices and lifestyle at a glance."), zone chips filter (`?zone=` via `useApiList` `syncToUrl`), sort select (`name|propertyCount`), grid of `LocalityCard` (`LazyImage` ratio 4/3, name (H3), zone chip, "₹8,200/sq ft avg" when present, "24 properties", featured badge), skeleton grid, empty state, breadcrumbs Home › Localities, temporary Helmet title `Localities in Bengaluru | Squares N Acres` (replaced by `<Seo>` in 38).
5. **Public detail `/localities/:slug`**: `useApi(getBySlug)`; 404 → `NotFound` page (render the existing NotFound component inline with `status 404` semantics); layout: `LocalityHero` (image with overlay, H1 "Properties in Whitefield", zone, key stats row: avg price, properties count, pincodes), breadcrumbs Home › Localities › Whitefield, `LocalityGuide` (H2 "About Whitefield", `LegacyHtml` description, highlights list with check icons), `LocalityConnectivity` (H2 "Connectivity", two-column definition table), price trend note callout, `MapEmbed` when coords, `LocalityProperties` (H2 "Properties in Whitefield", 6 `PropertyCard`s from `propertyService.list({ localityId, perPage: 6, sort: 'relevance' })`, "View all N properties" → `/properties?localityId=<id>`; hidden when 0), `LocalityCta` (LeadForm with source `locality-page`, title "Looking for a home in Whitefield?", `requirement.localityId` prefilled — LeadForm gets a `hiddenFields` prop for that now; full unification in 28), `RecentlyViewed`? (not yet). Sections render only when data exists.
6. Home `ExploreLocalities` uses `LocalityCard` (compact variant) and links now resolve.
7. Tests as listed; `npm run format`.

## 5. Data contract touched
Consumed: `GET /localities`, `GET /localities/slug/:slug`, `GET /cities`, `GET /properties?localityId=&perPage=6`, `POST /leads` (source `locality-page`, `requirement.localityId`), admin `/admin/localities*`, `/admin/cities*`. No mock changes.

## 6. UI/UX requirements
Cards with fixed 4/3 image boxes and hover elevation; zone chips scrollable on mobile; detail hero 320 px (mobile 220 px) with `--color-overlay`; H1 once; definition table stacks on mobile; CTA form full-width on mobile; admin form two columns ≥ 900 with sticky action bar at the bottom on mobile; map preview 200 px tall.

## 7. Edge cases that must work
- Locality without image → card shows the monogram placeholder box; without coordinates → no map; without highlights/connectivity → those sections hidden.
- Inactive locality slug → 404 page (public); admin can still open it.
- Slug collision on create → server 409 → inline error under the slug with the suggestion.
- Deleting a locality used by properties → guard dialog listing property titles with links to their admin edit pages.
- `?zone=unknown` → treated as no filter.

## 8. Acceptance criteria
- [ ] Admin: create/edit/reorder/toggle/delete localities and cities work end-to-end against the mock (verify in the runtime db via `GET /api/admin/localities/<id>`).
- [ ] Public: `/localities` filters by zone via URL; `/localities/whitefield` renders hero, guide, connectivity, properties (6) + "View all", CTA; a lead submitted from the CTA appears in `/admin/leads` with source "Locality Page" and the locality in the requirement.
- [ ] `AdminNeighborhoods.js` deleted; `ExploreLocalities` links work.
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
Manual QA (desktop + 390 px): `/localities` → chip "East Bengaluru" → URL updates, grid filters; open Whitefield → sections; submit the CTA form → toast; `/admin/master-data/localities` → drag Whitefield to the top → reload → order persists; edit → change lat/lng → map preview moves; toggle featured → home strip updates after reload; `/admin/master-data/cities` → try deleting Bengaluru → guard dialog.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 14 report; Pending rewrites: "LocalityProperties simple version → tabbed engine in 26", "LegacyHtml in LocalityGuide → SafeHtml in 32", "Locality SEO placeholder card → panel in 36"; Known issues: BUG-10 (`?area=` link) closed; next prompt: 15.
- `docs/DECISIONS.md`: D13, D42 (MapEmbed without key).

## 11. Commit
`git add -A && git commit -m "feat(localities): admin CRUD pages and public locality index/detail"`

## 12. Guardrails
- Do not touch: property pages, mock server, `db.json`, `theme.js`, `global.css`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (every `AdminNeighborhoods` capability exists on the new page).
