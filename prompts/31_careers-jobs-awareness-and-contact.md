# Prompt 31 — Careers & jobs (CRUD, public job pages, applications with resume upload), Real Estate Awareness page, Contact finishing, newsletter subscribers admin

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §6.11 jobs/applications, §6.14 subscribers, §5.14 jobs/newsletter rows, §13 D12/D83/D91), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–30 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
Legacy `src/pages/public/Careers.jsx` (hardcoded jobs, application modal with a dead file input, `LeadForm` source `careers`) and `RealEstateAwareness.js` (hardcoded facts/education/quiz/checklist, `LeadForm` `real-estate-awareness`) still exist. The seed has the CMS `careers` page (features + `jobs` block + perks + `leadForm`) and `insights/real-estate-awareness` page (facts, expandableCards, quiz, checklist, leadForm); `JobsBlock` (30) lists jobs → `/careers/<slug>` (route missing). Mock: `GET /jobs`, `GET /jobs/slug/:slug`, `POST /jobs/:id/apply` (honeypot, rate limit, `resumeUrl` required url), admin jobs CRUD (`/admin/jobs`, slugged), `GET /admin/job-applications` (filters `jobId|status|q`), `PATCH|DELETE /admin/job-applications/:id`, `GET /admin/newsletter-subscribers` (+ export, delete). Cloudinary unsigned upload (`REACT_APP_CLOUDINARY_*` / settings) is wired in prompt 39 through `ImageField`; for résumés this prompt implements a minimal `uploadToCloudinary(file, { resourceType: 'auto' })` in `src/utils/cloudinary.js` (prompt 39 extends the same file) — when no cloud name/preset is configured the application form shows a "Résumé URL" field instead. `ContactInfoBlock` (30) renders settings; the Contact page is CMS-driven.

## 2. Objective
When this prompt is finished: admin `/admin/jobs` (`MasterDataPage` page form: title, slug, department, location, employment type, experience, description (textarea/editor in 32), responsibilities/requirements lists, salary range, active, postedAt, closesAt) and `/admin/jobs/applications` (list: candidate, job, status (quick change), résumé link, created; filters job/status/search; detail drawer with cover letter/LinkedIn/notes; delete); public `/careers` (CMS page) and `/careers/:jobSlug` (job detail: header with chips, description, responsibilities, requirements, salary, "Apply" form: name, e-mail, phone, résumé (Cloudinary upload of PDF/DOC/DOCX ≤ 5 MB with progress, or URL field), LinkedIn URL, cover letter, consent, honeypot → `POST /jobs/:id/apply` → success state; closed job → notice); `/insights/real-estate-awareness` served by the CMS page with the interactive `FactsBlock`/`ExpandableCardsBlock`/`QuizBlock`/`ChecklistBlock` (legacy file deleted); `/contact` verified (settings-driven info, map, working hours, social, form) — remove any leftover; admin `/admin/newsletter` (subscribers list with status filter/search, delete, export CSV). Legacy `Careers.jsx`/`RealEstateAwareness.js` deleted.

## 3. Scope
### Files to create
- `src/pages/admin/content/JobsPage.jsx`, `JobApplicationsPage.jsx` (+ css), `ApplicationDrawer.jsx`, `src/pages/admin/content/NewsletterSubscribersPage.jsx`
- `src/pages/public/JobDetail.jsx` (+ css), `src/components/sections/careers/JobHeader.jsx`, `JobApplyForm.jsx`, `ResumeUpload.jsx`
- `src/utils/cloudinary.js` (`isCloudinaryConfigured()`, `uploadToCloudinary(file, { resourceType, folder, onProgress })` using `XMLHttpRequest` for progress against `https://api.cloudinary.com/v1_1/<cloud>/auto/upload` with `upload_preset`; returns `{ url, publicId, bytes, format, width, height, resourceType }`), `src/utils/__tests__/cloudinary.test.js` (configured check; URL building; `cloudinaryUrl` transformation helper added here too: `cloudinaryUrl(url, { w, h, crop, quality: 'auto', format: 'auto' })` → injects `f_auto,q_auto,w_…` after `/upload/` for Cloudinary URLs, returns others untouched — with tests)
- Tests: `src/components/sections/careers/__tests__/JobApplyForm.test.jsx` (URL mode vs upload mode, validation, success), `src/pages/admin/content/__tests__/JobApplicationsPage.test.jsx` (status change)
### Files to modify
- `src/routes/publicRoutes.js` (`/careers/:jobSlug`; `/careers` and `/insights/real-estate-awareness` → `CmsPage`), `src/routes/adminRouteConfig.js`, `src/components/cms/blocks/JobsBlock.jsx` (links), `docs/*`
### Files to delete
- `src/pages/public/Careers.jsx` (+ css), `src/pages/public/RealEstateAwareness.js` (+ css)
### May also touch
- `src/components/common/LeadForm.jsx` (nothing expected)

