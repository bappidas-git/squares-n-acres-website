# Prompt 13 — Admin UI kit: server-side DataTable, FilterBar, forms (`useForm`), fields, MasterDataPage generic, IconPicker fixes

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §5.6 pagination/sort/filter, §5.8 write semantics + bulk, §8 UI kit and states, §13 D23/D47/D88), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–12 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
Admin pages still use ad-hoc MUI tables with client-side pagination (`AdminProperties.js`, `AdminLeads.js`, `AdminArticles.js`, `FaqManager.jsx`, `AdminNeighborhoods.js`, `AdminPartners.jsx`, `UserManagement.jsx`), ad-hoc dialogs and local form state. `src/components/admin/` contains `IconPicker.jsx` (≈180 `mdi:*` ids, ~17 invalid ids, non-keyboard tiles, search ignoring the category), `ImageUrlHelperText.jsx`, `imageFieldConfig.js`, `ProtectedRoute.jsx`, `RoleRoute.jsx`, `Forbidden.jsx`, `AdminPlaceholderPage.jsx`, `SeoGuidelines.jsx`, `UserManagement.jsx`. The UI kit (`src/components/ui`) exists; `useApiList` supports server params + URL sync; services are registry one-liners; `ApiError.errors` carries 422 field errors; master data comes from `MasterDataContext`.

## 2. Objective
When this prompt is finished the admin has a reusable kit that every later admin prompt uses: `DataTable` (server-side, selectable, bulk actions, row actions, sortable columns, mobile card renderer, skeleton/empty/error), `FilterBar` (search + selects + date range + chips, URL-synced through `useApiList`), `PageHeader`, `FormSection`, `useForm` (values/errors/touched/dirty, schema validation, server 422 mapping, unsaved-changes guard), field components (`ImageField` with URL input + preview + "Upload"/"Media" buttons that are hidden until prompts 39 wire them, `MultiSelect`, `SlugField` with async availability check, `StatusChip`, `AdminTabs` with per-tab error badges, `SortableList` drag-reorder, `EntityPicker` for related records, `ToneSelect` for badge colours), `MasterDataPage` (a fully generic list + create/edit dialog/page + delete-with-usage-guard driven by a config object), and a fixed `IconPicker`. `UserManagement` is rebuilt on the kit as `/admin/settings/users` (admin only). No product module is rewritten yet (14+ do that), but the kit is proven by the users page and by unit tests.

## 3. Scope
### Files to create
- `src/components/admin/DataTable.jsx` (+ css), `FilterBar.jsx`, `PageHeader.jsx`, `FormSection.jsx`, `AdminTabs.jsx`, `StatusChip.jsx`, `ImageField.jsx`, `MultiSelect.jsx`, `SlugField.jsx`, `SortableList.jsx`, `EntityPicker.jsx`, `ToneSelect.jsx`, `MasterDataPage.jsx`, `MasterDataForm.jsx`, `BulkActionsBar.jsx`, `RowActions.jsx`, `DeleteGuardDialog.jsx`, `index.js`
- `src/hooks/useForm.js`, `src/hooks/useUnsavedChanges.js`, `src/utils/validation.js` (schema-descriptor validator shared with the mock rules: `validate(values, descriptor, { partial })` → `{ field: message }`)
- `src/pages/admin/settings/UsersPage.jsx` (replaces `UserManagement.jsx`)
- Tests: `src/components/admin/__tests__/DataTable.test.jsx`, `MasterDataPage.test.jsx`, `SlugField.test.jsx`, `src/hooks/__tests__/useForm.test.js`, `src/utils/__tests__/validation.test.js`
### Files to modify
- `src/components/admin/IconPicker.jsx`, `src/routes/adminRouteConfig.js` (users route → `UsersPage`), `src/pages/admin/AdminSettings.js` (remove the embedded `UserManagement` tab; keep the rest read-only until 40), `docs/*`
### Files to delete
- `src/components/admin/UserManagement.jsx`, `src/components/admin/ImageUrlHelperText.jsx` + `imageFieldConfig.js` (folded into `ImageField` `hint` presets)
### May also touch
- import fixes

