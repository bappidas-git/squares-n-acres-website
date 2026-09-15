# Prompt 17 — Testimonials, team members, partners and FAQs: admin CRUD (FaqManager rewrite) and public sections

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §6.9 faqs/testimonials/teamMembers/partners, §6.17 `FAQ_CATEGORIES`, §5.14 rows, §13 D41/D83), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–16 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
Legacy admin pages `src/pages/admin/FaqManager.jsx` (dialog form question/answer/category/order/isActive, chip category filter, ↑/↓ reorder with two sequential writes, broken under a category filter) and `src/pages/admin/AdminPartners.jsx` (name/logo/website/order/isActive dialog) still exist on the adapter and old field names (`logo`, `website`); there are no admin pages for testimonials or team members (placeholders). Public: `FaqSection.jsx` (home, `showOnHome`), `src/pages/public/FAQs.js` (tabs/search, `LegacyHtml` answers, "Can't find your answer?" with placeholder contacts + LeadForm source `faq`), `PartnersSection.jsx` (home marquee). `About.jsx` still has hardcoded team/testimonials (replaced by CMS blocks in prompt 30 — this prompt provides the section components those blocks will render). Mock: `/faqs` (filters `category|showOnHome|propertyTypeId`), `/testimonials` (`isFeatured`, `isSample`), `/team` (`showOnAbout`), `/partners` (`category`) + admin CRUD with `order` PATCH, bulk, guards.

## 2. Objective
When this prompt is finished: admin pages `/admin/faqs` (rewritten on `MasterDataPage`: search, category filter, `showOnHome` toggle, drag reorder that works under any filter with a single `PATCH { order }` per moved item, dialog form with an HTML textarea answer (editor in 32), property-type link), `/admin/testimonials` (name, designation, location, rating, message, avatar, property link, featured, active, order, `isSample` flag visible), `/admin/team` (name, slug, designation, phone/whatsapp/email, photo, bio, RERA id, social links, order, active, showOnAbout), `/admin/partners` (name, logo, website, category, order, active); public components `TestimonialsSection` (carousel, `isSample` gating D41, `Rating`), `TeamSection` (cards with contact actions), `PartnersSection` (rewritten to `partners` fields + category filter prop), `FaqAccordion` (shared by home, FAQs page, property FAQs, CMS `faq` blocks; `FAQPage` schema arrives in 38); `/insights/faqs` uses `FaqAccordion` + settings-driven contact methods (D83: phone/e-mail/WhatsApp from `siteSettings.general`). Legacy `FaqManager.jsx`/`AdminPartners.jsx` are deleted.

## 3. Scope
### Files to create
- `src/pages/admin/content/FaqsPage.jsx`, `TestimonialsPage.jsx`, `TeamPage.jsx`, `PartnersPage.jsx`, `contentConfigs.js`
- `src/components/sections/shared/FaqAccordion.jsx` (+ css), `TestimonialsSection.jsx` (+ css), `TeamSection.jsx` (+ css), `ContactMethods.jsx` (phone/e-mail/WhatsApp cards from settings)
- Tests: `src/components/sections/shared/__tests__/FaqAccordion.test.jsx` (single-open, keyboard, `aria-controls`), `TestimonialsSection.test.jsx` (sample gating with `NODE_ENV`)
### Files to modify
- `src/components/sections/home/FaqSection.jsx` (uses `FaqAccordion`), `src/components/sections/home/PartnersSection.jsx` (new fields, `category` prop, logo `LazyImage`, `onError` fallback), `src/pages/public/FAQs.js` (→ `FAQs.jsx`: `FaqAccordion`, `ContactMethods`, `LeadForm` source `faq`), `src/routes/adminRouteConfig.js`, `docs/*`
### Files to delete
- `src/pages/admin/FaqManager.jsx`, `src/pages/admin/AdminPartners.jsx`
### May also touch
- import fixes

