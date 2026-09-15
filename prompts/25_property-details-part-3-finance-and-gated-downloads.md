# Prompt 25 — Property details part 3: documents & brochure with real downloads, FinanceGuide refactor (banks, EMI, FOIR assessment, eligibility), similar properties, enquiry section, recently viewed

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §6.1 `documents/brochure`, §6.6 banks, §6.7 leads (`meta`), §11 BUG-07/BUG-08/BUG-05 (finance), §13 D56/D57/D86), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–24 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
Remaining legacy sections: `PropertyDocuments.jsx` (never delivers files), `FinanceGuide.jsx` (1 808 lines: tabs "Know Your Eligibility" (FOIR assessment form → score → thank-you), "Bank Loan Assistance" (bank cards from `useBanks()` since 15, "Processing Fee 0.5% + GST" hardcoded, eligibility modal per bank), "EMI Projections" (sliders loanPercent 50–90 default 80, rate 6–14 default 8.5, tenure 5–30 default 20; formulas documented in `00_MASTER_CONTEXT` inventory: `emi = P·r·(1+r)^n/((1+r)^n−1)`, FOIR 60 %, `monthlyIncomeValues`/`emiNumericValues` lookup tables, score bands Excellent ≥ 75 / Good ≥ 50 / Moderate ≥ 25 / Needs improvement), lead bodies with `assessmentData`), `SimilarProperties.jsx` (ignores `similarPropertyIds`), `EnquiryForm.jsx` (mounted thrice). `utils/finance.js` has `estimateEmi`. `LeadModalTemp` and `leadStorage.unlock/isUnlocked` exist. The mock's `GET /properties/:id/similar` implements the admin-first rule; `POST /leads` accepts `meta`.

## 2. Objective
When this prompt is finished the details page is complete: **Documents & brochure** section (brochure card + document rows; lead-gated items blur/lock → lead modal (`brochure-download` / `document-request`) → on success the file **actually opens** (`window.open(url, '_blank', 'noopener')` — attempted synchronously inside the success handler to avoid popup blocking, plus a visible "Open file" button in the success state) and the unlock persists; non-gated items open directly; `brochure_download` analytics event), **Finance guide** refactored into `src/components/sections/property/finance/` sub-components ≤ 300 lines each (`FinanceSection`, `BankCards`, `EmiCalculator`, `EligibilityAssessment` (FOIR form → score → recommendations → thank-you), `EligibilityModal` (per bank), `financeCopy.js`) using `useBanks()` (hidden when no active bank or not a sale listing), `utils/finance.js` for all math (`estimateEmi`, `emiBreakdown`, `foirScore`, `eligibleLoan`, `affordableProperty`, lookup tables, bands), lead sources `financial-assessment` / `bank-eligibility` with `meta` = assessment answers + score (+ bank), honest copy (no "48 hrs"/"lowest rate"/"processing fee" claims — bank facts only from records), success only after the POST succeeds; **Similar properties** (`propertyService.similar(id)` carousel of `PropertyCard`s, admin-selected first), **Enquiry section** (single `LeadForm` block, source `property-enquiry`, prefilled message, hidden when `sectionVisibility.enquiry` false), **Recently viewed** strip (from `sna_recent_properties`, excluding the current). Legacy components deleted.

## 3. Scope
### Files to create
- `src/components/sections/property/DocumentsSection.jsx` (+ css), `SimilarSection.jsx`, `EnquirySection.jsx`, `RecentlyViewedSection.jsx`, `src/components/common/RecentlyViewed.jsx` (shared strip; used again by the listing sidebar in 26)
- `src/components/sections/property/finance/FinanceSection.jsx`, `BankCards.jsx`, `BankCard.jsx`, `EmiCalculator.jsx`, `EligibilityAssessment.jsx`, `AssessmentForm.jsx`, `AssessmentResult.jsx`, `EligibilityModal.jsx`, `financeCopy.js`, `finance.module.css`
- `src/utils/finance.js` (extend), `src/utils/__tests__/finance.test.js` (extend), `src/components/sections/property/finance/__tests__/AssessmentForm.test.jsx` (validation, conditional fields), `__tests__/EmiCalculator.test.jsx`, `src/components/sections/property/__tests__/DocumentsSection.test.jsx` (gated → unlock → open)
### Files to modify
- `src/pages/public/PropertyDetails.jsx` (wire `documents`, `finance`, `similar`, `enquiry` + recently viewed under the sections), `src/utils/leadStorage.js`, `src/utils/analytics.js` (events), `docs/*`
### Files to delete
- `PropertyDocuments.jsx`, `FinanceGuide.jsx` (+ css), `SimilarProperties.jsx`, `EnquiryForm.jsx` (+ css), `src/components/sections/property/SectionPlaceholder.jsx`
### May also touch
- `src/components/common/LeadForm.jsx` (add `meta`/`hiddenFields`/`onSuccess` if 23 did not — the full rewrite is 28)

