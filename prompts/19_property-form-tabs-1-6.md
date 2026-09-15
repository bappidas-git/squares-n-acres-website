# Prompt 19 — Property form tabs 1–6: Basics, Location, Pricing, Area & configuration, Unit configurations, Media

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §6.1 fields, §6.17 enums, §13 D33/D42/D61/D67–D71), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–18 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
`src/pages/admin/properties/property-form/` has the reducer (`setField/addItem/removeItem/moveItem/updateItem`), item factories, `tabs.js` with placeholder components, validators and the rail. The basics fields currently sit in the basics placeholder. Legacy tabs (`property-tabs/{GalleryTab,BasicInfoTab,OverviewTab,DetailsTab,…}.jsx`) show the old UX: gallery of URL rows with drag reorder and a cover row, configuration chips (`CONFIGURATION_OPTIONS` "1 BHK…6 BHK, 1 RK, Studio, Duplex, Penthouse"), `dimensionRange`, location text fields. `ImageField` (URL + preview; upload/media buttons appear in 39), `MapEmbed`, `SortableList`, `MultiSelect`, `EntityPicker`, `NumberField` (Indian grouping), `usePropertyTypes`, `useLocalities`, `useCities` exist. Rich text editor arrives in 32 (description uses a textarea with an HTML hint until then; register in Pending rewrites).

## 2. Objective
When this prompt is finished tabs 1–6 are complete and validated: **Basics** (title, projectName, listingType, segment → drives field visibility, propertyTypeId filtered by segment, constructionStatus, availability, possessionDate, ageOfPropertyYears, reraRegistered + reraNumber, badges multi-select, furnishing, facing, floorNumber/totalFloors, ownership, shortDescription with counter, description (textarea until 32)), **Location** (locality select with search + "Add new locality" quick-create dialog, city auto/selectable, address, pincode, landmark, latitude/longitude with `MapEmbed` preview and (when a Maps key exists in settings/env) a draggable pin, showExactLocation, nearby places repeater grouped by category with distance/time), **Pricing** (fields per listingType; live Indian-format preview; pricePerSqft auto-computed but editable; other charges repeater; rent/lease: rent, deposit, maintenance, lease terms in other charges), **Area & configuration** (per segment: residential areas + BHK/bath/balcony/parking/rooms/kitchen; plots: plotArea + dimensions + unit; commercial: carpet/super built-up + floors, washrooms via specifications hint), **Unit configurations** (repeater with name/BHK/bath/areas/price/on-request/floor plan image+pdf/available units/active, reorder, "copy from previous"), **Media** (gallery grid with drag reorder, cover selection, alt required with a keyword hint, caption, bulk "Add by URLs", video URL, virtual tour URL, brochure URL + lead-gated toggle). Field visibility rules are centralised in `fieldRules.js`.

## 3. Scope
### Files to create
- `src/pages/admin/properties/property-form/tabs/BasicsTab.jsx`, `LocationTab.jsx`, `PricingTab.jsx`, `AreaConfigurationTab.jsx`, `UnitConfigurationsTab.jsx`, `MediaTab.jsx` (+ css modules as needed)
- `src/pages/admin/properties/property-form/fieldRules.js` (`isResidential(values)`, `isPlot`, `isCommercial`, `isRentOrLease`, `showsBhk`, `showsPlotDimensions`, `showsPossessionDate`, `showsAge`, `priceFieldsFor(listingType)`)
- `src/pages/admin/properties/property-form/components/NearbyPlacesRepeater.jsx`, `OtherChargesRepeater.jsx`, `ImageGalleryEditor.jsx` (+ css), `LocalityQuickCreateDialog.jsx`, `PricePreview.jsx`, `MapPinPicker.jsx` (Maps JS only when a key exists; else `MapEmbed` + inputs)
- Tests: `__tests__/fieldRules.test.js`, `__tests__/PricingTab.test.jsx` (sale vs rent fields, preview text), `__tests__/ImageGalleryEditor.test.jsx` (cover selection, alt validation, reorder)
### Files to modify
- `tabs.js` (wire components), `validators/property.js` (extend per tab), `initialState.js` (nothing unless a default is missing), `src/utils/finance.js`? (no — 25), `docs/*`
### Files to delete
- none (legacy tabs deleted in 21)
### May also touch
- `src/services/masterDataService.js` (localities quick create uses `create`)

