# Prompt 40 — Site settings admin (General, Contact, Hero, Navigation & Footer, Newsletter, Integrations, Lead notifications), context refresh, public subsets

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §6.13 `siteSettings`, §5.14 settings rows, §7 (manager read-only), the master spec SET-01, §13 D79/D80/D93), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–39 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
`src/pages/admin/AdminSettings.js` (legacy tabs General / Hero / Social / Newsletter / Footer with the old field names, Save disabled since 11, `UserManagement` tab removed in 13) is still routed at `/admin/settings`. `/admin/settings/users` (13) and `/admin/profile` (12) exist. Mock: `GET /admin/settings` (full), `PUT /admin/settings` (deep-merge known keys; manager 403), `GET /settings` (public subset). `SiteSettingsContext` (`settings`, `seoSettings`, `refresh()`), `useForm`, `AdminTabs`, `ImageField` + media picker (39), `SortableList`, `MultiSelect`, `MapEmbed`, `MediaPickerDialog` exist. Header/footer/hero/newsletter/WhatsApp/lead notifications all read settings already.

## 2. Objective
When this prompt is finished `/admin/settings` is rebuilt with `useForm` over the full §6.13 object and tabs: **General** (site name, tagline, logo/icon `ImageField`s with preview and "Reset to brand assets" (BRAND URLs), site URL, default language (read-only `en-IN`), established year, RERA number, GST number), **Contact** (contact e-mail, phone, alternate phone, WhatsApp number (digits with country code) + default message, address fields (line1, line2, locality, city, state, pincode, country), map embed URL (optional) + latitude/longitude with a `MapEmbed` preview, working hours repeater), **Hero** (title, subtitle, background image/video/mobile image via media picker, search tabs (`HERO_SEARCH_TABS` checkboxes with order), stats repeater (label/value/suffix), badges (tags)), **Navigation & Footer** (header CTA label/href, show call/WhatsApp toggles, footer about text, columns editor (`SortableList` of columns each with a `SortableList` of links label/href/external), disclaimer, copyright text (with `%year%` hint), show newsletter, show gallery + gallery image URLs (max 6, media picker)), **Newsletter** (enabled, title, subtitle, success message), **Integrations** (GA4 id, GTM id, Facebook Pixel id, Google Maps API key, Cloudinary cloud name + upload preset, reCAPTCHA site key — with format validation and helper texts), **Lead notifications** (notification e-mails (tags, validated), auto-assign select (`none|round-robin`), default priority); plus links to Users (`/admin/settings/users`) and Profile. Save → `PUT /admin/settings` (whole object) → `SiteSettingsContext.refresh()` + `MasterDataContext` untouched → toast; unsaved guard; manager sees the form disabled with a read-only banner (no Save). The legacy `AdminSettings.js` is deleted. Public subset verified (`GET /settings` never exposes `leads`).

## 3. Scope
### Files to create
- `src/pages/admin/settings/SettingsPage.jsx` (+ css), `tabs/GeneralTab.jsx`, `ContactTab.jsx`, `HeroTab.jsx`, `NavigationFooterTab.jsx`, `NewsletterTab.jsx`, `IntegrationsTab.jsx`, `LeadNotificationsTab.jsx`, `parts/FooterColumnsEditor.jsx`, `parts/WorkingHoursEditor.jsx`, `parts/StatsEditor.jsx`, `settingsSchema.js` (client validation mirror of `schemas.settings.update`)
- Tests: `src/pages/admin/settings/__tests__/SettingsPage.test.jsx` (loads, edits a nested field, saves the whole object, manager read-only), `FooterColumnsEditor.test.jsx` (add/reorder/remove)
### Files to modify
- `src/routes/adminRouteConfig.js`, `src/contexts/SiteSettingsContext.js` (`refresh` returns the new settings; `updateLocal(settings)` for instant UI), `src/config/site.js` (nothing), `docs/*`
### Files to delete
- `src/pages/admin/AdminSettings.js`
### May also touch
- `src/services/settingsService.js` (`admin()` / `update()` exist), `mock-server/routes/settings.js` (only if a validation rule is missing)