## 4. Detailed tasks
1. **Configs (`contentConfigs.js`).** `faqs`: columns Order (drag handle), Question (+ clamped answer text via `stripHtml`), Category chip, Home (`showOnHome` switch → PATCH), Active, Updated; filters `q`, `category`, `showOnHome`, `isActive`; sort `order` default; form (dialog): question (10–200), answer (textarea HTML, ≥ 20 chars), category select (`FAQ_CATEGORIES`), property type (optional `EntityPicker` over property types), showOnHome, active, order. Reorder rule: moving an item computes new `order` values for the affected items **within the current filtered list** and PATCHes only the moved item with `order = target neighbour order ± 0.5` normalised server-side? — simpler and deterministic: send `PATCH { order }` for the moved item with the exact new position, then the mock's `order` PATCH handler re-numbers the collection (implement in `crud.js`: after an `order` PATCH, sort by `order` (ties by `updatedAt`) and re-assign 1..n) — document in `docs/API_CONTRACT.md`. `testimonials`: columns Avatar, Name (+ designation, location), Rating (stars), Message (clamped), Featured, Active, Sample (chip), Order; filters `q`, `isFeatured`, `isActive`, `isSample`; form: name, designation, location, rating (1–5 `Rating` input), message (20–600), avatar `ImageField` hint `avatar`, property (`EntityPicker` properties), featured, active, order, `isSample` switch with hint "Sample testimonials never appear on the live site". `team`: columns Photo, Name (+ designation), Contact (phone/e-mail icons), RERA, About page (`showOnAbout` switch), Active, Order; form: name, `SlugField` (no public page — base `#`), designation, phone, whatsapp, email, photo `ImageField` hint `avatar`, bio textarea, reraId, socialLinks (linkedin/twitter/website urls), showOnAbout, active, order; delete guard (properties referencing `agent.teamMemberId`, pages). `partners`: columns Logo, Name, Category chip, Website, Active, Order; filters `q`, `category`, `isActive`; form: name, logo `ImageField` hint `logo` (required), websiteUrl, category select (`PARTNER_CATEGORIES`), active, order; guard (pages `partners` blocks).
2. **Pages** = `MasterDataPage` with the configs (`/admin/faqs`, `/admin/testimonials`, `/admin/team`, `/admin/partners`), `orderable: true`.
3. **`FaqAccordion({ items: [{ id, question, answer (HTML) }], single = true, defaultOpenId, headingLevel = 3, onToggle })`**: buttons with `aria-expanded`/`aria-controls`, panels with `id`, animated height (framer-motion, reduced-motion aware), answers via `LegacyHtml` (→ `SafeHtml` in 32), search highlight prop `highlight` (wraps matches in `<mark>` on the question only), `emptyState`.
4. **`TestimonialsSection({ items, title })`**: `Carousel` of cards (avatar/initials `Avatar`, name, designation · location, `Rating`, message clamped to 6 lines with "Read more" `Modal`); filters `items` by `isActive` and, when `process.env.NODE_ENV === 'production'`, drops `isSample: true`; hidden when < 1 item after filtering; the About page/home use it in prompts 27/30.
5. **`TeamSection({ items, title })`**: cards (photo 1:1, name, designation, RERA id, contact icon buttons `tel:`/`mailto:`/WhatsApp (via `useSiteSettings().getWhatsappLink` when `whatsapp` set), social links) — hidden when empty.
6. **`PartnersSection({ category, title })`**: reads `masterDataService.partners.list({ category })`; marquee (reduced-motion → static grid); `LazyImage` logos with fallback; external links `rel="noopener noreferrer nofollow"`.
7. **`ContactMethods`**: three cards from `settings.general.contactPhone` (`tel:`), `contactEmail` (`mailto:`), `whatsappNumber` (wa.me with default message) — each hidden when the setting is empty; used by the FAQs page (and the contact page in 30).
8. **FAQs page** (`/insights/faqs`): H1 "Frequently asked questions", category tabs (`FAQ_CATEGORIES` present in data + All) synced to `?category=`, search input (debounced, highlights), grouped headings when All, `FaqAccordion`, `ContactMethods`, `LeadForm` (source `faq`, fields name/phone/email/message), breadcrumbs, temporary Helmet.
9. Home `FaqSection` → `FaqAccordion` with `showOnHome` items + "View all FAQs".
10. Tests; format.

## 5. Data contract touched
Consumed: `/faqs`, `/testimonials`, `/team`, `/partners` public + admin CRUD; mock change: `order` PATCH re-numbering in `crud.js` (documented in `docs/API_CONTRACT.md` and `05_BUSINESS_RULES` notes later).

## 6. UI/UX requirements
Accordion rows 56 px min, chevron rotates, only one open by default; testimonial cards on surface with quotes icon; team cards 3/2/1 columns; partner logos greyscale-free (no filters), 40 px height; FAQs page tabs scrollable on mobile; contact cards stack on mobile.

## 7. Edge cases that must work
- Reorder under a category filter moves the right item and the global order stays consistent (verify via `GET /api/admin/faqs?perPage=all` sorted by `order`).
- Testimonials: in a production build (`npm run build:ci` + `serve:build`) sample items are absent; in dev they show with a small "Sample" chip.
- Team member without photo → initials avatar; without any contact → no icon row.
- FAQ search with no results → empty state "No questions match" + "Clear search".
- `ContactMethods` with all settings empty → renders nothing (no empty grid).

## 8. Acceptance criteria
- [ ] Four admin pages work end-to-end (create/edit/reorder/toggle/delete/bulk); FAQ reorder correct under filters; guards render usages.
- [ ] `/insights/faqs` uses `FaqAccordion`, settings-driven contacts, search + category URL sync; home FAQ section works.
- [ ] `TestimonialsSection`/`TeamSection`/`PartnersSection` render from seed data (used by a temporary demo? — no: verify `TestimonialsSection` through its unit test and `PartnersSection` on the home page; `TeamSection` is wired in prompt 30 — its unit test covers rendering).
- [ ] Legacy `FaqManager.jsx` and `AdminPartners.jsx` deleted.
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run test:mock`, `npm run smoke` pass.
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
Manual QA (desktop + 390 px): `/admin/faqs` → filter "Legal" → drag the second item to first → clear filter → order consistent; toggle "Home" on an FAQ → `/` shows it; `/insights/faqs` → tab Legal → search "RERA" → highlight; submit the question form → lead with source "FAQ"; `/admin/partners` → add a partner with logo → home marquee shows it; `/admin/testimonials` → add a non-sample testimonial → visible in dev (about page later).

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 17 report; Known issues: additional defect 21 (FaqManager reorder) closed, 17 (FAQ contacts) closed; Pending rewrites: "FaqAccordion answers LegacyHtml → SafeHtml (32)"; next prompt: 18.
- `docs/DECISIONS.md`: D41, D83, order re-numbering rule.

## 11. Commit
`git add -A && git commit -m "feat(content): FAQs, testimonials, team and partners admin pages with shared public sections"`

## 12. Guardrails
- Do not touch: property pages, articles, `theme.js`, `global.css`, `db.json`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality.