## 4. Detailed tasks
1. **`DataTable`** props: `columns: [{ key, label, sortable, width, align, render(row), hideBelow: 'sm'|'md'|'lg', primary (used as the mobile card title) }]`, `rows`, `meta` (`page, perPage, total, totalPages`), `loading`, `error`, `onRetry`, `sort` (`{ field, order }`), `onSortChange`, `onPageChange`, `onPerPageChange` (options `[10, 20, 50, 100]`, default 20), `selectable`, `selectedIds`, `onSelectionChange` (select-all selects the current page; a link "Select all N results" is **not** provided — bulk works on the selected page or on explicit selections), `bulkActions: [{ key, label, icon, danger, confirm: { title, message } }]`, `onBulkAction(key, ids)`, `rowActions(row) → [{ key, label, icon, onClick, danger, disabled, to }]` (rendered as icon buttons ≥ 900 px and a kebab menu below), `getRowId`, `emptyState` (`{ title, text, action }`), `rowLink(row)` (whole row clickable), `stickyHeader`, `mobileCard(row)` (custom renderer; default builds a card from `primary` + first 3 columns). Implementation: MUI `Table` inside a scroll container (`overflow-x: auto`, never the page), header sort buttons with `aria-sort`, skeleton rows (`TableSkeleton`) while loading, `ErrorState` on error, `EmptyState` when `total === 0`, footer with "Showing 1–20 of 57" + `Pagination` + per-page select; keyboard: rows focusable when `rowLink`.
2. **`FilterBar`** props: `fields: [{ key, type: 'search'|'select'|'multiselect'|'daterange'|'toggle'|'number-range', label, options, placeholder, width }]`, `values`, `onChange(patch)`, `onReset`, `activeCount`; renders a responsive row (search first, 300 px), a "More filters" popover below 900 px, active-filter chips with remove, "Reset" button; debounced search (400 ms) handled by `useApiList`.
3. **`useForm({ initialValues, schema, validate, onSubmit })`** → `{ values, errors, touched, dirty, submitting, setField(path, value) (supports dotted paths and arrays), setValues, setErrors, setServerErrors(apiError) (maps `errors['location.localityId']` → nested and flat), handleBlur, validateAll() → boolean, submit() (validates, calls `onSubmit(values)`, maps `ApiError` 422 → field errors + toast of `message`, other errors → toast), reset(), isValid }`; `schema` is a `src/services/schemas` descriptor validated by `utils/validation.js` (client mirror of the mock rules: required, types, min/max, maxLength, enum, email, phone, url, slug, nested shapes, arrays). `useUnsavedChanges(dirty)` → `beforeunload` + react-router blocking (`useBlocker` from react-router 6.22+ — verify the installed version supports `useBlocker` with a data router; if the app uses `BrowserRouter` (it does), implement the in-app guard with a `ConfirmDialog` on `Link` clicks through a small `NavigationGuardContext` that `Link`-wrapping `ui/Button`/`NavLink`s consult — decision: switch `App.js` to `createBrowserRouter` + `RouterProvider` so `useBlocker` works natively; routes stay as route objects generated from the existing arrays; record D97).
4. **Fields.** `ImageField({ label, value, onChange, hint: 'gallery'|'floorPlan'|'logo'|'og'|'avatar'|'hero' (preset texts with recommended sizes), preview, ratio, allowUpload, onOpenMedia })` — URL text input with validation, `LazyImage` preview, "Clear", and two buttons `Upload` / `Media library` rendered only when the corresponding handlers are provided (prompt 39 provides them); `MultiSelect({ options, value, onChange, searchable, creatable, onCreate, max })` (MUI Autocomplete multiple with chips); `SlugField({ value, onChange, source (title), checkSlug: async (slug) => { available, suggestion }, excludeId, base: '/properties/' })` — auto-generates from `source` until edited (`utils/slug.js` `slugify` using the `slugify` npm package — **install `slugify@1.6.9` now**), debounced availability check with states (checking / available ✓ / taken ✗ + "Use suggestion"), lock/unlock toggle; `StatusChip({ tone, label, icon })` via `ui/Chip`; `AdminTabs({ tabs: [{ key, label, icon, errorCount }], value, onChange })` (scrollable, error badge red); `SortableList({ items, onReorder, renderItem, getId })` — HTML5 drag-and-drop with keyboard fallback (Alt+↑/↓ buttons visible on focus), announces moves via `aria-live`; `EntityPicker({ fetcher, labelKey, value, onChange, multiple, max, renderOption, orderable })` (search-as-you-type through a service `list({ q, perPage: 10 })`, selected chips, drag order when `orderable`); `ToneSelect` (the badge colour token picker: primary, charcoal, success, warning, error, info, muted — renders swatches from tokens).
5. **`MasterDataPage({ config })`** where `config = { key, title, singular, service: { list, get, create, update, patch, remove, bulk, checkSlug }, columns, filters, formFields: [{ name, type: 'text'|'textarea'|'richtext'(placeholder until 32: textarea)|'select'|'multiselect'|'switch'|'number'|'image'|'slug'|'icon'|'tone'|'tags'|'entity', label, required, options, hint, half }], schema, formMode: 'dialog'|'page', defaultSort, orderable (drag reorder → `patch(id, { order })`), activeToggle, featuredToggle, bulkActions, seoPanel (false until prompt 36), usageGuard: true }` → renders `PageHeader` (title, count, "Add" button), `FilterBar`, `DataTable` with inline `Switch` for `isActive` (optimistic `patch` with rollback + toast on failure), optional `isFeatured` star toggle, row actions Edit/Duplicate?/Delete, `MasterDataForm` (dialog or full page) built from `formFields` + `useForm`, delete → `ConfirmDialog`; on 409 usage → `DeleteGuardDialog` listing `data.usedBy` with links. Export also `useMasterDataCrud(config)` for pages that need custom layouts.
6. **IconPicker fixes.** Replace the invalid ids listed in `00_MASTER_CONTEXT.md` §11 item 23 with valid MDI ids (`mdi:office-building`, `mdi:pool`→`mdi:swim`, `mdi:silverware-fork-knife`, `mdi:badminton`→`mdi:racquetball`? — verify each candidate exists in the Iconify MDI set by rendering it: write a Jest test that imports the icon list and asserts every id matches `^mdi:[a-z0-9-]+$` **and** a manual check in the browser that no tile renders blank; replace any blank one), make tiles `<button type="button">` with `aria-label`, `aria-pressed`, roving focus + arrow-key navigation, search respects the active category, `currentIcon` preview, custom id input validated against `^mdi:[a-z0-9-]+$` with a live preview; add `AMENITY` and `NEARBY` quick categories using the enum icons.
7. **Users page** (`/admin/settings/users`, admin only) on `MasterDataPage` (`config.key 'users'`): columns Name (avatar initials + "(You)"), Email, Role (`StatusChip`), Status (switch), Last login, Created; filters `q`, `role`, `isActive`; form fields name, email, password (required on create, optional on edit with hint), role, phone, avatar (`ImageField` hint `avatar`), active; server safety rules surfaced from 422 (`errors.id`, `errors.role`); "Reset password" row action → dialog with a new password (PATCH). Remove `UserManagement` from `AdminSettings`.
8. Tests: `DataTable` (sort click calls `onSortChange`, select-all selects page ids, bulk action confirm flow, mobile card render at a narrow width), `MasterDataPage` (renders rows from a fake service, create dialog submits `create`, delete 409 shows `DeleteGuardDialog`), `SlugField` (auto from title, availability states), `useForm` (dirty, validation, `setServerErrors` mapping dotted keys), `validation.js` (each rule).

