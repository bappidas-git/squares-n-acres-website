# Prompt 24 — Property details part 2: content sections (overview, highlights, unit configurations, specifications, amenities, floor plans (gated), gallery grid, construction, builder, nearby & location, FAQs)

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §6.1, §8.2 states, §11 BUG-05/BUG-08 (partly), §13 D39/D40/D86), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–23 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
The details page shell renders `<section id="section-<key>">` wrappers for every visible section with dev-only placeholders. Legacy section components still exist on the adapter shape: `PropertyOverview.jsx` (description + highlights, always-render detail cards with "—"), `PropertySpecialities.jsx` ("Feature" fallback), `PropertySpecs.jsx` (legacy-object branch), `PropertyAmenities.jsx`, `FloorPlans.jsx` (blur + lead gating without download), `ConstructionSpecs.jsx`, `ConstructionStatus.jsx` (`Infinity%` bug), `BuilderOverview.jsx` (self-nullifies), `NearbyPlaces.jsx` ("Map view available on live version"), `PropertyFaq.jsx`, `PropertyDocuments.jsx` (no download), `EnquiryForm.jsx`, `FinanceGuide.jsx`, `SimilarProperties.jsx`. `LeadModalTemp` (23) handles gated actions temporarily; `leadStorage` (`sna_lead`) records captured leads per property; `FaqAccordion`, `LazyImage`, `Carousel`, `MapEmbed`, `DeveloperCard`/`DeveloperStats`, `useCountUp` exist. Rich HTML rendering uses `LegacyHtml` until 32.

## 2. Objective
When this prompt is finished the following sections are rebuilt on the new shape, each rendered **only** when `getVisibleSections` includes it (enabled + data), with no placeholder/default content ever: **Overview** (description HTML + read-more, project snapshot chips), **Highlights** (check-list, show-more beyond 6), **Unit configurations** (table on desktop / cards on mobile: name, BHK/bath, areas, price/on request, floor plan thumbnail → lightbox, "Get price" → lead modal `price-request`), **Specifications** (grouped by `SPEC_GROUPS` with icons; construction specifications as a second grouped block), **Amenities** (grouped with icons, "Show all N"), **Floor plans** (tabs per plan; lead-gated blur → unlock via lead modal `floor-plan-request` → then the image opens in the lightbox and "Download PDF" opens `pdfUrl` when present; unlock persisted per property in `leadStorage`), **Gallery** (grid of all images beyond the hero, opens the lightbox), **Construction status** (progress bar + timeline with photos; no `Infinity%`), **About the builder** (developer card + stats + "N projects by <name>" link), **Location & nearby** (`MapEmbed` when coords and `showExactLocation`, else locality map centre; nearby chips grouped by category with distance/time), **FAQs** (`FaqAccordion`). Documents/brochure, finance, similar, enquiry and recently viewed are prompt 25. Legacy section components are deleted when replaced.

## 3. Scope
### Files to create
- `src/components/sections/property/OverviewSection.jsx`, `HighlightsSection.jsx`, `UnitConfigurationsSection.jsx`, `SpecificationsSection.jsx`, `AmenitiesSection.jsx`, `FloorPlansSection.jsx`, `GallerySection.jsx`, `ConstructionSection.jsx`, `BuilderSection.jsx`, `LocationSection.jsx`, `FaqsSection.jsx` (+ css modules), `SectionShell.jsx` (H2 + optional subtitle + consistent spacing + `id`), `GatedOverlay.jsx` (blur + lock + CTA), `useGatedContent.js` (per-property unlock state from `leadStorage`)
- Tests: `__tests__/UnitConfigurationsSection.test.jsx` (on-request rows, table vs cards), `__tests__/ConstructionSection.test.jsx` (1 milestone → 0 %/100 % without NaN), `__tests__/FloorPlansSection.test.jsx` (locked → unlock → PDF link)
### Files to modify
- `src/pages/public/PropertyDetails.jsx` (map keys → components), `src/utils/leadStorage.js` (add `unlock(propertyId, kind)`, `isUnlocked(propertyId, kind)`), `docs/*`
### Files to delete
- `PropertyOverview.jsx`, `PropertySpecialities.jsx`, `PropertySpecs.jsx`, `PropertyAmenities.jsx`, `FloorPlans.jsx`, `ConstructionSpecs.jsx`, `ConstructionStatus.jsx`, `BuilderOverview.jsx`, `NearbyPlaces.jsx`, `PropertyFaq.jsx`, `PropertyGallery.module.css` leftovers (and their css) — keep `PropertyDocuments.jsx`, `EnquiryForm.jsx`, `FinanceGuide.jsx`, `SimilarProperties.jsx` for 25
### May also touch
- `src/utils/propertySections.js` (only if a `hasData` rule needs refinement — keep tests green)

