# Prompt 21 — Property form tabs 13–16 (Similar, Section visibility, Agent, SEO placeholder), publish flow polish, legacy form removal

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §6.1 `similarPropertyIds/sectionVisibility/agent/seo`, §9.6, §13 D86/D87), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–20 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
Tabs 1–12 are done. Legacy: `SimilarPropertiesTab.jsx` (fetches all properties, search, select), `SectionVisibilityTab.jsx` (13 toggles, asymmetric `undefined` bug), `SeoTagsTab.jsx` (seoTitle/description/keywords/canonical/og/twitter/schema textarea + `calculateSeoScore` + auto-generate from `seoGenerator.js` + duplicated tags chips), no agent tab. `src/utils/seoScoring.js` and `seoGenerator.js` still exist (replaced by `src/seo` in 35–36). The legacy `PropertyForm.jsx` + `property-tabs/*` + `legacyProperty.js` adapter (form part) are still in the tree. `EntityPicker` supports `orderable`; `useTeamMembers` does not exist yet (add to `useMasterData.js` via `masterDataService.team.list()` — team is not in the context; load on demand).

## 2. Objective
When this prompt is finished the property form is complete except the SEO panel internals: **Similar properties** (search-as-you-type over active properties, max 6, drag order, cards with thumbnail/price/locality, "Suggest similar" button using `propertyService.similar(id)`), **Section visibility** (18 toggles with labels/descriptions and a live "no data" hint per section computed from the current values by the same `getVisibleSections` utility the public page will use — create `src/utils/propertySections.js` now), **Agent** (team member select that copies display fields, or manual name/phone/whatsapp/email/photo, `showOnListing`), **SEO** tab hosting `SeoPanelPlaceholder` (renders the raw `seo.title/description/focusKeyword/slug` fields with counters so SEO can be edited today; the full `SeoPanel` replaces it in prompt 36). Publish flow polish: "Save & view" opens the public page; a "Preview" link when inactive uses the admin token? — no preview tokens for properties: decision — inactive properties can be viewed by admins at `/properties/<slug>?preview=admin` only when logged in (public route checks `useAdminAuth().isAuthenticated` and calls `propertyService.adminGet` by slug? The admin API is by id → add `GET /admin/properties/slug/:slug` to the mock/registry). Legacy form files are deleted; `legacyProperty.js` shrinks to what `PropertyDetails`/`PropertyListing` still need (removed fully in 26).

## 3. Scope
### Files to create
- `tabs/SimilarPropertiesTab.jsx`, `SectionVisibilityTab.jsx`, `AgentTab.jsx`, `SeoPlaceholderTab.jsx` (+ css)
- `src/utils/propertySections.js` (`SECTION_DEFINITIONS` = ordered list `{ key, label, description, hasData(property) }` for the 18 keys; `getVisibleSections(property)` → `[{ key, label, anchor }]` where `sectionVisibility[key] !== false && hasData(property)`; `getSectionHints(values)` for the admin tab), `src/utils/__tests__/propertySections.test.js`
- Tests: `__tests__/SimilarPropertiesTab.test.jsx`, `__tests__/SectionVisibilityTab.test.jsx`
### Files to modify
- `tabs.js`, `validators/property.js`, `src/hooks/useMasterData.js` (`useTeamMembers`), `src/services/endpoints.js` + `mock-server/routes/properties.js` (`GET /admin/properties/slug/:slug`), `scripts/smoke-api.js` (new endpoint), `src/pages/public/PropertyDetails.jsx` (admin preview of inactive via `?preview=admin`), `src/utils/adapters/legacyProperty.js` (remove form-only mappings), `docs/*`
### Files to delete
- `src/pages/admin/PropertyForm.jsx`, `src/pages/admin/property-tabs/` (whole folder), `src/components/admin/imageFieldConfig.js` (if still present)
### May also touch
- import fixes; `src/utils/seoGenerator.js`/`seoScoring.js` stay until 36 (only `AdminSeo.js` legacy uses them)