## 5. Data contract touched
Consumed: `GET|POST /admin/users`, `GET|PUT|PATCH|DELETE /admin/users/:id`, `POST /admin/users/bulk`; generic `check-slug` endpoints (through `config.service.checkSlug`). npm: `slugify@1.6.9` added. Router: `createBrowserRouter` (D97).

## 6. UI/UX requirements
Tables: zebra-free, 48 px rows, sticky header, hover surface, selected row `--color-primary-light`, bulk bar slides in above the table ("3 selected · Activate · Deactivate · Delete"), destructive actions red with confirm; mobile (< 900): cards with title/meta/status + kebab; filters collapse into a popover; forms: two-column grid ≥ 900 (fields marked `half`), single column below; labels visible; error text under fields with `aria-describedby`; dialogs full-screen below 600 px; `Escape` closes with an unsaved-changes confirm when dirty; every icon-only control has a label.

## 7. Edge cases that must work
- 422 with a nested key (`location.localityId`) lands on the right field and switches to the tab holding it (`AdminTabs.errorCount`).
- Optimistic switch toggle failure → reverts and toasts the server message.
- `SlugField`: title edited after manual slug edit does not overwrite; suggestion click fills the field and re-checks.
- `DataTable` with `total = 0` and active filters → empty state offers "Reset filters".
- `SortableList` keyboard reorder with a screen reader announcement; drag on touch devices (fallback buttons visible).
- `MasterDataPage` delete guard → 409 dialog with links to the usages; after unlinking, delete succeeds.
- Users: deleting/disabling yourself or the last admin → server 422 rendered as a toast/inline error; own role select disabled.

## 8. Acceptance criteria
- [ ] `src/components/admin/index.js` exports every component of task 1–5; tests pass.
- [ ] `/admin/settings/users` fully works on the kit (list/filter/sort/paginate/create/edit/reset password/toggle/delete/bulk) for the admin role; manager/sales get 403.
- [ ] `IconPicker` renders no blank tiles, is keyboard-operable, search respects categories.
- [ ] `useForm` + `useUnsavedChanges` block navigation with a confirm when dirty (router migrated to `createBrowserRouter`).
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run smoke` pass; no console warnings on `/admin/settings/users`.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run dev   (then) npm run smoke
```
Manual QA (desktop + 390 px): `/admin/settings/users` — create a manager, edit it, toggle inactive (row switch), filter by role, sort by name, change per-page, bulk deactivate, delete (confirm), try deleting yourself (error), reset a password; at 390 px the table becomes cards with a kebab menu; open the IconPicker from a placeholder demo route? — no demo routes: verify IconPicker inside the users form? Not present — verify it via its unit test and by temporarily rendering it in the browser console is not possible; instead confirm `AmenitiesTab` (property form, still legacy) opens the new IconPicker (it imports the same component) and no tile is blank.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 13 report; Known issues: additional defect 23 closed, 19 (UserManagement part) closed; next prompt: 14.
- `docs/DECISIONS.md`: D47, D88 (UI side), D97 (data router), slugify package.

## 11. Commit
`git add -A && git commit -m "feat(admin-kit): server-side DataTable, FilterBar, useForm, fields, MasterDataPage, users page, IconPicker fixes"`

## 12. Guardrails
- Do not touch: public pages, mock server, `db.json`, `theme.js`, `global.css`.
- Do not add dependencies other than: `slugify@1.6.9`.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (every capability of `UserManagement` exists on the new page).
