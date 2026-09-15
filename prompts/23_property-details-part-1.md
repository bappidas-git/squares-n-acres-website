# Prompt 23 — Property details part 1: page shell, breadcrumbs, gallery + lightbox, title/price cards, key facts, section nav, mobile CTA bar, view tracking, share, shortlist

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §6.1, §8 (UI kit, breakpoints, states), the master spec DET-01/DET-02 restated below, §13 D7/D29/D33/D52/D86), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–22 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
`src/pages/public/PropertyDetails.jsx` (legacy, ~1 100 lines after prompt 03/21 edits) still reads the adapter shape: Helmet SEO, breadcrumbs Home › Properties › Title, `PropertyGallery` (custom lightbox without focus trap), title block with badges/chips (`configuration`, `dimensionRange` chip that always renders, `possession`), price `formatPrice` + duplicated unit, "Download Brochure/Floor Plans" buttons opening lead modals (four copy-pasted modal state machines), `StickyNav` with hardcoded `ALL_NAV_ITEMS` and a scroll-spy, `SectionGuard`-wrapped sections, sidebar `EnquiryForm` (mounted three times), share via Web Share/bottom sheet, `?preview=admin` banner (prompt 21). `src/utils/propertySections.js` (`getVisibleSections`) exists. `useBanks()` exists. `yet-another-react-lightbox@3.32.2` is **not installed yet** (install here; Jest `transformIgnorePatterns` already lists it). `LeadCaptureModal` arrives in prompt 28 — this prompt keeps a single temporary modal component `LeadModalTemp` (parameterised by source) that prompt 28 replaces. Shortlist context does not exist yet (create it here).

## 2. Objective
When this prompt is finished `/properties/:slug` is rebuilt on the new shape with the page shell: data loading (`propertyService.getBySlug`, admin preview), 404 for unknown/inactive, breadcrumbs (Home › Buy/Rent/Lease › Locality › Title), `PropertyGallery` (cover + thumbnails, "N photos", tabs Photos/Video/Virtual tour, lightbox via `yet-another-react-lightbox` lazy-loaded with keyboard/swipe/captions), `TitleBlock` (title H1, badges, locality/address per `showExactLocation`, RERA number, updated date, share (Web Share API + copy link + WhatsApp), shortlist heart), `PriceCard` (price/rent, per sq ft, negotiable/on request, EMI starting at (computed from the lowest active bank rate, 20 years, 80 % LTV — `utils/finance.js` `estimateEmi`), booking amount, CTAs Enquire / Request call back / Schedule site visit / WhatsApp; agent card when `showOnListing`), `KeyFacts` grid (BHK, baths, balconies, areas, floor, facing, furnishing, possession/age, ownership, parking, availability — only present facts), `SectionNav` built from `getVisibleSections(property, context)` (sticky under the header, scroll-spy, horizontal chip bar on mobile), `MobileCtaBar` (Call · WhatsApp · Enquire) replacing the bottom nav on this page, view tracking once per session, recently-viewed recording, `ShortlistContext` (`sna_shortlist`) with a heart toggle. Sections themselves render placeholders ("Section content arrives in prompt 24/25") **except** those already trivially ready (none) — the page must never show empty cards: placeholders are only shown in development builds via a small `SectionPlaceholder` that prompt 24/25 removes.

## 3. Scope
### Files to create
- `src/pages/public/PropertyDetails.jsx` (rewritten) + `PropertyDetails.module.css` (rewritten)
- `src/components/sections/property/PropertyGallery.jsx` (rewritten) + css, `PropertyLightbox.jsx` (lazy), `TitleBlock.jsx`, `PriceCard.jsx`, `AgentCard.jsx`, `KeyFacts.jsx`, `SectionNav.jsx` (replaces `StickyNav.jsx`), `MobileCtaBar.jsx`, `SectionPlaceholder.jsx` (dev only), `LeadModalTemp.jsx` (temporary)
- `src/contexts/ShortlistContext.js`, `src/components/common/ShortlistButton.jsx`, `src/components/common/ShareButton.jsx`, `src/utils/finance.js` (`estimateEmi(principal, annualRate, years)`, `emiBreakdown`, `foirScore` (moved from FinanceGuide in 25)), `src/utils/recentlyViewed.js` (`sna_recent_properties` max 8), `src/utils/viewTracker.js` (`sna_viewed_properties` session set)
- Tests: `src/utils/__tests__/finance.test.js`, `src/components/sections/property/__tests__/KeyFacts.test.jsx` (hides missing facts), `SectionNav.test.jsx` (items from visible sections), `src/contexts/__tests__/ShortlistContext.test.js`
### Files to modify
- `src/App.js` (`ShortlistProvider`), `src/components/layout/BottomNav.jsx` (hidden on property details; shortlist badge count), `src/components/common/PropertyCard.jsx` (`ShortlistButton`), `src/routes/publicRoutes.js` (unchanged path), `package.json` (`yet-another-react-lightbox@3.32.2`), `src/utils/adapters/legacyProperty.js` (details mappings removed; listing-only now), `docs/*`
### Files to delete
- `src/components/sections/property/StickyNav.jsx` (+ css), `src/components/common/SectionGuard.jsx` (replaced by `getVisibleSections` + explicit checks)
### May also touch
- import fixes

