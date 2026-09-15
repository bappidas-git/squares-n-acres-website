# Prompt 26 — Public listing engine and search: server-side filters, URL sync, category routes, global search, locality/builder tabs, shortlist page, listing SEO rules

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §5.7 filters/facets, §6.17 `PRICE_BUCKETS_*`/`BEDROOM_OPTIONS`/`SORT_OPTIONS`, §9.4 listing canonical rules, §13 D25/D68/D90/D92/D94), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–25 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
`src/pages/public/PropertyListing.jsx` (legacy) + `src/components/common/PropertyFilters.jsx` (legacy: `bhk|priceRange|locations|propertyType|status|developer|sort` URL params, `50000000-Infinity`, clear wipes all params) + five wrapper pages (`PreLaunch.js`, `UnderConstruction.js`, `ReadyToMove.js`, `RentApartments.js`, `RentVillas.js`) still run through the `legacyProperty.js` adapter with client-side sort/pagination. `NotFound.jsx` links `?search=`; `QuickActions.jsx` links `/properties?type=sale|rent|lease`; `HeroSection` navigates to `/properties?q=`. `useApiList` (URL sync, csv arrays), `PropertyCard` (new shape, shortlist heart), `ShortlistContext`, `RecentlyViewed`, `LocalityProperties` (temporary simple version, 14), `DeveloperProperties` (16), `PropertyCard`, `Pagination`, `EmptyState`, `BottomSheet`, `useBreakpoint`, `usePropertyTypes/useLocalities/useDevelopers/useAmenitiesGrouped/useBadgeMap` exist. The mock returns `meta.facets` and supports every §5.7 filter.

## 2. Objective
When this prompt is finished the listing is a single server-driven engine (`src/components/listing/ListingEngine.jsx`) used by every listing route: `/properties`, `/buy`, `/buy/pre-launch|under-construction|ready-to-move|resale`, `/buy/:propertyTypeSlug`, `/rent`, `/rent/:propertyTypeSlug`, `/lease`, `/commercial`, `/commercial/:propertyTypeSlug`, `/plots`, plus the locality (`/localities/:slug` tabs Buy/Rent) and builder (`/builders/:slug`) embeds; filters are URL-synced and shareable (desktop rail with live facet counts and Apply/Reset, mobile bottom sheet with "Show N results"), active-filter chips, sort, grid/list toggle (`sna_listing_view`), results count + H1 built from filters, pagination 12/page with `rel=prev/next`, skeleton grid, empty state with "widen search" suggestions; global search (hero, header icon, listing bar) uses `GET /properties/suggestions` with grouped results + recent searches; `/shortlist` page lists saved properties via `?ids=`; listing SEO rules (canonical/noindex per §9.4) are prepared as a pure function `listingSeo.js` consumed by the temporary Helmet now and by `<Seo>` in 38. `BUG-10` links are fixed. Legacy listing files and the adapter are deleted.

## 3. Scope
### Files to create
- `src/components/listing/ListingEngine.jsx` (+ css), `FilterRail.jsx`, `FilterSheet.jsx`, `FilterGroups.jsx` (shared group renderers), `ActiveFilters.jsx`, `SortSelect.jsx`, `ResultsHeader.jsx`, `ViewToggle.jsx`, `ListingGrid.jsx`, `ListingEmpty.jsx`, `useListingParams.js` (param ↔ URL serialisation + defaults + route pre-filters), `listingSeo.js` (`buildListingSeo({ routeConfig, params, meta })` → `{ title, description, h1, canonicalPath, noindex, intro }`), `listingRoutes.js` (route config table: path pattern → pre-filters, labels, copy, breadcrumbs, `resolveDynamicSlug(kind, slug, masterData)`)
- `src/components/common/GlobalSearch.jsx` (+ css) (input + suggestions popover; `sna_recent_searches` max 5; groups Localities/Properties/Property types/Developers; keyboard navigation; Enter → `/properties?q=`)
- `src/pages/public/PropertyListing.jsx` (rewritten: route component that resolves `listingRoutes` and renders the engine), `src/pages/public/Shortlist.jsx` (+ css)
- `src/utils/listingFilters.js` (`serializeFilters`, `parseFilters`, `countActiveFilters`, `widenSuggestions(params)` → remove the most restrictive filter first: price → area → amenities → bedrooms → constructionStatus → locality), `src/utils/__tests__/listingFilters.test.js`, `src/components/listing/__tests__/listingSeo.test.js`, `__tests__/ListingEngine.test.jsx` (fake service; facets counts; empty state)
### Files to modify
- `src/routes/publicRoutes.js` (all listing routes + `/shortlist`), `src/routes/paths.js`, `src/pages/public/LocalityDetail.jsx` (tabs Buy/Rent embedding `ListingEngine` with `embedded` mode + `fixedParams { localityId }`), `src/pages/public/BuilderDetail.jsx` (embedded engine with `developerId`), `src/components/sections/home/HeroSection.jsx` (uses `GlobalSearch` — full tabbed search in 27), `src/components/layout/Header.jsx`/`MobileDrawer` (search icon → `GlobalSearch` in a `Modal`), `src/components/layout/BottomNav.jsx` (Search → `/properties` opening the sheet via `?filters=open`; Shortlist → `/shortlist`), `src/pages/public/NotFound.jsx` (`?q=`), `src/components/sections/home/QuickActions.jsx` (links per D92), `docs/*`
### Files to delete
- `src/components/common/PropertyFilters.jsx` (+ css), `src/pages/public/PreLaunch.js`, `UnderConstruction.js`, `ReadyToMove.js`, `RentApartments.js`, `RentVillas.js`, `src/utils/adapters/legacyProperty.js`, `src/components/sections/locality/LocalityProperties.jsx` (temporary), `src/components/sections/developer/DeveloperProperties.jsx` (temporary)
### May also touch
- `src/hooks/useApiList.js` (facets in `meta`, `fixedParams` support)