## 4. Detailed tasks
1. **Form**: `useForm({ initialValues: adminSettings, schema: settingsSchema })` with dotted paths (`general.address.pincode`); tabs via `AdminTabs` with error counts; sticky Save bar (Save / Discard changes); `useUnsavedChanges(dirty)`; 422 mapping to tabs.
2. **General**: fields per §2; logo/icon `ImageField` (media picker; hint `logo`/`avatar`), previews at header size; "Reset to brand assets" fills `BRAND.logoUrl/iconUrl`; site URL validated `https?://` without trailing slash (auto-trimmed); established year 1900–current; RERA/GST free text with helper "Displayed in the footer and on property pages".
3. **Contact**: phone fields validated as Indian numbers (allow `+91` and spaces; store normalised display), WhatsApp number digits only (10–15) with a live `wa.me` preview link, address fields, map embed URL (must start with `https://www.google.com/maps/embed`), lat/lng + `MapEmbed` preview ("Use map centre from address" not possible without geocoding — omit), working hours rows (days, hours).
4. **Hero**: text fields, media (`ImageField` hero/`video` URL with preview, mobile image), search tabs (checkbox list in order with drag reorder), stats repeater (max 4), badges tags (max 4); live mini-preview of the hero card.
5. **Navigation & Footer**: CTA label/href (href validated: `/path`, `#post-requirement` (opens the modal), or `https://`), toggles; footer about text (textarea), `FooterColumnsEditor` (columns: title + links (label, href, external switch) with reorder; max 4 columns × 8 links), disclaimer, copyright (`%year%` helper), show newsletter, show gallery + up to 6 images (media picker).
6. **Newsletter / Integrations / Lead notifications** per §2 with validation (`G-XXXXXXX` pattern for GA4, `GTM-XXXX`, numeric pixel id, e-mail list); helper links to where each id is used; secrets note (none are secret; reCAPTCHA site key is public).
7. **Roles**: `can('settings','edit')` false → all inputs disabled, banner "Read-only: only administrators can change settings", no Save; `settings.view` for manager.
8. **After save**: `SiteSettingsContext.refresh()`; header/footer/hero re-render (verify by changing the site name); `emit('settings:changed')`.
9. Delete the legacy page; tests; format; confirm `GET /api/settings` (public) lacks `leads` and `GET /api/admin/settings` has it.

## 5. Data contract touched
Consumed: `GET /admin/settings`, `PUT /admin/settings`, `GET /settings` (verification). No mock changes expected.

## 6. UI/UX requirements
Tabs with error badges; two-column forms; previews (logo at header size, hero mini card, WhatsApp link); repeaters with drag handles + keyboard; sticky save bar (mobile bottom); manager read-only styling (muted inputs, no destructive controls); every field labelled with helpers.

## 7. Edge cases that must work
- Saving with an invalid GA4 id → tab badge + inline error; saving succeeds after fixing.
- Footer gallery enabled with < 3 images → warning helper; public footer hides the gallery below 3 (D79 rule enforced in `Footer`).
- WhatsApp number empty → header/footer/float buttons hidden after save (context refresh).
- Manager cannot save (UI) and the API also refuses (403) if attempted via devtools.
- Discard changes restores the last saved values across all tabs.
- Deep-merge: saving does not drop keys the UI does not show (none, but the mock protects).

## 8. Acceptance criteria
- [ ] Every §6.13 field is editable in the right tab; save persists (verify `GET /api/admin/settings`); public site reflects changes without reload of the admin (context refresh) and on the next public page load.
- [ ] Manager read-only; admin full; users/profile links work; legacy page deleted.
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
Manual QA (desktop + 390 px): change tagline + hero title + add a footer column + set GA4 id + WhatsApp number → Save → open `/` in another tab → all reflected; log in as manager → read-only; reset logo to brand.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 40 report; Known issues: additional defect 19 (AdminSettings) closed, BUG-11 (footer defaults) closed; Pending rewrites: "AdminSettings save disabled" removed; next prompt: 41.
- `docs/DECISIONS.md`: D79, D93, validation patterns for integration ids.

## 11. Commit
`git add -A && git commit -m "feat(settings): full site settings admin with tabs, validation, previews and context refresh"`

## 12. Guardrails
- Do not touch: public components (they already read settings), `db.json`, `theme.js`, `global.css`, mock server.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (every legacy settings tab/field has a home: General/Hero/Social(→ Navigation & Footer social handled in General? — social links live in the **Navigation & Footer** tab as a "Social profiles" section — add it)/Newsletter/Footer/User Management).