## 4. Detailed tasks
1. **Jobs admin** (`MasterDataPage` config, page form): columns Title (+ slug), Department, Location, Type chip (`EMPLOYMENT_TYPES`), Applications count (add `applicationCount` (read) to `/admin/jobs` on the mock + registry), Active, Posted, Closes; filters `q`, `department`, `employmentType`, `isActive`; form fields as in §2 (`responsibilities`/`requirements` as `SortableList` text rows; `postedAt` default today; `closesAt` optional ≥ postedAt); delete guard (applications).
2. **Applications admin**: `DataTable` with filters job (`EntityPicker` jobs), status (`JOB_APPLICATION_STATUS`), search; columns Candidate (name + e-mail/phone), Job, Status (`StatusChip` menu → PATCH), Résumé (external link `rel="noopener"`), LinkedIn, Applied (`formatRelative`); row → `ApplicationDrawer` (all fields, cover letter, notes textarea → PATCH `notes`, status select, delete); bulk status/delete via client loop? — the contract has no bulk endpoint for applications: implement per-row only (record).
3. **Public job detail** (`/careers/:jobSlug`): `careerService.jobs.bySlug`; 404/closed states (`closesAt` past or inactive → notice "This opening is closed" + link to `/careers`); `JobHeader` (H1 title, chips department/location/type/experience, posted date, salary when present, Apply button → scrolls to the form); `LegacyHtml` description (→ `SafeHtml` 32); responsibilities/requirements lists; `JobApplyForm` (fields per §2; `ResumeUpload`: drag-drop/file input accepting `.pdf,.doc,.docx` ≤ 5 MB → `uploadToCloudinary` with progress bar and cancel; on success stores `resumeUrl`; when not configured → "Résumé link (Google Drive/Dropbox/URL)" required URL field; consent checkbox; honeypot; throttle; submit → `careerService.apply(jobId, payload)` → success state ("Application received"); 422/429 handling); breadcrumbs Home › Careers › Title; temporary Helmet.
4. **Careers page**: CMS page (`/careers` → `CmsPage` fixed slug) with `JobsBlock` (cards: title, department, location, type, "View & apply") and the general `leadForm` (source `careers`) — verify the seed page renders; delete `Careers.jsx`.
5. **Awareness page**: `/insights/real-estate-awareness` → `CmsPage` fixed slug (nested slug `insights/real-estate-awareness` in the seed) — verify facts/expandable cards/quiz/checklist/lead form; delete `RealEstateAwareness.js`. Breadcrumb Home › Insights › Real Estate Awareness.
6. **Contact**: confirm `/contact` renders `ContactInfoBlock` (phone/e-mail/WhatsApp/address/working hours/social from settings; hidden when empty), `LeadFormBlock` (`contact-page`, subject select), `MapBlock` (settings coords); no hardcoded contact anywhere (`grep -rn "98765\|Brigade Road\|(555)" src` → 0).
7. **Newsletter admin** (`/admin/newsletter`): `DataTable` (Email, Name, Source, Status chip, Subscribed at), filters `status`, `q`; delete (confirm); export CSV via `downloadAuthenticated(endpoints.adminNewsletterSubscribers.export)`; header count.
8. `cloudinary.js` helpers + tests (`cloudinaryUrl` used by `LazyImage` in 39); delete legacy pages; tests; format.

## 5. Data contract touched
Consumed: `GET /jobs`, `GET /jobs/slug/:slug`, `POST /jobs/:id/apply`, admin `/admin/jobs*` (+ `applicationCount` read field — mock/registry/docs), `/admin/job-applications*`, `/admin/newsletter-subscribers*` (+ export). External: Cloudinary unsigned upload (optional). Env/settings: `REACT_APP_CLOUDINARY_CLOUD_NAME`, `REACT_APP_CLOUDINARY_UPLOAD_PRESET`, `settings.integrations.cloudinaryCloudName/UploadPreset` (settings win when set).

## 6. UI/UX requirements
Job cards with chips; job page two columns (content / sticky apply card ≥ 1200 px); upload zone with progress and file name; success state with a check; admin drawer 480 px (full-screen mobile); subscribers table simple; awareness quiz/checklist keyboard-accessible; every form labelled.

## 7. Edge cases that must work
- Upload > 5 MB or wrong type → inline error before uploading; upload failure → error + retry, URL fallback offered.
- Cloudinary not configured → URL field only; URL must be `https://`.
- Applying to a closed job → server 404 → notice.
- Duplicate application (same e-mail + job within a day) → allowed (no dedupe rule) — record.
- Awareness quiz retake resets; checklist persists across reloads.
- Subscribers export with filters → only filtered rows.

## 8. Acceptance criteria
- [ ] Jobs CRUD + applications admin + subscribers admin work; `applicationCount` shown.
- [ ] `/careers` (CMS) lists jobs; `/careers/<slug>` shows details and accepts applications (upload when configured, URL otherwise); application visible in admin with the résumé link.
- [ ] `/insights/real-estate-awareness` and `/contact` are fully CMS/settings-driven; legacy files deleted; no hardcoded contact facts.
- [ ] `cloudinary.js` tests pass; `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run test:mock`, `npm run smoke` pass; no console warnings.
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
Manual QA (desktop + 390 px): admin → create job → `/careers` shows it → open → apply with a résumé URL (no Cloudinary) → admin applications → change status → drawer notes; set `REACT_APP_CLOUDINARY_*` in `.env` (if you have a test cloud; otherwise skip and record) → upload path; `/insights/real-estate-awareness` quiz + checklist; `/admin/newsletter` export.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 31 report; Known issues: BUG-11 fully closed, BUG-15 (careers upload) closed, additional defect 18 closed; Pending rewrites: "job description LegacyHtml → SafeHtml (32)"; next prompt: 32.
- `docs/DECISIONS.md`: D12, D91, no application dedupe, per-row application actions.

## 11. Commit
`git add -A && git commit -m "feat(careers): jobs CRUD, public job pages with résumé upload, applications and subscribers admin; CMS awareness/contact"`

## 12. Guardrails
- Do not touch: `db.json`, `theme.js`, `global.css`, mock beyond `applicationCount`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (careers general enquiry form, quiz, checklist, contact form all survive).