## 4. Detailed tasks
1. **Documents.** Brochure card (when `brochureUrl`): icon, "Project brochure (PDF)", button "Download brochure" → if `brochureLeadGated && !isUnlocked(id,'documents')` → `LeadModalTemp` (source `brochure-download`, `onSuccess: () => { leadStorage.unlock(id,'documents'); openFile(url); track('brochure_download', { propertyId }) }`) else `openFile`. Document rows: title, type chip (`DOCUMENT_TYPES`), lock icon when gated and locked, button "Open" (gated → lead modal source `document-request` with `message: 'Requested: <title>'`, then open). `openFile(url)` = `window.open(url, '_blank', 'noopener,noreferrer')`; if the browser blocked it (returns null), show a toast with a clickable link. Success state of the modal shows "Your file is ready — Open <title>" button. Unlocks persist per property (`sna_lead`).
2. **Finance section** (`FinanceSection`): shown only when `visibleSections` includes `finance` (sale + price + active banks); tabs: "Check eligibility", "Bank loans", "EMI calculator". `BankCards`: from `useBanks()` sorted by `order`; card = logo/name, "Interest from X % p.a." (`interestRateMin`), "Up to Y % of property value" (`maxLtvPercent`), "Tenure up to Z years", `features` chips, `processingFeeNote` only if present, "Check eligibility" → `EligibilityModal(bank)`, "Apply" link when `applyUrl`; show 3 then "View all banks". `EmiCalculator`: property price (or range min), sliders loan % (50–`maxLtvPercent` of the best bank, default 80), rate (min bank rate default; 6–15), tenure (5–max tenure default 20); outputs monthly EMI, principal/interest split bar, totals; tip "Increasing your down payment to X % saves ~₹Y in interest" computed with `emiBreakdown` (no hardcoded 8 %). `EligibilityAssessment` (inline tab) and `EligibilityModal` (per bank) share `AssessmentForm` (fields exactly as the legacy: name, phone, e-mail optional, occupation chips, employmentYears, monthlyIncome select (+ exact amount), existingEmi (+ emiTenure), creditScore chips, downPayment slider 10–50 (default 20), coApplicant toggle + income) and `AssessmentResult` (score circle, band, "Eligibility breakdown" (max EMI capacity, available EMI, estimated eligible loan, affordable property value), recommendations (rules from the legacy: credit, EMIs, down payment, co-applicant) + advisor line, disclaimer, "Done"/"Retake"). Submit → `leadService.create({ name, phone, email, source: 'financial-assessment' | 'bank-eligibility', propertyId, message: <summary line>, meta: { score, occupation, employmentYears, monthlyIncome, exactMonthlyIncome, existingEmi, emiTenure, creditScore, downPayment, hasCoApplicant, coApplicantIncome, propertyPrice, bank? } })` → **only on success** show the result (on error: inline error + retry); `leadStorage.save(details, propertyId, source)` + unlock all kinds (D: an assessment counts as identification). Copy in `financeCopy.js` (band messages, disclaimer "Squares N Acres is not a bank, NBFC or financial institution…", no marketing claims).
3. **`utils/finance.js`**: `MONTHLY_INCOME_VALUES`, `EMI_NUMERIC_VALUES`, `FOIR = 0.6`, `monthlyIncomeOf(data)` (adds co-applicant income when `hasCoApplicant === 'yes'` — D57), `foirScore(data)`, `eligibleLoan(data, rate = 8.5, years = 20)`, `affordableProperty(eligibleLoan, downPaymentPercent)`, `scoreBand(score)`, `estimateEmi`, `emiBreakdown({ price, loanPercent, rate, years })`, `recommendations(data, score)`; all pure, fully tested (bands, co-applicant effect, zero income, tenure edge).
4. **Similar:** `useApi(() => propertyService.similar(id))`; `Carousel` of `PropertyCard` (compact), H2 "Similar properties"; hidden when empty (visibility rule uses `similarAvailable` = fetched length > 0 — update `context` after fetch so the nav item appears only when data exists).
5. **Enquiry section:** `LeadForm` (title "Interested in <title>?", fields name/phone/email/message prefilled "I'm interested in <title>", source `property-enquiry`, `propertyId`), success → unlock all kinds + WhatsApp/Call follow-ups; only one form on the page (the price-card CTAs open the modal).
6. **Recently viewed:** `RecentlyViewed` strip (cards from storage, excluding current; hidden when < 1); placed after Similar.
7. Delete the legacy components + placeholder; wire; tests; format; run a full property page audit (every section key ↔ component).

