# Prompt 27 — Home page: data-driven sections, tabbed hero search, category tiles with counts, rows, CMS-driven "why/how" blocks, header/footer navigation from data

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially the master spec HOME-01…HOME-06 and UX-04/UX-05/UX-06 restated below, §6.13 `hero/navigation/footer`, §13 D52/D79/D81/D82/D92), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–26 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
`src/pages/public/Home.jsx` renders `HeroSection` (settings-driven media + `GlobalSearch`), `QuickActions` (3 static tiles → routes), `WhyChoose` (hardcoded 4 features), `HowItWorks` (hardcoded 4 steps), `FeaturedProperties` (rAF marquee; `propertyService.featured()`), `ExploreLocalities`, `FaqSection`, `PartnersSection`, `TrendingTopics`. Header/MobileDrawer/BottomNav/Footer still use hardcoded nav data (Header and MobileHeader duplicate `navItems`; footer columns from settings since 11). `pageService.bySlug('home')` returns the CMS `home` page with `features` and `steps` blocks (seed 10); the CMS renderer arrives in 30 — this prompt renders those two block types with two small components that prompt 30 moves into `components/cms/blocks/` (register as pending). `TestimonialsSection`, `DeveloperCard`, `LocalityCard`, `Carousel`, `StatCard`, `useCountUp`, `usePropertyTypes`, `useLocalities`, `useDevelopers`, `ListingEngine` route table (`listingRoutes.js`) exist. `LeadModalTemp` exists (28 replaces it with `LeadCaptureModal`).

## 2. Objective
When this prompt is finished the home page is fully data-driven and matches HOME-01…HOME-06: tabbed hero search (tabs from `settings.hero.searchTabs`, locality/keyword autocomplete via `GlobalSearch`, property-type select, budget select per listing type, BHK chips for residential → navigates to the listing route with params), trust badges row and stats row (only when present), category tiles with live counts (`GET /properties?perPage=1&…` → `meta.total`, cached 5 min in memory), property rows (Featured, New launches (`constructionStatus=pre-launch,under-construction`, `sort=newest`), Ready-to-move picks, Rentals) each rendered only with ≥ 3 results and with "View all" links carrying the filter, Explore localities (featured), Browse by property type (icons + counts from facets? — use the cached count map), Top builders (featured developers), Why choose us / How it works from the `home` CMS page blocks, Testimonials (featured), Latest insights (3 articles), FAQs (home), Partners, CTA band ("Looking to sell or let your property?" → `/sell-let`), Newsletter. Header navigation is built from data (Buy mega-menu: by status, by residential type, by budget, popular localities; Rent; Commercial; Plots; Localities; Builders; Buyer Assistance pages; Insights; Company pages; Contact) with settings-driven right-side actions (phone, WhatsApp, "Post Requirement" CTA → lead modal `post-requirement`), mobile drawer with accordions, no "Sign In"; footer columns from settings + auto columns (Buy by type, Popular localities, Insights, Company); BottomNav = Home, Search, Shortlist (badge), Enquire (lead modal), Menu.

## 3. Scope
### Files to create
- `src/components/sections/home/HeroSearch.jsx` (+ css), `CategoryTiles.jsx`, `PropertyRow.jsx` (generic row with title/subtitle/"View all"/carousel), `PropertyTypeGrid.jsx`, `TopBuilders.jsx`, `HomeFeatures.jsx` (temporary block renderer for `features`), `HomeSteps.jsx` (temporary for `steps`), `LatestInsights.jsx`, `CtaBand.jsx`, `useCategoryCounts.js` (count map with in-memory cache)
- `src/config/navigation.js` (builders: `buildHeaderNav({ propertyTypes, localities, pages, settings })`, `buildFooterColumns(...)`, `buildBottomNav()`), `src/components/layout/MegaMenu.jsx` (+ css), `src/components/layout/MobileDrawer.jsx` (+ css) (replaces `MobileHeader` drawer)
- Tests: `src/config/__tests__/navigation.test.js`, `src/components/sections/home/__tests__/HeroSearch.test.jsx` (tab switch changes budget buckets; submit builds the URL), `__tests__/PropertyRow.test.jsx` (hidden below 3 items)
### Files to modify
- `src/pages/public/Home.jsx`, `HeroSection.jsx` (composition with `HeroSearch`), `QuickActions.jsx` → replaced by `CategoryTiles`, `FeaturedProperties.jsx` → replaced by `PropertyRow`, `WhyChoose.jsx`/`HowItWorks.jsx` → deleted (CMS), `src/components/layout/Header.jsx` (+ css), `MobileHeader.jsx` (→ uses `MobileDrawer`), `BottomNav.jsx`, `Footer.jsx`, `docs/*`
### Files to delete
- `QuickActions.jsx`, `WhyChoose.jsx`, `HowItWorks.jsx`, `FeaturedProperties.jsx` (+ css), `TrendingTopics.jsx` (→ `LatestInsights`)
### May also touch
- `src/pages/public/CmsPage` does not exist yet — not needed here

