# Prompt 28 — Lead capture unification: `LeadForm`, `LeadCaptureModal`, `LeadCaptureContext`, `leadStorage`, canonical sources for every entry point, spam protection, WhatsApp/call tracking, analytics events

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §5.11 rate limiting/honeypot, §6.7 leads, §6.17 `LEAD_SOURCES`, the master spec LEAD-01/LEAD-04/UX-09/UX-10/DET-03, §13 D43/D56/D82/D91), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–27 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
`src/components/common/LeadForm.jsx` (legacy contract: `title, subtitle, fields[], source, propertyId, className`; validation ignores `required:false` for name/phone; no labels; no `onSuccess`; posts raw values) is used by the FAQs page, locality/developer CTAs, the property enquiry section and (until 30) the legacy static pages (`Contact.jsx`, `Careers.jsx`, `HomeLoan.jsx`, `LegalAssistance.jsx`, `InteriorDesigning.jsx`, `SellLet.jsx`, `Partnership.jsx`, `FlexibleWorkspace.jsx`, `DirectLeaseRetails.jsx`, `RealEstateAwareness.js`, `About.jsx`, `ArticleDetail.js`, `Articles.js`) with legacy source strings (`contact`, `careers`, `home_loan`, `legal_assistance`, `interior_design`, `sell_let`, `partnership`, `flexible_workspace`, `direct_lease_retails`, `real_estate_awareness`, `faq_contact`, `article_detail`, `newsletter_articles`) that the mock maps through `LEGACY_LEAD_SOURCE_MAP`. `LeadModalTemp` (23) serves the property CTAs and the header "Post Requirement". `leadStorage` (`sna_lead`) stores details + unlocks. `NewsletterSection` posts to `/newsletter/subscribe`. `utils/analytics.js` `track()` exists. `validators.js` has name/email/phone rules.

## 2. Objective
When this prompt is finished there is **one** lead system: `LeadForm` (field config with visible labels, required flags honoured, requirement group, consent checkbox, honeypot, 10-second throttle, sanitised payload, `onSuccess`, server 422/429 handling, success state with WhatsApp/Call follow-ups), `LeadCaptureModal` (parameterised by `source`, `propertyId`, `title`, `fields`, `onSuccess`, `deliver` (file/unlock), remembers the visitor and skips the form for further gated items in the same session), `LeadCaptureContext` (`openLeadModal(options)` from anywhere — header CTA, bottom nav Enquire, CMS `cta` blocks later, property CTAs), `leadStorage` v2, every entry point mapped to the canonical `LEAD_SOURCES` (no legacy strings in `src/`), WhatsApp/call click tracking (`POST /leads` with `whatsapp-click`/`call-click` **only** when the visitor is already identified; otherwise only a `dataLayer` event), analytics events (`lead_submit`, `whatsapp_click`, `call_click`, `brochure_download`, `search`, `shortlist_add`), duplicate-lead hint prepared for admin (29). `LeadModalTemp` is deleted.

## 3. Scope
### Files to create
- `src/components/common/LeadForm.jsx` (rewritten) + css, `LeadCaptureModal.jsx` (+ css), `LeadSuccess.jsx`, `RequirementFields.jsx` (listingType, propertyTypeId, localityId, bedrooms, budget bucket → `budgetMin/Max`, timeline), `ConsentCheckbox.jsx`, `Honeypot.jsx`
- `src/contexts/LeadCaptureContext.js` (`LeadCaptureProvider`, `useLeadCapture()` → `{ openLeadModal, closeLeadModal, isIdentified, visitor }`)
- `src/utils/leadStorage.js` (rewritten: `getVisitor()`, `saveVisitor({ name, phone, email })`, `markCaptured(propertyId, source)`, `isCapturedFor(propertyId)`, `unlock(propertyId, kind)`, `isUnlocked`, `clear()`; sessionStorage `sna_lead`), `src/utils/leadSources.js` (`ENTRY_POINTS` map: entry key → `{ source, defaultTitle, fields }` for every entry point), `src/utils/analytics.js` (events + GA4 `gtag` bridge when configured)
- `src/components/common/WhatsAppButton.jsx` (floating; message includes title + URL on details pages; `useLeadCapture().isIdentified` → also posts a `whatsapp-click` lead), `CallButton.jsx` (same logic with `call-click`)
- Tests: `src/components/common/__tests__/LeadForm.test.jsx` (required flags, labels/aria, honeypot hidden, throttle, 422 mapping, success callback), `LeadCaptureModal.test.jsx` (skips the form when identified, delivers), `src/utils/__tests__/leadStorage.test.js`, `src/utils/__tests__/leadSources.test.js` (every `ENTRY_POINTS.source` ∈ `LEAD_SOURCES.values`)
### Files to modify
- `src/App.js` (`LeadCaptureProvider` + floating `WhatsAppButton` on public layout), `src/components/layout/MainLayout.jsx`, `Header.jsx`/`MobileDrawer.jsx`/`BottomNav.jsx` (use `openLeadModal`), every current `LeadForm`/`LeadModalTemp` consumer (property details sections: price card CTAs, unit configurations "Get price", floor plans/documents gating, enquiry section, finance assessments (keep their own forms but reuse `leadStorage`), locality/developer CTAs, FAQs page, article pages, legacy static pages (source strings only — pages are replaced in 30)), `src/components/common/NewsletterSection.jsx` (`newsletter` source + `Honeypot`), `docs/*`
### Files to delete
- `src/components/sections/property/LeadModalTemp.jsx`
### May also touch
- `src/components/common/PropertyCard.jsx` (`shortlist_add` event), `GlobalSearch.jsx` (`search` event)