## 4. Detailed tasks
1. **`SectionShell({ id, title, subtitle, children, action })`** renders `<section id="section-<key>" aria-labelledby>` with an H2 and consistent spacing (`--space-12` desktop / `--space-8` mobile). Every section uses it.
2. **Overview:** H2 "About <title>"; `LegacyHtml` description (→ `SafeHtml` in 32) clamped to ~12 lines with "Read more/less" (reduced-motion aware; never clamps when content is short); project snapshot chips only from present data (project area, towers, units, launch date, possession/age, RERA); no "—" placeholders.
3. **Highlights:** two-column list with check icons; first 6 + "Show N more".
4. **Unit configurations:** active rows sorted by `order`/bedrooms; desktop `table` (Configuration, Carpet/Super built-up, Price, Floor plan, Action) with `<caption>`; mobile stacked cards; price via `Price` ("On request"); thumbnail (`LazyImage` 4/3) opens the lightbox (reuse `PropertyLightbox` with the plan image); "Get price"/"Enquire" → `LeadModalTemp` (source `price-request`, message prefilled "Price for <name>"); `availableUnits` chip when present.
5. **Specifications:** groups in `SPEC_GROUPS` order with icons (`specifications[].icon` or the group icon), rows label/value; second block "Construction specifications" from `constructionSpecs` (same layout, no icons); collapsed beyond 8 rows per block with "Show all".
6. **Amenities:** grouped by `AMENITY_CATEGORIES` order (only groups with items), chips with icons; "Show all N amenities" toggle beyond 12; commercial groups first for commercial.
7. **Floor plans:** tabs (`ui/Tabs`) per plan (title), image `LazyImage` 4/3; when `!isUnlocked(propertyId, 'floorPlans')` → `GatedOverlay` (blur 8 px, lock icon, "Share your details to view floor plans", button) → `LeadModalTemp` (source `floor-plan-request`) → on success `leadStorage.unlock(id, 'floorPlans')` → image clear + "Open full size" (lightbox) + "Download PDF" (`<a href target=_blank rel=noopener>` when `pdfUrl`; tracks `brochure_download`? — event `floor_plan_download`); meta line (area, BHK, price); the unlock persists for the session (sessionStorage per property).
8. **Gallery section:** masonry-free 3/2 column grid of all images (excluding none — the hero already shows the cover; include all for completeness) with captions; click → lightbox at that index; "N photos".
9. **Construction:** progress bar (`constructionProgressPercent` or computed from milestones completed/total — guard divide-by-zero: 0 milestones → hide the bar; 1 milestone → 0 % or 100 %), timeline (vertical on mobile, horizontal ≥ 900 px) with status dots (tones), dates (`formatDate` month), notes, photos (`LazyImage`, lightbox); "Last updated" line; hidden for ready-to-move/resale by `getVisibleSections`.
10. **Builder:** `DeveloperCard` (logo, name, established, highlights) + `DeveloperStats` (count-up) + "View N projects by <name>" → `/builders/<slug>`; renders when `project.developer` exists (description-only developer fine).
11. **Location & nearby:** map (`MapEmbed` with property coords when `showExactLocation` and coords; else the locality's coords with a 13 zoom and a note "Approximate location — exact address shared on request"; else no map), address line per visibility, nearby places grouped by `NEARBY_CATEGORIES` (icon, name, "2.5 km · 8 min"), "Locality guide" link → `/localities/<slug>`.
12. **FAQs:** `FaqAccordion` with `property.faqs` (sorted), H2 "FAQs about <projectName || title>"; the `FAQPage` schema is emitted by `<Seo>` in 38.
13. Wire the map in `PropertyDetails.jsx` (`SECTION_COMPONENTS = { overview: OverviewSection, … }`), remove the dev placeholder for these keys, delete the legacy components, tests, format.

## 5. Data contract touched
Consumed: none new (`POST /leads` with sources `price-request`, `floor-plan-request` via the temp modal). Storage: `sna_lead` gains `unlocks: { [propertyId]: ['floorPlans', 'documents'] }`.

## 6. UI/UX requirements
Sections alternate white/surface backgrounds; H2s consistent; tables accessible (`scope="col"`, caption); gated overlay readable on mobile; timeline horizontal scroll on tablets; amenity chips wrap; "Show more" buttons ghost variant; every image has alt from data; no layout shift (fixed ratios); reduced motion.

## 7. Edge cases that must work
- Property with `sectionVisibility.specifications` true but empty arrays → section absent (nav has no item).
- Unit configuration `priceOnRequest` → "On request" + "Get price" CTA; all on request → no price column values but the table still renders.
- Floor plan without `pdfUrl` → no download button after unlock; unlocking through any gated action (documents later) unlocks floor plans too? — decision: unlocks are per kind; a property enquiry (`property-enquiry`) unlocks **all** kinds for that property (record).
- Construction with milestones but no dates → timeline without dates; progress from statuses.
- Coordinates present but `showExactLocation` false → locality map only, no marker at the exact spot.
- Nearby with unknown category → grouped under "Other".

## 8. Acceptance criteria
- [ ] All eleven sections render from seed data on property 1 and 2 (under construction) exactly per the visibility rules; no "—"/"Feature"/"Document"/"Map view available…" strings anywhere (`grep -rn "Map view available\|'Feature'" src` → 0).
- [ ] Floor-plan gating: locked → lead → unlocked (persisted for the session) → lightbox + PDF link.
- [ ] Legacy section components deleted; tests pass.
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
Manual QA (desktop + 390 px): property 1 → read more, unit configurations table → "Get price" lead → floor plans locked → submit → unlocked + PDF; amenities show all; location map; FAQs accordion keyboard; property 2 → construction timeline with progress; a plot listing → no BHK/floor plan sections, map + nearby only; section nav items match the rendered sections exactly.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 24 report; Known issues: BUG-05 closed (except finance/documents → 25), additional defect 14 closed; Pending rewrites: "LegacyHtml in OverviewSection → SafeHtml (32)"; next prompt: 25.
- `docs/DECISIONS.md`: unlock-kinds decision, hero/gallery duplication decision, D39.

## 11. Commit
`git add -A && git commit -m "feat(property-details): data-driven content sections with gated floor plans, construction timeline, builder, location and FAQs"`

## 12. Guardrails
- Do not touch: admin, mock server, `db.json`, `theme.js`, `global.css`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (every legacy section's information is rendered by a new section).
