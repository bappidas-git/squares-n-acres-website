# Prompt 20 — Property form tabs 7–12: Amenities, Highlights & specifications, Floor plans, Documents, Project & builder, FAQs (+ suggested FAQs)

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §6.1 `amenityIds/specifications/constructionSpecs/floorPlans/documents/project/constructionTimeline/faqs`, §6.17 `SPEC_GROUPS`/`DOCUMENT_TYPES`/`TIMELINE_STATUS`/`PROJECT_APPROVALS`, §13 D39/D40/D62/D64/D66), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–19 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
Tabs 1–6 are done; tabs 7–16 are placeholders in `tabs.js`. Legacy tabs to be replaced: `AmenitiesTab.jsx` (grouped checkboxes + custom amenity dialog), `HighlightsTab.jsx` (specialities icon/name/description), `DetailsTab.jsx` (specifications key/value/icon with a slow drag), `ConstructionSpecsTab.jsx` (grouped area/spec rows), `FloorPlansTab.jsx` (config/area/price/image/bedrooms/bathrooms + brochure/pdf URLs), `DocumentsTab.jsx` (name/icon/url), `DeveloperTab.jsx` (free text developer + stats), `ConstructionStatusTab.jsx` (label/status/icon timeline), `FaqsTab.jsx`. Master data hooks `useAmenitiesGrouped`, `useDevelopers`; `EntityPicker`, `SortableList`, `IconPicker`, `ImageField`, `MultiSelect`; `DeveloperFormPage` exists (quick-create uses `masterDataService.developers.create({ name })`). Rich answers use a textarea until 32.

## 2. Objective
When this prompt is finished tabs 7–12 are complete: **Amenities** (master-data grouped checkboxes with search, "select all in group", selected count, missing-amenity link to master data), **Highlights & specifications** (highlights list with reorder; specifications repeater grouped by `SPEC_GROUPS` with icon; construction specifications repeater grouped by `SPEC_GROUPS`), **Floor plans** (repeater: title, image, PDF, area/unit, bedrooms, price, reorder; "Generate from unit configurations"), **Documents** (repeater: title, URL, type, lead-gated, reorder; brochure summary), **Project & builder** (developer `EntityPicker` with quick-create, project stats, approvals multi-select, landmark switch, construction timeline repeater with status/date/image/note and progress %, "auto progress from milestones"), **FAQs** (repeater question/answer (textarea → editor in 32) with reorder and a "Generate suggested FAQs" button that prefills 5 property-specific Q&As from the current values without overwriting existing ones).

## 3. Scope
### Files to create
- `tabs/AmenitiesTab.jsx`, `HighlightsSpecificationsTab.jsx`, `FloorPlansTab.jsx`, `DocumentsTab.jsx`, `ProjectBuilderTab.jsx`, `FaqsTab.jsx` (+ css)
- `components/SpecificationsRepeater.jsx` (used twice with different field sets), `TimelineRepeater.jsx`, `DeveloperQuickCreateDialog.jsx`, `suggestFaqs.js` (pure function `suggestFaqs(values, context)` → `[{question, answer}]`)
- Tests: `__tests__/suggestFaqs.test.js`, `__tests__/AmenitiesTab.test.jsx` (group select-all, search), `__tests__/TimelineRepeater.test.jsx` (auto progress)
### Files to modify
- `tabs.js`, `validators/property.js`, `docs/*`
### Files to delete
- none (legacy tabs in 21)
### May also touch
- `src/hooks/useMasterData.js` (developer search helper)