## 4. Detailed tasks
1. **`LeadForm` contract:** props `{ source (required, must be in LEAD_SOURCES), propertyId, articleId, pageSlug, title, subtitle, fields = DEFAULT_FIELDS, hiddenFields = {}, meta, requirement (bool → renders RequirementFields), consent = true, submitLabel = 'Submit', successMessage, successActions = ['whatsapp','call'], variant: 'card'|'inline'|'modal', onSuccess(lead), compact }`. Field config `{ name, label, type: 'text'|'email'|'tel'|'textarea'|'select'|'number', required, placeholder, options, helper, half }`; defaults name (required), phone (required), email (optional), message (optional). Every input has a visible `<label>`, `aria-describedby` for errors/helper, `aria-invalid`; validation via `validators.js` (name 2–80 letters/spaces/dots/apostrophes; Indian mobile `^(\+91[-\s]?)?[6-9]\d{9}$` after stripping spaces/dashes; e-mail when present or required; required message "<Label> is required"); custom `select` values validated against options. **Honeypot** `website` (visually hidden, `tabindex=-1`, `autocomplete="off"`); **throttle** 10 s per form instance (button disabled with a countdown tooltip); **payload** `{ name, phone (normalised +91XXXXXXXXXX), email, message, source, propertyId, articleId, pageSlug, pageUrl: window.location.href, requirement, consent, utm (from the URL `utm_*` params, cached in sessionStorage `sna_utm` on first landing), meta, website: '' }` → `leadService.create`; 422 → field errors; 429 → toast "Too many requests, please wait a minute"; network → inline error with retry; success → `leadStorage.saveVisitor` + `markCaptured(propertyId, source)` + `track('lead_submit', { source, propertyId })` + `LeadSuccess` (message, WhatsApp button with prefilled text, Call button) + `onSuccess(lead)`. Prefill from `leadStorage.getVisitor()`.
2. **`LeadCaptureModal`** (`Modal` mobile sheet): `{ open, onClose, source, propertyId, title, subtitle, fields, requirement, deliver: { kind: 'unlock'|'file', unlockKind?, fileUrl?, fileLabel? }, onSuccess }`; when `leadStorage.getVisitor()` exists **and** `isCapturedFor(propertyId)` (or `source` is a gated kind and the property is unlocked) → skip the form: immediately deliver (open the file / unlock) and show a confirmation state "We have your details — opening <file>" (with the Open button for popup fallback) — also posts a lightweight lead? — decision: **no duplicate lead** for repeat gated actions in the same session; the first capture per property already exists (record). Otherwise show `LeadForm variant="modal"`; on success deliver + `onSuccess`.
3. **`LeadCaptureContext`**: provider holds one modal instance; `openLeadModal({ entry: 'post-requirement' | 'property-enquiry' | …, ...overrides })` reads `ENTRY_POINTS[entry]` for source/title/fields (post-requirement → `requirement: true`; site-visit → adds a preferred date field `preferredDate`; callback → `preferredTime` select; price-request/brochure/document/floor-plan → gated deliveries); used by header CTA, drawer CTA, bottom nav Enquire, property CTAs, CMS `cta` blocks (30), CTA band.
4. **`ENTRY_POINTS`** (every HOM entry point mapped): `property-enquiry`, `brochure-download`, `floor-plan-request`, `document-request`, `price-request`, `site-visit-request`, `callback-request`, `post-requirement`, `contact-page` (fields + subject select), `home-loan` (monthlyIncome/desiredLoanAmount selects), `financial-assessment`, `bank-eligibility`, `legal-assistance` (serviceType), `interior-design` (propertyType/budget), `sell-let` (propertyType/location/askingPrice/description), `careers` (message "Tell us about yourself"), `partnership` (companyName/partnershipType), `flexible-workspace` (workspaceType/teamSize), `direct-lease-retail` (spaceType/areaRequired), `real-estate-awareness` (interest), `newsletter` (subscriber flow, not a lead form), `article` (CTA), `faq`, `locality-page`, `developer-page`, `whatsapp-click`, `call-click`, `hero-search` (reserved; unused by search). Tests assert each entry's source is canonical and its `fields` are valid configs.
5. **Replace every consumer**: property details (price card CTAs → `openLeadModal({ entry: 'property-enquiry' | 'callback-request' | 'site-visit-request', propertyId, title })`, unit configurations "Get price" → `price-request`, floor plans → `floor-plan-request` with `deliver unlock`, brochure/documents → `brochure-download`/`document-request` with `deliver file`, enquiry section → `LeadForm` inline), locality/developer CTAs, FAQs page, article pages (30/35 keep), legacy static pages: replace legacy `source` strings with canonical ones and switch their custom forms (`Contact.jsx` bespoke form, `Careers.jsx` application modal — careers application stays a placeholder until 31) to `LeadForm` with `ENTRY_POINTS` fields so no legacy string remains in `src/` (`grep -rnE "source=['\"](contact|careers|home_loan|legal_assistance|interior_design|sell_let|partnership|flexible_workspace|direct_lease_retails|real_estate_awareness|faq_contact|article_detail|newsletter_articles|property_enquiry|website)['\"]" src` → 0). `NewsletterSection`: `Honeypot`, throttle, source `newsletter` (subscriber record; no lead).
6. **Floating WhatsApp + call tracking**: `WhatsAppButton` (fixed bottom-right above the bottom nav; hidden on admin, hidden when `settings.general.whatsappNumber` empty; message = `settings.general.whatsappDefaultMessage` + on property pages " — <title> <url>"); click → `track('whatsapp_click', { propertyId })` and, when `isIdentified`, `leadService.create({ ...visitor, source: 'whatsapp-click', propertyId, message: 'Clicked WhatsApp' })` (fire and forget; never blocks the link); `CallButton` similarly (`call-click`); header phone/WhatsApp buttons and agent card buttons use these components.
7. **Analytics (`analytics.js`)**: `track(event, params)` → `window.dataLayer.push({ event, ...params })` and `gtag('event', …)` when GA4 is configured (script injection happens in 38 via `<Seo>`); events wired: `lead_submit`, `whatsapp_click`, `call_click`, `brochure_download`, `floor_plan_download`, `search`, `shortlist_add`.
8. Delete `LeadModalTemp`; tests; format.