## 4. Detailed tasks
1. **`propertySections.js`** — `SECTION_DEFINITIONS` in public display order: `overview` (description or highlights), `highlights` (highlights ≥ 1), `unitConfigurations` (active unit configs ≥ 1), `specifications` (specifications ≥ 1 or constructionSpecs ≥ 1), `amenities` (≥ 1), `floorPlans` (≥ 1), `gallery` (images ≥ 2), `video` (videoUrl), `virtualTour` (virtualTourUrl), `documents` (documents ≥ 1 or brochureUrl), `construction` (timeline ≥ 1 or progress != null; only pre-launch/under-construction), `builder` (project.developerId), `nearby` (nearbyPlaces ≥ 1), `location` (latitude+longitude or locality), `finance` (listingType sale && (pricing.price || priceRangeMin) && at least one active bank — the bank condition is passed in via `context.banksAvailable`), `faqs` (≥ 1), `similar` (similarPropertyIds ≥ 1 || `context.similarAvailable`), `enquiry` (always true). `getVisibleSections(property, context)`; `getSectionHints(values, context)` → per key `{ enabled, hasData, hint }` ("No data yet — add images in Media"). Tests cover each rule.
2. **Similar tab.** `EntityPicker` in `orderable` mode over `propertyService.adminList({ q, isActive: true, perPage: 10 })` excluding self, `max 6`, option renders thumbnail/title/locality/price; selected list as `SortableList` cards; "Suggest similar" → `propertyService.similar(propertyId)` (edit mode only) → adds up to 6 not yet selected (confirm). Validation ≤ 6, no self.
3. **Section visibility tab.** 18 rows: switch, label, description, hint chip ("No data" warning tone when enabled but empty; "Hidden" muted when disabled) via `getSectionHints(values, { banksAvailable: useBanks().length > 0 })`; "Enable all"/"Disable all"; the toggle writes booleans explicitly (no `undefined` asymmetry).
4. **Agent tab.** Mode radio: "Team member" (select from `useTeamMembers()` — copies name/phone/whatsapp/email/photo into the agent fields as defaults, keeps `teamMemberId`) or "Manual"; fields name, phone (Indian mobile validation), whatsapp, email, photo (`ImageField` hint `avatar`), `showOnListing` switch with the hint "Contact details appear on the public page only when on"; preview card.
5. **SEO placeholder tab.** Fields `seo.title` (counter /60), `seo.description` (/160), `seo.focusKeyword`, `seo.slug` (read-only mirror of the slug with a link to Basics), plus an `Alert`: "The full SEO panel (analysis, previews, social, advanced) is added in a later step." Writes through the reducer (`seo.*`).
6. **Admin preview of inactive properties.** Mock + registry: `GET /admin/properties/slug/:slug` (admin/manager/sales view). `PropertyDetails.jsx` (legacy layout, rewritten in 23): when `?preview=admin` and `isAuthenticated`, fetch via the admin endpoint and show a top banner "Admin preview — this property is not published" with `noindex`; otherwise unchanged. The rail's "View on site" becomes "Preview" (with `?preview=admin`) when inactive.
7. **Delete the legacy form** and every import of `property-tabs/*` (search `TAG_OPTIONS`, `SECTION_VISIBILITY_CONFIG`, `AMENITY_CATEGORIES`, `NEARBY_TYPES`, `CONFIGURATION_OPTIONS`, `DRAFT_STORAGE_KEY`, `generateSlug` usages — replace with enums/utils); `AdminProperties.js` still lists (rewritten in 22) — keep it compiling.
8. **Publish polish.** Save menu: primary "Save", split menu "Save & view/preview", "Save as inactive"; after the first save of a new property the URL is replaced; keyboard shortcut Ctrl/Cmd+S triggers Save (prevent default); toast messages: "Property saved", "Property published" (when `isActive` turned on), "Saved as inactive".
9. Tests; format; update `docs/DATA_MODEL.md` if `SECTION_DEFINITIONS` labels differ from §6.1 keys (they must not).

## 5. Data contract touched
New endpoint: `GET /admin/properties/slug/:slug` (mock + registry + smoke + docs). Consumed: `GET /admin/properties?q=&isActive=true`, `GET /properties/:id/similar`, `GET /team`.

## 6. UI/UX requirements
Similar cards with drag handles; visibility rows 56 px with hint chips; agent preview card mirrors the public agent card; SEO placeholder fields with counters coloured (muted/success/warning); Ctrl+S hint in the rail; sticky bottom bar on mobile.

## 7. Edge cases that must work
- Selecting a 7th similar property → blocked with a message; removing one re-enables.
- Team member changed after manual edits → confirm before overwriting agent fields.
- Visibility "finance" shows "Hidden automatically — no active banks" when banks are empty.
- Inactive property `?preview=admin` without login → 404 (no leak); with login → banner + page.
- After deleting the legacy folder, `npm run build:ci` passes and no `property-tabs` import remains (`grep -rn "property-tabs" src` → 0).

## 8. Acceptance criteria
- [ ] Tabs 13–16 persist their fields; visibility hints reflect data; agent copy from team member works; SEO placeholder edits save.
- [ ] `propertySections.js` tests pass and the utility is exported for the public page (used in 23).
- [ ] Legacy `PropertyForm.jsx`/`property-tabs/` deleted; admin preview endpoint works; smoke updated and passing.
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
Manual QA (desktop + 390 px): edit property 1 → Similar: search "villa", add 2, suggest → 6 max; Visibility: disable "video" (no URL) → hint changes; Agent: pick a team member → fields filled; SEO: set title/description → Save → reload → persisted; create a new inactive property with images → "Preview" opens `/properties/<slug>?preview=admin` with the banner; log out → same URL → 404.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 21 report; Pending rewrites: remove "legacy PropertyForm"; keep "SeoPlaceholderTab → SeoPanel (36)", "legacyProperty adapter for details/listing → 23/26"; Known issues: BUG-04 closed (form side), BUG-06 utility created (public wiring in 23), BUG-01 form side closed; next prompt: 22.
- `docs/DECISIONS.md`: D86, D87, admin preview decision (`?preview=admin` + admin slug endpoint).

## 11. Commit
`git add -A && git commit -m "feat(properties): similar/visibility/agent/seo tabs, admin preview, publish polish; remove legacy form"`

## 12. Guardrails
- Do not touch: `theme.js`, `global.css`, `db.json`, public listing.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (every legacy `SeoTagsTab` field is either in the placeholder now or explicitly scheduled for 36: keywords → focus/secondary, canonical/og/twitter/schema → panel).