## 4. Detailed tasks
1. **Params (`useListingParams`)**: URL keys exactly the API names (`listingType, segment, propertyTypeId, localityId, constructionStatus, availability, bedrooms, minPrice, maxPrice, minArea, maxArea, areaUnit, furnishing, facing, developerId, amenityIds, badgeIds, isFeatured, reraRegistered, possessionBy, q, ids, sort, page, perPage`); csv arrays; numbers; booleans; defaults omitted (`sort=relevance`, `page=1`, `perPage=12`); route pre-filters are **fixed** (not in the URL, not removable, shown as a locked chip); `fixedParams` merged on every request.
2. **Route table (`listingRoutes.js`)** — entries with `path`, `fixed`, `h1`, `intro`, `breadcrumbs`: `/properties` (none; H1 "Properties in Bengaluru"), `/buy` (`listingType: sale`; "Properties for sale in Bengaluru"), `/buy/pre-launch|under-construction|ready-to-move|resale` (`listingType: sale, constructionStatus`), `/buy/:slug` → property type (`listingType: sale, propertyTypeId` resolved from `propertyTypes.bySlug`), `/rent` (`listingType: rent`), `/rent/:slug` (type), `/lease` (`listingType: lease`), `/commercial` (`segment: commercial`), `/commercial/:slug` (segment + type), `/plots` (`segment: land`). Resolution order for `/buy/:slug` and `/rent/:slug`: status slugs first, then property-type slugs, else 404 (D25). `/rent/apartments` and `/rent/villas` therefore keep working (types `apartments`, `villas`).
3. **Engine** (`ListingEngine({ routeConfig, fixedParams, embedded, initialSort })`): `useApiList(propertyService.list, { syncToUrl: !embedded, fixedParams })`; layout: desktop = left `FilterRail` (280 px, sticky, groups: Listing type (when not fixed), Property type (from facets `propertyType` with counts, checkboxes), Locality (searchable checkbox list with counts), Budget (`PRICE_BUCKETS_SALE` or `_RENT` per listing type as radio-like buckets → `minPrice/maxPrice`; custom min/max inputs), Bedrooms (chips 1–5+), Construction status (checkbox with counts), Area (min/max + unit), Furnishing, Facing, Amenities (searchable checkboxes; "all must match" hint), Badges, Toggles (Featured, RERA registered), Possession by (month input)); Apply/Reset sticky footer on the rail (desktop applies live on change with a 300 ms debounce **and** keeps the buttons for explicitness — decision: live apply + "Reset"; the Apply button exists only in the mobile sheet); right = `ResultsHeader` (H1 from `listingSeo.h1`, "128 properties", `SortSelect` (`SORT_OPTIONS`), `ViewToggle` grid/list persisted in `sna_listing_view`, "Filters (3)" button on mobile), `ActiveFilters` chips (label from enums/master data; remove one; clear all keeps fixed params), `ListingGrid` (3/2/1 columns; list view = `PropertyCard variant="list"` with highlights), `Pagination` with `rel=prev/next` (`listingSeo.canonicalPath` + `?page=`), skeleton grid 12, `ListingEmpty` ("No properties match" + chips suggesting which filter to remove via `widenSuggestions` + "View all in <locality>" when a locality filter is set + "Clear all filters"), `RecentlyViewed` strip below (non-embedded only). Mobile: `FilterSheet` (bottom sheet, same groups in accordions, footer "Show N results" using a debounced count request `propertyService.list({ ...draft, perPage: 1 })` → `meta.total`, "Reset"); opens when `?filters=open` (BottomNav Search).
4. **Global search** (`GlobalSearch`): debounced 300 ms `propertyService.suggestions(q)` (≥ 2 chars), groups with icons, keyboard (arrows/Enter/Escape), recent searches from `sna_recent_searches` when the input is empty/focused, "Search for '<q>'" row → `/properties?q=`; selecting a locality → `/localities/<slug>`, property → details, type → `/buy/<slug>` (or `/rent/<slug>` when the current route is rent), developer → `/builders/<slug>`; used in the header (icon → `Modal` with autofocus), the hero (27 extends it) and the listing results header (compact); `track('search', { q })`.
5. **Shortlist page** (`/shortlist`): ids from `ShortlistContext` → `propertyService.list({ ids, perPage: 100 })` (respects `ids` order); cards with remove; empty state "Your shortlist is empty — Browse properties"; share (copy link `?ids=` → the page also reads `?ids=` for shared links and offers "Save all"); temporary Helmet `noindex`.
6. **Locality/builder embeds**: `LocalityDetail` tabs "Buy" / "Rent" (`ListingEngine embedded fixedParams={{ localityId, listingType }}` with its own URL param namespace? — embedded mode does **not** sync to the URL except `page` via `?p=`); hide a tab when its count is 0 (use `facets`/a count request); `BuilderDetail` embeds with `developerId`.
7. **SEO rules (`listingSeo.js`)**: per §9.4 — canonical path from fixed params + index-worthy params in order; `noindex` when any non-index-worthy param is present or `page > 1 && seoSettings.noindex.paginatedListings`; `title`/`description` from `seoSettings.titleTemplates.listing` variables (`%propertytype% %listingtype% in %locality%, %city% – %count% Listings`) with graceful fallbacks ("Properties for sale in Whitefield, Bengaluru – 24 listings"); `h1` similar without the site name; `intro` = locality `shortDescription` when a single locality is fixed/selected; unit-tested. The page renders a temporary Helmet from it (replaced by `<Seo type="listing">` in 38).
8. **Links fixed:** `NotFound` → `/properties?q=`; `QuickActions` → routes (D92); header "Buy/Rent" menus still hardcoded (27); `ExploreLocalities` → `/localities/<slug>` (done in 14).
9. Delete legacy files and the adapter; ensure `grep -rn "legacyProperty\|PropertyFilters" src` → 0; tests; format.