## 4. Detailed tasks
1. **Data.** `useApi(() => preview ? propertyService.adminGetBySlug(slug) : propertyService.getBySlug(slug), [slug, preview])`; `preview = searchParams.get('preview') === 'admin' && isAuthenticated`; 404 (ApiError.status 404) → render `NotFound` (with `<title>` "Property not found"); loading → `PropertyDetailSkeleton` (layout-identical: gallery box 16/9, title lines, price card, facts grid); error → `ErrorState` retry. Context for sections: `{ banksAvailable: useBanks().length > 0, similarAvailable: true }` → `visibleSections = getVisibleSections(property, context)`.
2. **Tracking.** On successful load (non-preview): `viewTracker.recordView(property.id)` → if not yet viewed this session → `propertyService.view(id)` (fire and forget); `recentlyViewed.add({ id, slug, title, coverUrl, price… })`.
3. **Breadcrumbs.** Home › `LISTING_TYPES.labelOf` (link `/buy|/rent|/lease`) › locality (link `/localities/<slug>`) › title (current). Passed to the (temporary) Helmet as JSON-LD? — no: JSON-LD arrives with `<Seo>` in 38; keep a temporary `Helmet` with title `<seo.title || title> | Squares N Acres`, description, canonical `SITE.url + path`, `noindex` when preview/inactive.
4. **Gallery.** `images` sorted by `order`, cover first; main image (`LazyImage` ratio 16/9 on desktop, 4/3 mobile; `sizes` full width), thumbnails strip (desktop right column/mobile below), counter "1 / 8", "View all N photos" button, tabs Photos / Video (YouTube/Vimeo iframe with `title`, MP4 `<video controls>`; only when `sectionVisibility.video` && `videoUrl`) / Virtual tour (iframe; only when enabled); keyboard: arrows switch, Enter opens the lightbox; lightbox = `React.lazy(() => import('./PropertyLightbox'))` wrapping `yet-another-react-lightbox` with the `captions` and `counter` plugins (import `yet-another-react-lightbox/styles.css` and plugin CSS inside the lazy module), slides `{ src: cloudinaryUrl(url, { w: 1600 }) — helper arrives in 39; for now raw url, alt, description: caption }`, `Suspense` fallback = spinner; swipe on touch; `Escape` closes; focus returns. Empty gallery → a single monogram placeholder box (never blank).
5. **Title block.** H1 title; badges (`ui/Badge` tones) + "Verified" mark; `projectName` when different; locality · city (+ address when `showExactLocation`; else "Exact location shared on request"); RERA number with `reraRegistered` shield; "Updated 05 Sep 2026"; actions: `ShareButton` (native share when available; else menu Copy link / WhatsApp / X / Facebook / LinkedIn / E-mail; toast on copy), `ShortlistButton` (heart, `aria-pressed`, toast "Saved to shortlist" with "View" link).
6. **Price card** (sticky right column ≥ 1200 px; under the gallery below): `Price` (sale: `pricing.price` or range; "onwards" when a range/unit configs exist; rent/lease: `/month` + deposit line; on request), `pricePerSqft` line, chips Negotiable / Booking amount, "EMI from ₹1.02 L/month*" when sale + banks (`estimateEmi(price × ltv, minRate, 20)`; footnote "*Indicative, 80 % LTV, 20 years"), CTA buttons: Enquire (`property-enquiry`), Request call back (`callback-request`), Schedule site visit (`site-visit-request`) → `LeadModalTemp` with `propertyId`/`source`/`title`, WhatsApp (`useSiteSettings().getWhatsappLink('Hi, I am interested in <title> — <url>')` → `dataLayer` event via `utils/analytics.js` `track('whatsapp_click', { propertyId })` — create `analytics.js` now with `track(event, params)` pushing to `window.dataLayer`), `AgentCard` when `agent.showOnListing` (photo/initials, name, Call/WhatsApp/E-mail buttons; `call_click` event).
7. **Key facts.** Definition grid of present facts with icons: bedrooms (formatBhk), bathrooms, balconies, super built-up/built-up/carpet/plot area (`formatArea`), plot dimensions, floor "3 of 14", facing, furnishing, possession (`formatDate` month) or age ("3 years old"), ownership, parking "1 covered + 1 open", availability chip, property type, construction status; hidden when no facts.
8. **Section nav** (`SectionNav`): items from `visibleSections` (label + anchor `#section-<key>`), sticky at `--header-height` with `--z-sticky`, scroll-spy via `IntersectionObserver` on section elements (`aria-current`), click → smooth scroll with offset (reduced-motion aware), horizontal scrollable chip bar on mobile; the page renders `<section id="section-<key>">` wrappers for every visible section in `SECTION_DEFINITIONS` order with a `SectionPlaceholder` inside (dev only; production renders nothing until 24/25 — note in state).
9. **Mobile CTA bar**: fixed bottom (Call `tel:` from agent or `settings.general.contactPhone`, WhatsApp, Enquire primary), `--safe-bottom`, hides `BottomNav` on this route (BottomNav reads a `hidden` flag from a `LayoutContext` or checks the route pattern `/properties/:slug` — implement `useRouteMatch`-style check in BottomNav).
10. **Shortlist.** `ShortlistProvider` (`ids`, `add`, `remove`, `toggle`, `has`, `count`) persisted in `sna_shortlist`; `BottomNav` Shortlist badge = count (the `/shortlist` page arrives in 26); `PropertyCard` heart uses it.
11. **`LeadModalTemp`**: `Modal` with `LeadForm` (fields name/phone/email/message, `source`, `propertyId`, `hiddenFields`), success state with WhatsApp/Call buttons; remembers details via `leadStorage` (`sna_lead`) — replaced by `LeadCaptureModal` in 28.
12. Delete `StickyNav`/`SectionGuard`; tests; format.