## 4. Detailed tasks
1. **Hero search** (`HeroSearch`): tabs from `settings.hero.searchTabs` (`HERO_SEARCH_TABS` labels; default all five); fields per tab — Buy/Rent/Lease: locality/keyword (`GlobalSearch` inline variant: selecting a locality stores `localityId`, free text stores `q`), property type (`usePropertyTypes({ segment: residential })` for Buy/Rent; all for Lease), budget (`PRICE_BUCKETS_SALE` for Buy, `_RENT` for Rent/Lease), BHK chips (1–5+; residential only); Commercial: keyword, type (commercial segment), budget (sale buckets + toggle Buy/Lease); Plots: keyword, type (land), budget; submit → `navigate(PATHS.listingFor(tab) + '?' + serializeFilters(...))` (`/buy`, `/rent`, `/lease`, `/commercial`, `/plots`) and `track('search', {...})`; `hero-search` lead source is **not** used for searches (searching is not a lead). Trust badges row (`settings.hero.badges`, e.g. "RERA-registered listings") and stats row (`settings.hero.stats` with `useCountUp`) render only when arrays are non-empty. Background media (image/video/mobile image) with `--color-overlay`; H1 = `settings.hero.title`.
2. **Category tiles**: config list `[Ready to move (`/buy/ready-to-move`), Under construction, New launch (`/buy/pre-launch`), Plots (`/plots`), Rent (`/rent`), Commercial (`/commercial`)]` with icons; counts via `useCategoryCounts` (`propertyService.list({ ...filters, perPage: 1 })` → `meta.total`; parallel; cached; hidden count when the request fails).
3. **Property rows** (`PropertyRow({ title, subtitle, params, viewAllHref, minItems = 3 })`): fetch `propertyService.list({ ...params, perPage: 8 })` (featured uses `propertyService.featured()`), render a `Carousel` of `PropertyCard`s, hidden when `< minItems`; rows: Featured (`isFeatured`), New launches (`constructionStatus: 'pre-launch,under-construction', sort: 'newest'` → `/buy/pre-launch`), Ready to move (`constructionStatus: 'ready-to-move', listingType: 'sale'`), Rentals (`listingType: 'rent'`).
4. **Localities / types / builders**: `ExploreLocalities` (featured, `LocalityCard`: image, avg ₹/sq ft, count); `PropertyTypeGrid` (active residential + commercial + land types with icons; count from the cache when available; link `/buy/<slug>` for residential/land, `/commercial/<slug>` for commercial); `TopBuilders` (featured developers, `DeveloperCard` compact → `/builders/<slug>`).
5. **CMS blocks**: `pageService.bySlug('home')` → find blocks `features` and `steps` → `HomeFeatures` (icon grid) / `HomeSteps` (numbered steps); hidden when the page/blocks are missing (never hardcoded fallback copy).
6. **Rest**: `TestimonialsSection` (featured, sample gating), `LatestInsights` (3 newest published via `articleService.list({ perPage: 3 })`, cards with image/category/reading time/date → article), `FaqSection`, `PartnersSection`, `CtaBand` (copy from `src/config/copy.js` — created now if missing — "Looking to sell or let your property?" + button → `/sell-let`), `NewsletterSection` (when enabled).
7. **Navigation from data (`navigation.js`)**: Buy mega-menu columns: "By status" (Pre-launch, Under construction, Ready to move, Resale → status routes), "By type" (residential property types → `/buy/<slug>`), "By budget" (5 sale buckets → `/buy?minPrice&maxPrice`), "Popular localities" (featured localities → `/localities/<slug>`); Rent: Apartments, Villas, Independent houses, PG/Co-living, Commercial (`/rent/<slug>` / `/lease`); Commercial: Office spaces, Retail shops, Warehouses, Co-working → `/commercial/<slug>`, Lease → `/lease`; Plots → `/plots`; Localities → `/localities`; Builders → `/builders`; Buyer Assistance → pages with `headerMenu === 'buyer-assistance'` (`pageService.list`? — public pages list endpoint does not exist: add `GET /pages?showInHeader=true|showInFooter=true` (public, published only, returns `{slug,title,headerMenu,footerColumn,order}`) to the mock + registry now); Insights → Articles, FAQs, Real Estate Awareness + pages with `headerMenu === 'insights'`; Company → pages with `headerMenu === 'company'` (About, Careers, Partnership, Sell/Let, Flexible workspace, Direct lease); Contact → `/contact`. Right side: phone button (`tel:`; `settings.navigation.showCallButton`), WhatsApp (`showWhatsappButton`), CTA (`headerCtaLabel` → opens the lead modal with source `post-requirement` and requirement fields (D82) — use `LeadModalTemp` with the requirement fields until 28). `Header` (≥ 900): logo, nav with `MegaMenu` (hover/focus/click, `Escape`, arrow keys, `aria-expanded`, closes on route change), transparent variant on `/` until scrolled (D52). `MobileDrawer` (< 900): accordions per menu, CTA row (Call · WhatsApp · Post requirement), links to Localities/Builders/Shortlist. `BottomNav`: Home, Search (`/properties?filters=open`), Shortlist (badge), Enquire (lead modal), Menu (opens the drawer); hidden on admin and property details. `Footer`: about text, columns = settings columns + auto columns ("Buy by type" top 6 residential types, "Popular localities" top 8 featured, "Insights" (Articles, FAQs, Awareness), "Company" (pages with `showInFooter` + `footerColumn === 'company'`)), contact block, social icons (only set ones), newsletter (when enabled), RERA/disclaimer text, copyright with `%year%`, "Privacy · Terms · Disclaimer" links (pages `privacy-policy`, `terms-of-use`, `disclaimer`), optional gallery (D79).
8. Delete replaced components; tests; format.