## 5. Data contract touched
Consumed: `GET /properties` (all filters, facets), `GET /properties/suggestions`, `GET /properties?ids=`. Storage: `sna_listing_view`, `sna_recent_searches`, `sna_shortlist`.

## 6. UI/UX requirements
Rail groups collapsible with counts; chips 36 px; sheet with sticky footer; results header wraps on mobile; grid cards equal height; list cards horizontal ≥ 900 px; pagination centred; empty state helpful; H1 once; no horizontal scroll at 360 px; skeletons identical; reduced motion.

## 7. Edge cases that must work
- `/buy/villas` → property type; `/buy/resale` → status; `/buy/unknown` → 404.
- `?bedrooms=5` shows 5+ (chips highlight "5+"); `?minPrice=abc` ignored.
- Removing the locality chip on `/localities/whitefield` is impossible (fixed) — the chip shows a lock.
- Rent listing budget buckets switch to `PRICE_BUCKETS_RENT` when `listingType=rent|lease`; changing listing type clears price params.
- Facet counts reflect the other filters (e.g. selecting Whitefield updates property-type counts).
- Shared URL with 6 filters restores the rail state exactly; back/forward navigation restores state.
- Shortlist with a deleted property id → silently skipped; `?ids=` sharing works logged-out.

## 8. Acceptance criteria
- [ ] Every listing route resolves per the route table; filters/sort/page are URL-synced; facets shown; grid/list persisted; empty state suggestions work; pagination adds `rel=prev/next`.
- [ ] Global search suggestions + recent searches work from header, listing and hero; NotFound/QuickActions links fixed.
- [ ] Locality Buy/Rent tabs and builder projects use the engine; `/shortlist` works incl. `?ids=` share.
- [ ] Legacy listing/filter/wrapper files and `legacyProperty.js` deleted; `listingSeo` tests pass.
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
Manual QA (desktop + 390 px): `/properties` → Whitefield + 3 BHK + ₹1–1.5 Cr → URL, counts, chips → sort price desc → page 2 → reload restores; remove locality chip; `/rent/apartments` → rent buckets; mobile sheet → "Show N results"; header search "hebbal" → locality suggestion; NotFound search → `?q=`; `/localities/whitefield` tabs; `/builders/aurelia-estates` projects; shortlist two properties → `/shortlist` → share link in a private window shows them.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 26 report; Known issues: BUG-10, BUG-19 closed, additional defects 10, 11 closed; Pending rewrites: remove adapter entries, "listing Helmet → `<Seo>` (38)", "hero tabbed search (27)"; next prompt: 27.
- `docs/DECISIONS.md`: D25, D68, D90, D92, D94, live-apply desktop decision, embedded `?p=` decision.

## 11. Commit
`git add -A && git commit -m "feat(listing): server-driven listing engine with URL-synced filters, facets, category routes, global search and shortlist"`

## 12. Guardrails
- Do not touch: admin, mock server, `db.json`, `theme.js`, `global.css`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (every legacy filter — BHK, price, locations, type, status, developer, sort, search — exists in the new engine).