## 4. Detailed tasks
1. **Amenities.** Search box filters across groups; each `AMENITY_CATEGORIES` group renders as a `FormSection` with a header checkbox (indeterminate/select-all), amenity chips-with-checkbox (icon + name), count "12 selected"; commercial groups shown first for commercial segment; hidden groups when the search has no match; footer "Missing an amenity? Add it in Master data → Amenities" link (new tab). Writes `amenityIds` (sorted by group/order).
2. **Highlights & specifications.** Highlights: `SortableList` of text rows (max 12, each ≤ 140 chars; "Add highlight"; import button "From short description" splits sentences). Specifications: `SpecificationsRepeater` grouped by `SPEC_GROUPS` (`label`, `value`, optional `icon` via `IconPicker`); "Add row to <group>", drag within group, empty groups collapsed; the old `DetailsTab` per-drag O(n) updates replaced by a single `moveItem`. Construction specifications: the same repeater without icons (`group`, `label`, `value`) with presets "Add standard rows" that inserts common labels per group (Structure: RCC framed structure; Flooring: Living/Dining, Bedrooms, Kitchen, Balconies; Kitchen: Counter, Sink; Doors & Windows: Main door, Internal doors, Windows; Bathroom: Sanitary ware, CP fittings; Electrical: Wiring, Switches, Power backup; Walls & Painting: Internal, External; Security: CCTV, Intercom; Lift & Common Areas: Lifts, Lobby) with empty values.
3. **Floor plans.** `SortableList` cards: title, `ImageField` (hint `floorPlan`, required), `pdfUrl`, `area` + `areaUnit`, bedrooms, price; "Add floor plan"; "Generate from unit configurations" creates one floor plan per unit configuration that has a `floorPlanImageUrl` (skips existing titles); validation: title + image required.
4. **Documents.** `SortableList` rows: title, url (PDF/any), type (`DOCUMENT_TYPES`), leadGated switch (default on), reorder; header card summarising `brochureUrl` from Media with a link to the Media tab; validation title + url.
5. **Project & builder.** Developer: `EntityPicker` over `useDevelopers()` (client search) + "Add new developer" → `DeveloperQuickCreateDialog` (name, website optional) → `masterDataService.developers.create` → `refresh('developers')` → select; project stats: totalUnits, totalTowers, totalFloors, projectAreaAcres, openAreaPercent (0–100), launchDate (`DateField`), approvals (`MultiSelect` from `PROJECT_APPROVALS` — when `rera` is selected and `reraRegistered` is false, show a hint linking to Basics), landmarkProject switch. Construction timeline (`TimelineRepeater`): rows milestone, status (`TIMELINE_STATUS`), date, imageUrl, note, reorder; presets "Add standard milestones" (Foundation, Structure, Masonry, Finishing, Handover); `constructionProgressPercent` number with "Auto from milestones" (completed/total × 100 rounded) and a progress bar; this section is highlighted (not hidden) for ready-to-move/resale with the hint "Optional for completed properties".
6. **FAQs.** `SortableList` rows: question (10–200), answer (textarea, HTML; editor in 32), reorder, remove; "Generate suggested FAQs" → `suggestFaqs(values, { locality, propertyType, developer })` returns up to 5 items not already present (matched by normalised question): price ("What is the price of <title>?" → from pricing/units), possession/status ("When is <project> ready for possession?" → possessionDate / ready), RERA ("Is <title> RERA registered?" → number or "Registration details will be shared on request"), amenities ("What amenities does <title> offer?" → top 8 names), locality ("Where is <title> located?" → locality/city + top 3 nearby places), configuration ("What configurations are available?" → unit names) — answers as `<p>` HTML, phrased without claims beyond the data (tests cover each branch and the no-duplicate rule).
7. Validators extended; tabs wired; tests; format.

## 5. Data contract touched
Consumed: `POST /admin/developers` (quick create), `GET /amenities`, `/developers` via context. No mock changes.

## 6. UI/UX requirements
Grouped sections with sticky group headers on desktop; chips 44 px tall; repeater rows compact (label/value inline ≥ 900 px); timeline rows with status colour dot (tones); progress bar with percent; suggested FAQ items appear in a preview dialog with checkboxes ("Add selected"); everything keyboard-operable; error badges per tab.

## 7. Edge cases that must work
- Selecting all in "Sports" then unchecking one → header becomes indeterminate.
- Generating floor plans twice does not duplicate.
- Auto progress with 0 milestones → 0 and the button disabled.
- Quick-created developer duplicate name → server 409 → dialog inline error.
- Suggested FAQs when pricing is on request → price answer says "Price is available on request"; when no amenities → the amenities question is not suggested.
- FAQ answer with `<script>` → client validation error (no scripts allowed) — sanitisation is enforced in 32; here a simple regex block.

## 8. Acceptance criteria
- [ ] Tabs 7–12 persist every field of their scope (verify JSON); presets/generators work; developer quick-create works.
- [ ] `suggestFaqs` unit tests pass (each branch + dedupe); amenities/timeline tests pass.
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
Manual QA (desktop + 390 px): edit property 2 (under construction) → Amenities: search "pool", select all in Lifestyle; Highlights: reorder; Specifications: add standard construction rows and fill two; Floor plans: generate from unit configurations; Documents: add a price list (not gated); Project: quick-create "Test Developers", add standard milestones, mark two completed → auto progress 40 %; FAQs: generate suggestions → add 3 → Save → reload → all persisted; public page (legacy layout) still renders.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 20 report; Pending rewrites: "FAQ answers textarea → editor (32)"; next prompt: 21.
- `docs/DECISIONS.md`: D39, D40, D62, D64, D66, presets lists, suggestion phrasing policy.

## 11. Commit
`git add -A && git commit -m "feat(properties): form tabs amenities, highlights/specs, floor plans, documents, project/builder, FAQs with suggestions"`

## 12. Guardrails
- Do not touch: public pages, mock server, `db.json`, `theme.js`, `global.css`, legacy `property-tabs/*`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (every legacy field of Amenities/Highlights/Details/ConstructionSpecs/FloorPlans/Documents/Developer/ConstructionStatus/FAQs tabs is covered).