## 4. Detailed tasks
1. **Basics.** Two-column grid: title (`TextField` 10–120), projectName, listingType (`RadioGroup` Buy/Rent/Lease — changing to rent/lease clears sale price fields with a confirm when they hold values), segment (`RadioGroup` Residential/Commercial/Plots & Land — changing clears `configuration`/`area` fields that no longer apply, with confirm), propertyTypeId (`SelectField` from `usePropertyTypes({ segment })`; when the current type's segment ≠ segment → reset to null), constructionStatus, availability, possessionDate (`DateField`, shown per `showsPossessionDate`: pre-launch/under-construction; month-level input `yyyy-mm` stored as `yyyy-mm-01`), ageOfPropertyYears (`showsAge`: ready-to-move/resale), reraRegistered switch + reraNumber (required when registered), badges (`MultiSelect` from `useBadgeMap()` values), furnishing/facing/ownership selects (residential + commercial; hidden for plots), floorNumber/totalFloors (apartments/office), shortDescription (`TextareaField`, counter /300), description (textarea 8 rows, hint "Basic HTML allowed; a rich editor arrives in a later step" — no; keep hint neutral: "Detailed description (min 300 characters to publish)"), plus a live plain-text character/word counter.
2. **Location.** Locality `EntityPicker`-like select with search over `useLocalities()` (client-side; ≤ 200 items) + "Add new locality" button → `LocalityQuickCreateDialog` (name, zone, city; `masterDataService.localities.create({ name, zone, cityId })` → `refresh('localities')` → select it), city auto-filled from the locality (`localities[].cityId`) and editable via `useCities()`, address (textarea 2 rows), pincode (6 digits), landmark, latitude/longitude (`NumberField` step 0.000001, range validation), `MapPinPicker`: with a key (`settings.integrations.googleMapsApiKey || process.env.REACT_APP_GOOGLE_MAPS_KEY`) inject the Maps JS script once (`utils/loadScript.js`) and render a draggable marker that writes lat/lng; without a key render `MapEmbed` preview + "Use locality centre" button (fills coords from the locality record); showExactLocation switch with the hint "When off, the public page shows the locality only"; `NearbyPlacesRepeater`: rows grouped by `NEARBY_CATEGORIES` with add-row per category (name, distanceKm, travelTimeMin), reorder within category, remove; validation: name required when a row exists.
3. **Pricing.** `priceFieldsFor(listingType)`: sale → price (`NumberField` ₹, Indian grouping), priceOnRequest switch (disables price fields and clears them), price range min/max, pricePerSqft (auto: `price / (superBuiltUpArea || carpetArea || plotArea)` in sq ft, recomputed only while the user has not edited it — track `pricePerSqftManual` in local tab state), priceNegotiable, bookingAmount, `OtherChargesRepeater` (label, amount, note); rent/lease → rentPerMonth, securityDeposit (hint "Typically 5–10 months"), maintenanceChargesMonthly, bookingAmount (lease: "Advance"), otherCharges with lease presets buttons ("Add lock-in", "Add escalation") that add labelled rows. `PricePreview`: card showing exactly what the public page will print via `formatPrice`/`formatPriceRange` ("₹1.42 Cr onwards", "₹45,000/month", "Price on Request", "+ ₹2,500/month maintenance").
4. **Area & configuration.** Residential: superBuiltUpArea, builtUpArea, carpetArea (+ areaUnit select; rule carpet ≤ builtUp ≤ superBuiltUp when all present — warning), bedrooms (0.5 steps allowed? — no: integer; 5+ entered as 5 with hint), bathrooms, balconies, parkingCovered/parkingOpen, servantRoom/studyRoom/poojaRoom switches, kitchenType. Plots: plotArea + areaUnit (sqft/sqyd/acre/cent/guntha), plotLength/plotWidth + plotDimensionUnit (ft/m), auto-fill plotArea from L×W when empty (sq ft when unit ft). Commercial: superBuiltUpArea/carpetArea, floorNumber/totalFloors (also on Basics — show here as read-only mirror? — decision: keep floors on Basics only), washrooms/pantry/etc. entered as specifications (hint linking to the Highlights & specifications tab).
5. **Unit configurations.** `SortableList` of cards: name (e.g. "3 BHK + Study"), bedrooms/bathrooms (residential), superBuiltUpArea/carpetArea + areaUnit, price / priceOnRequest, floorPlanImageUrl (`ImageField` hint `floorPlan`), floorPlanPdfUrl (URL), availableUnits, isActive; "Add configuration", "Duplicate row", remove with confirm; validation per §4 of prompt 18; a summary line "Price range auto: ₹85 L – ₹1.2 Cr" and a button "Apply as pricing range" that fills `pricing.priceRangeMin/Max` from active rows.
6. **Media.** `ImageGalleryEditor`: grid of image cards (thumbnail via `LazyImage`, alt input (required, hint shows the focus keyword from `seo.focusKeyword` when set, e.g. "Use: 3 bhk apartment in whitefield"), caption, "Set as cover" radio, remove, drag reorder + keyboard reorder); "Add image" (URL) and "Add multiple URLs" (textarea, one per line → rows); buttons `Upload`/`Media library` appear when prompt 39 wires handlers (`ImageField` contract); counters "6 images · 2 missing alt"; validation: `url` valid, `alt` required, one cover. Below: videoUrl (YouTube/Vimeo/MP4 with a small preview: YouTube → thumbnail via `https://img.youtube.com/vi/<id>/hqdefault.jpg`), virtualTourUrl, brochureUrl (URL; PDF hint) + brochureLeadGated switch.
7. **Validators/tests**: extend `validators/property.js` with the rules above; unit tests for `fieldRules`, pricing preview text, gallery editor behaviours.
8. Remove the basics placeholder content (fields now live in `BasicsTab`/`LocationTab`); tabs 7–16 keep placeholders.

## 5. Data contract touched
Consumed: `POST /admin/localities` (quick create), `GET /localities`, `/cities`, `/property-types`, `/badges` via context. Env: `REACT_APP_GOOGLE_MAPS_KEY` (optional) — read together with `settings.integrations.googleMapsApiKey`.

## 6. UI/UX requirements
Two-column grid ≥ 900 px, single below; groups with `FormSection` titles/descriptions; conditional fields animate in (reduced-motion aware) and never leave layout gaps; numeric fields right-aligned with ₹/unit adornments; the gallery grid 4/3/2 columns with 44 px controls; drag handles + keyboard alternative; errors inline + tab badge; price preview sticky under the pricing fields on desktop.

## 7. Edge cases that must work
- Switching segment residential → land clears BHK fields (after confirm) and hides them; switching back restores nothing (fresh nulls).
- `priceOnRequest` on → price fields disabled and cleared; preview shows "Price on Request"; validation passes without a price.
- Lat/lng typed manually with more than 6 decimals → rounded on blur.
- Quick-created locality appears in the select immediately and is selected; city auto-fills.
- Gallery: removing the cover promotes the first remaining image; the alt hint updates when the SEO focus keyword changes (in 36).
- Unit configuration with price on request and no area → validation error "Add an area or a price".
- Maps key present but the script fails to load → falls back to inputs + embed with a toast.

## 8. Acceptance criteria
- [ ] Tabs 1–6 implement every field of §6.1 for their scope with the visibility rules of `fieldRules.js`; saving persists them (verify `GET /api/admin/properties/<id>` JSON).
- [ ] Locality quick-create, map preview/pin, price preview, pricePerSqft auto-compute, gallery cover/alt/reorder all work.
- [ ] Unit tests pass; `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run smoke` pass; no console warnings.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run dev   (then) npm run smoke
```
Manual QA (desktop + 390 px): edit property 1 → change price to 15000000 → preview "₹1.5 Cr", pricePerSqft recomputed; set listingType Rent → confirm → rent fields; add a nearby metro station; quick-create locality "Test Nagar"; add 2 images by URL, set cover, leave alt empty → Save → error badge on Media; fill alt → Save → reload → persisted; add a unit configuration and "Apply as pricing range".

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 19 report; Pending rewrites: "description textarea → RichTextEditor (32)"; next prompt: 20.
- `docs/DECISIONS.md`: D42 (Maps JS injection), D67, D69, D71, floors-on-basics decision, pricePerSqft manual tracking.

## 11. Commit
`git add -A && git commit -m "feat(properties): form tabs basics, location, pricing, area/configuration, unit configurations and media"`

## 12. Guardrails
- Do not touch: public pages, mock server, `db.json`, `theme.js`, `global.css`, legacy `property-tabs/*` (deleted in 21).
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (every legacy tab field of these areas — gallery, basic info, overview, nearby places — has a home in the new tabs).