## 5. Data contract touched
Consumed: `POST /leads` (all sources; `utm`, `pageUrl`, `requirement`, `meta`, honeypot), `POST /newsletter/subscribe`. Storage: `sna_lead` (v2 shape), `sna_utm`.

## 6. UI/UX requirements
Forms: labels above fields, 44 px inputs, error text red-dark, consent checkbox with a short privacy line ("By submitting you agree to be contacted by Squares N Acres"), primary button full-width on mobile; modal sheet on mobile with a drag handle; success state with a check icon and two follow-up buttons; floating WhatsApp 56 px with `aria-label`, offset above the bottom nav/CTA bar; throttle countdown accessible (`aria-live`).

## 7. Edge cases that must work
- Honeypot filled (bot) → server returns 200 `data:null` → the form shows success without storing (indistinguishable to bots) — no client special-casing needed.
- Phone "+91 98765-43210" normalises; "12345" errors.
- Second gated action on the same property in the session → no form, immediate delivery; a different property → form prefilled.
- `openLeadModal` while another modal is open → replaces it.
- Newsletter duplicate → success message "You're already subscribed".
- `utm_*` present on the first landing and absent on the lead page → still attached.
- Sales/admin logged-in users are not treated as identified visitors.

## 8. Acceptance criteria
- [ ] Every lead entry point in the app uses `LeadForm`/`LeadCaptureModal` with canonical sources (grep in task 5 returns 0; `leadSources.test.js` passes); leads created from each entry appear in `/admin/leads` with the right source label.
- [ ] Gated flows skip the form when already identified; deliveries still happen; WhatsApp/call clicks create leads only for identified visitors.
- [ ] Honeypot, throttle, consent, 422/429 handling, prefill, success actions work; `LeadModalTemp` deleted.
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
Manual QA (desktop + 390 px): header "Post Requirement" → requirement fields → submit → admin lead with requirement; property brochure (new session) → form → PDF opens; second document → opens immediately; WhatsApp float → `wa.me` with the property text; `/insights/faqs` form; `/contact` (legacy page, canonical source `contact-page`); submit twice within 10 s → throttled; `dataLayer` shows events in the console (`window.dataLayer`).

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 28 report; Known issues: BUG-09, BUG-15 (client), additional defect 9 closed; Pending rewrites: remove `LeadModalTemp`; next prompt: 29.
- `docs/DECISIONS.md`: D43, D82, no-duplicate-gated-lead decision, identified-visitor rule.

## 11. Commit
`git add -A && git commit -m "feat(leads): unified LeadForm/LeadCaptureModal with canonical sources, spam protection, click tracking and analytics events"`

## 12. Guardrails
- Do not touch: admin lead screens (29), mock server, `db.json`, `theme.js`, `global.css`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (every legacy entry point keeps a lead form).