## 5. Data contract touched
Consumed: `GET /properties/slug/:slug`, `GET /admin/properties/slug/:slug`, `POST /properties/:id/view`, `POST /leads`, `GET /banks` (context). npm: `yet-another-react-lightbox@3.32.2`. Storage: `sna_shortlist`, `sna_recent_properties`, `sna_viewed_properties`, `sna_lead`.

## 6. UI/UX requirements
Desktop: 8/4 grid (content / sticky price card), gallery 16/9 with thumbnail column; mobile: gallery 4/3 swipeable, price card under the gallery, section chips scroll, CTA bar; H1 once; badges tones; buttons 44 px; lightbox dark with captions; skeleton identical layout; no CLS (fixed aspect boxes, reserved heights for the nav); reduced motion respected.

## 7. Edge cases that must work
- Property with 1 image → no thumbnails/lightbox arrows; 0 images → placeholder.
- `priceOnRequest` → "Price on Request", no EMI line; no banks → no EMI line.
- `showExactLocation` false → no address, no coordinates anywhere on the page.
- Video URL not YouTube/Vimeo/MP4 → tab hidden.
- View tracking runs once per session even after client-side navigation away and back.
- Share on desktop without `navigator.share` → menu; copy link toast.
- Admin preview of an inactive property shows the banner and `noindex`.

## 8. Acceptance criteria
- [ ] `/properties/lakeview-heights-3-bhk-whitefield` renders the new shell: breadcrumbs, gallery + lightbox, title block, price card with EMI, key facts, section nav (items = visible sections), mobile CTA bar; unknown slug → 404.
- [ ] `POST /properties/:id/view` fires once per session; shortlist heart persists; BottomNav hidden on the page and shows the shortlist count elsewhere.
- [ ] `StickyNav`/`SectionGuard` deleted; `yet-another-react-lightbox` lazy-loaded (separate chunk in `npm run build`).
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
Manual QA (desktop 1280 + 390 px): open property 1 → keyboard through the gallery, open lightbox, `Escape`; share → copy; shortlist heart → badge on bottom nav (390 px); price card CTAs open the modal and submit a lead (visible in admin); network shows one `POST /view`; scroll → section nav highlights; mobile CTA bar buttons work (`tel:`/`wa.me`).

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 23 report; Pending rewrites: "LeadModalTemp → LeadCaptureModal (28)", "SectionPlaceholder removed by 24/25", "temporary Helmet → `<Seo>` (38)"; Known issues: BUG-06 closed, additional defect 12 (partially) closed; next prompt: 24.
- `docs/DECISIONS.md`: D7, D29, EMI assumptions (80 % LTV, 20 y, min bank rate), share menu decision.

## 11. Commit
`git add -A && git commit -m "feat(property-details): new page shell with gallery/lightbox, price card, key facts, section nav, mobile CTA bar, shortlist and view tracking"`

## 12. Guardrails
- Do not touch: admin pages, mock server, `db.json`, `theme.js`, `global.css`.
- Do not add dependencies other than: `yet-another-react-lightbox@3.32.2`.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (section content is delivered by 24/25 within the same module sequence; document the interim state).