## 5. Data contract touched
Consumed: `GET /properties/:id/similar`, `POST /leads` (sources `brochure-download`, `document-request`, `financial-assessment`, `bank-eligibility`, `property-enquiry` with `meta`). Storage: `sna_lead` unlocks, `sna_recent_properties`.

## 6. UI/UX requirements
Documents rows 56 px with type chips; gated items show a lock; finance tabs consistent with the UI kit; sliders with visible values and labels; result cards with tones; modal full-screen on mobile; similar carousel 3/2/1.15; enquiry form on surface; recently viewed horizontal scroll on mobile; all copy honest and India-specific.

## 7. Edge cases that must work
- Popup blocked → toast with a direct link; the success state always offers an "Open" button.
- Non-gated document → opens immediately without any modal.
- Assessment POST fails → error stays on the form, no score shown; retry works.
- `existingEmi` "0" → no tenure field; `hasCoApplicant` yes without income → income ignored.
- Bank with `maxLtvPercent` 75 → loan slider capped at 75.
- Property in a session where the user already enquired → documents/floor plans already unlocked, brochure opens directly.
- Similar returns 0 → section and nav item absent.

## 8. Acceptance criteria
- [ ] Brochure/document/floor-plan gated flows deliver the actual file after the lead (BUG-08 closed); non-gated open directly.
- [ ] Finance section: bank cards from data only, EMI calculator correct (unit-tested formulas), assessment/eligibility create leads with `meta` (visible in the mock db) and show results only after success.
- [ ] Similar uses the API rule; single enquiry form; recently viewed works; legacy components deleted (`FinanceGuide.jsx` gone; each finance file ≤ 300 lines).
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
Manual QA (desktop + 390 px): property 1 → Download brochure → lead → PDF opens in a new tab; document "Price list" (not gated) opens directly; finance → EMI sliders; run the assessment → score; check `/admin/leads` shows the lead with source "Financial Assessment" (meta visible in 29); similar carousel shows admin-selected first (compare with `similarPropertyIds`); visit two properties → recently viewed strip on the third.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 25 report; Known issues: BUG-05, BUG-07, BUG-08 closed; additional defects 12, 13 closed; Pending rewrites: "LeadModalTemp/LeadForm → 28"; next prompt: 26.
- `docs/DECISIONS.md`: D56, D57, assessment-unlocks decision, popup fallback.

## 11. Commit
`git add -A && git commit -m "feat(property-details): real gated downloads, finance guide refactor with honest copy, similar/enquiry/recently viewed"`

## 12. Guardrails
- Do not touch: admin, mock server (except nothing), `db.json`, `theme.js`, `global.css`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, HOM traces, or marketing claims not backed by data.
- Do not reduce or remove existing functionality (every FinanceGuide feature — bank cards, FOIR assessment, EMI calculator, per-bank eligibility — survives).