## 5. Data contract touched
New public endpoint: `GET /pages?showInHeader=&showInFooter=` (mock + registry + smoke + docs). Consumed: `GET /properties` (rows/counts), `/properties/featured`, `/pages/slug/home`, `/articles?perPage=3`, `/testimonials?isFeatured=true`, `/faqs?showOnHome=true`, `/partners`, master data via context, settings via context.

## 6. UI/UX requirements
Hero 560 px desktop / 480 px mobile with the search card overlapping; tabs as segmented control; search fields stack on mobile; rows use `SectionHeader` with "View all"; tiles 3×2 → 2×3 on mobile with counts; mega-menu panel with 4 columns, shadow `--shadow-lg`, radius; drawer accordions 48 px; footer light with 4–5 columns → 2 columns tablet → accordion-free stacked on mobile; every section spaced `--space-16`; reduced motion; no CLS (hero media reserved height).

## 7. Edge cases that must work
- Settings without `searchTabs` → default five tabs; with only `['sale']` → no tab strip.
- Category count request fails → tile shows no count (no "0").
- Fewer than 3 featured properties → the Featured row is absent, no gap.
- `home` CMS page unpublished → features/steps sections absent.
- Header menus with no pages for a menu key → that menu absent.
- Transparent header on `/`: readable over dark and light hero images (text white with a subtle shadow; switches to solid after 10 px scroll).
- Mega-menu keyboard: Tab into a trigger, Enter opens, arrows move, Escape closes and returns focus.

## 8. Acceptance criteria
- [ ] Home renders every section of the objective from data; hero search navigates with correct params for each tab; tiles show counts; rows hidden below 3 items.
- [ ] Header/mega-menu/drawer/bottom nav/footer are built from data + settings; no "Sign In"; CTA opens the post-requirement modal; phone/WhatsApp buttons respect settings.
- [ ] Deleted legacy sections; tests pass; `GET /pages?showInHeader` smoke-tested.
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
Manual QA (desktop + 390 px): `/` → hero tab Rent → budget shows rent buckets → locality "Koramangala" → 2 BHK → Search → `/rent?localityId=…&bedrooms=2&…`; tiles counts; rows scroll; mega-menu Buy → By budget link; mobile drawer accordions; bottom nav Enquire → modal; footer columns and legal links; disable WhatsApp in settings (via admin? settings save arrives in 40 — use `PUT /api/admin/settings` with curl) → header WhatsApp hidden after reload.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 27 report; Known issues: BUG-11 (home part), BUG-20 closed, additional defect 6 (nav duplication) and 15 closed; Pending rewrites: "HomeFeatures/HomeSteps → cms blocks (30)", "post-requirement modal → LeadCaptureModal (28)", "home Helmet → `<Seo type="home">` (38)"; next prompt: 28.
- `docs/DECISIONS.md`: D52, D79, D81, D82, D92, pages public list endpoint.

## 11. Commit
`git add -A && git commit -m "feat(home): data-driven home page with tabbed hero search, rows, tiles, CMS blocks; navigation and footer from data"`

## 12. Guardrails
- Do not touch: admin, `db.json`, `theme.js`, `global.css`, mock beyond the pages list endpoint.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (every legacy home section has a data-driven successor).
