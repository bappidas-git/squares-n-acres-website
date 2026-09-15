# Prompt 29 — Admin leads CRM (list, detail, pipeline, notes, assignment, export, notifications) and dashboard with real aggregates

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §6.7 leads, §6.16 dashboard, §5.14 leads rows, §7 RBAC (sales scoping), §13 D45/D46/D55/D56/D89), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–28 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
Legacy `src/pages/admin/AdminLeads.js` (client pagination, status menu, CSV built client-side with `Property` empty, delete), `LeadDetail.js` (info card, status select + 5-step pipeline, notes with optimistic append, simulated timeline, tel/mailto/WhatsApp), `Dashboard.js` (fake trends, hand-rolled SVG charts, `GET /admin/dashboard` with the old field names) run on the new services since prompt 11 with minimal mapping. `LeadNotificationsContext` (12) provides `newLeadCount/recentLeads/lastUpdatedAt/markSeen`. The mock implements list filters (`q|status|source|assignedTo|propertyId|from|to|priority`), sorts, sales scoping, `PATCH` with activities, notes add/delete, `claim`, `bulk`, `export` (CSV BOM), and `GET /admin/dashboard` (§6.16). `DataTable`, `FilterBar`, `StatusChip`, `EntityPicker`, `download.js` (`downloadAuthenticated`), `recharts@3.10.1` is **not installed yet** (install here; lazy-load the charts). Lead `meta` may contain the financial assessment.

## 2. Objective
When this prompt is finished: `/admin/leads` is a server-side CRM list (filters `q`, status (multi), source (multi), assigned (Me/Unassigned/user), property, date range, priority; sorts; columns Name/Contact, Source, Property, Status (quick-change menu → PATCH), Priority, Assigned, Follow-up (overdue marker), Created; row actions View, Call, WhatsApp, Change status, Assign (admin/manager), Delete (admin/manager); bulk status/assign/priority/delete; CSV export via `GET /admin/leads/export` with the current filters; unread badge + auto-refetch from `LeadNotificationsContext`; "Possible duplicate" chip when another lead with the same phone exists in the last 30 days (server flag `isPossibleDuplicate` added to the list response); sales scoping with a "Claim" action on unassigned leads). `/admin/leads/:id` is a detail page: contact card (tel/mailto/WhatsApp buttons), requirement summary, property link, `meta` card (financial assessment key/values), status pipeline stepper (`LEAD_STATUS` funnel; Lost as a separate action with a reason), priority, assignment (`EntityPicker` over users), follow-up date/time with overdue indicator, notes (add/delete with author), real activity timeline, UTM/page info, "Delete lead". `/admin/dashboard` shows real data: stat cards, `recharts` line (leads by day), bar (leads by source), donut (leads by status), views by day, recent leads table, top properties, SEO health card (links to `/admin/seo`), upcoming follow-ups, quick links; role-aware for sales. Legacy files deleted.

## 3. Scope
### Files to create
- `src/pages/admin/leads/LeadsListPage.jsx` (+ css), `leadColumns.jsx`, `leadFilters.js`, `LeadStatusMenu.jsx`, `AssignDialog.jsx`, `LostReasonDialog.jsx`
- `src/pages/admin/leads/LeadDetailPage.jsx` (+ css), `LeadContactCard.jsx`, `LeadRequirementCard.jsx`, `LeadMetaCard.jsx`, `LeadPipeline.jsx`, `LeadNotes.jsx`, `LeadTimeline.jsx`, `LeadFollowUp.jsx`
- `src/pages/admin/dashboard/DashboardPage.jsx` (+ css), `StatCards.jsx`, `charts/LeadsByDayChart.jsx`, `LeadsBySourceChart.jsx`, `LeadsByStatusChart.jsx`, `ViewsByDayChart.jsx` (all lazy via `React.lazy` + `Suspense` skeletons), `RecentLeadsTable.jsx`, `TopPropertiesCard.jsx`, `SeoHealthCard.jsx`, `FollowUpsCard.jsx`, `QuickLinks.jsx`
- Tests: `src/pages/admin/leads/__tests__/LeadPipeline.test.jsx` (funnel + lost), `LeadTimeline.test.jsx` (renders activities sorted desc), `src/pages/admin/dashboard/__tests__/DashboardPage.test.jsx` (renders stats from a fixture; sales variant hides global lead cards? — sales sees own stats; assert labels)
### Files to modify
- `src/routes/adminRouteConfig.js`, `src/contexts/LeadNotificationsContext.js` (expose `refreshKey`), `mock-server/routes/leads.js` + `lib/leadFilters.js` (`isPossibleDuplicate` computed in list/detail responses), `docs/API_CONTRACT.md`, `package.json` (`recharts@3.10.1`), `docs/*`
### Files to delete
- `src/pages/admin/AdminLeads.js`, `src/pages/admin/LeadDetail.js`, `src/pages/admin/Dashboard.js`
### May also touch
- `src/components/admin/DataTable.jsx` (row highlight prop for `new`)

## 4. Detailed tasks
1. **List.** `useApiList(leadService.adminList, { syncToUrl: true, defaults: { sort: 'createdAt', order: 'desc', perPage: 20 } })`; refetch when `LeadNotificationsContext.lastUpdatedAt` changes (silent, keeps scroll); columns per objective (`Name` primary with e-mail/phone below; `Source` chip via `LEAD_SOURCES.labelOf`; `Property` link (title) or "—"; `Status` = `LeadStatusMenu` (chip button → menu of statuses; choosing "Lost" opens `LostReasonDialog`; PATCH optimistic with rollback); `Priority` chip (tones); `Assigned` (name or "Unassigned"; sales sees "Claim" button on unassigned → `POST /claim`); `Follow-up` (`formatDate` + red "Overdue" chip when past and status not converted/lost); `Created` (`formatRelative` + tooltip absolute)); `new` rows subtly highlighted; "Possible duplicate" warning chip when `isPossibleDuplicate`. Filters: search, status multi, source multi, assigned (Me / Unassigned / each active user — admin/manager only; sales sees Me/Unassigned), property (`EntityPicker`), from/to dates, priority. Row actions: View, Call (`tel:`), WhatsApp, Change status, Assign (dialog), Delete (confirm; hidden for sales). Bulk: Change status (dialog with status select), Assign (dialog), Priority, Delete (admin/manager). Export: `downloadAuthenticated(endpoints.adminLeads.export, currentParams, 'leads-<date>.csv')` with a loading state. Header: "Leads" + `meta.total` + "N new" chip (`newLeadCount`) + "Mark all seen" (`markSeen`).
2. **Detail.** `useApi(leadService.adminGet)`; 404 → EmptyState; layout two columns (main: contact card (name, phone with Call/WhatsApp buttons, e-mail with Mail button, source chip, created/updated, consent, page URL link, UTM chips), requirement card (listing type, property type name, locality name, BHK, budget range formatted, timeline label — only present fields), property card (cover thumbnail, title → public link + admin edit link), `LeadMetaCard` (when `meta` exists: score with band chip + key/value rows with humanised keys; bank name), notes (list newest first with author/time + delete for the author or admin/manager; add note textarea with Ctrl+Enter), activity timeline (icons per `LEAD_ACTIVITY_TYPES`, description, author, relative time; sorted desc)); side rail: `LeadPipeline` (stepper new → contacted → qualified → site-visit → negotiation → converted; click a later/earlier step → PATCH status with confirm when moving backwards; "Mark as lost" button → reason dialog → PATCH `{ status: 'lost', lostReason }`; converted/lost states styled), priority select, assignment (`EntityPicker` users; sales: Claim only), follow-up (`DateField` + time → PATCH `followUpAt`; "Clear"), "Delete lead" (admin/manager). All PATCHes append activities server-side; after each PATCH refetch the lead.
3. **Duplicate flag.** Mock: in `routes/leads.js` list/detail responses compute `isPossibleDuplicate` = another lead with the same normalised phone created within 30 days; registry response docs updated; guidelines note (47).
4. **Dashboard.** `useApi(dashboardService.get)`; `StatCards` (Properties total/active/featured/inactive; Leads total/new/today/this month vs last month with a computed delta badge (no fake trends); Conversion rate; Articles published/draft; Views this month; Enquiries this month; Subscribers) — sales role: property counts + own-lead figures (server-scoped) with the subtitle "Your leads"; charts (`recharts`, `ResponsiveContainer`, colours from CSS tokens via `useCssVar`, accessible titles + a visually hidden data table for each chart): leads by day (30-day line), leads by source (horizontal bar, labels from enums), leads by status (donut), views by day (area); `RecentLeadsTable` (10 rows → detail), `TopPropertiesCard` (views/enquiries → edit/public links), `SeoHealthCard` (average score gauge + counts per band + missing focus keyword/description → `/admin/seo`), `FollowUpsCard` (next 10 with overdue markers), `QuickLinks` ("Add property", "Write article", "SEO issues", "Media library") filtered by `can()`; skeletons for each card; error state with retry; charts code-split (verify a separate chunk).
5. `npm i recharts@3.10.1`; delete legacy pages; tests; format.

## 5. Data contract touched
Consumed: `GET /admin/leads` (+ `isPossibleDuplicate` — mock change documented), `GET|PATCH|DELETE /admin/leads/:id`, `POST /admin/leads/:id/claim`, `POST /admin/leads/:id/notes`, `DELETE /admin/leads/:id/notes/:noteId`, `POST /admin/leads/bulk`, `GET /admin/leads/export`, `GET /admin/users?perPage=all` (assignment), `GET /admin/dashboard`. npm: `recharts@3.10.1`.

## 6. UI/UX requirements
Status chips with tones; pipeline stepper horizontal ≥ 900 / vertical below; notes as cards with author initials; timeline with a vertical line; dashboard 4-column stat grid → 2 → 1; charts 280 px tall with legends; cards on white with `--shadow-sm`; every chart has an `aria-label` and a hidden table; keyboard-operable menus; mobile: lead rows as cards with Call/WhatsApp quick actions.

## 7. Edge cases that must work
- Sales opening another user's lead by URL → 404 page (server scoping); claim on an already-assigned lead → 409 toast.
- Moving the pipeline backwards asks for confirmation; "Lost" requires a reason (min 3 chars).
- Export with filters returns only filtered rows (open the CSV); export with 0 rows → header only.
- Dashboard with zero leads → charts show an empty state, not NaN.
- `meta` with unknown keys renders generically; missing `meta` → card absent.
- Deleting a note by a non-author sales user → 403 toast.
- Follow-up in the past → "Overdue" chip in list and detail.

## 8. Acceptance criteria
- [ ] Leads list/detail/pipeline/notes/assignment/follow-up/bulk/export/claim/duplicate-chip work per the objective for admin, manager and sales.
- [ ] Dashboard shows real aggregates with recharts (lazy chunk), role-aware; no hardcoded trends.
- [ ] Legacy `AdminLeads.js`, `LeadDetail.js`, `Dashboard.js` deleted; tests pass; `test:mock` updated for `isPossibleDuplicate`.
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
Manual QA (desktop + 390 px): admin → leads → filter status New + source Brochure → change status via menu → open detail → add note → set follow-up yesterday → Overdue; assign to sales; log in as sales → sees it, claims an unassigned one, cannot delete; export CSV; create two leads with the same phone via the public site → duplicate chip; dashboard charts render and match the counts (compare `leadsByStatus` to the list totals).

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 29 report; Known issues: BUG-11 (dashboard trends) closed, additional defect 21 (AdminLeads/Dashboard/LeadDetail) closed, 7 closed; next prompt: 30.
- `docs/DECISIONS.md`: D46, D55, D56, D89, duplicate window 30 days, backwards-move confirm.

## 11. Commit
`git add -A && git commit -m "feat(crm): server-side leads list/detail with pipeline, notes, assignment, export; real-data dashboard with recharts"`

## 12. Guardrails
- Do not touch: public pages, `db.json`, `theme.js`, `global.css`.
- Do not add dependencies other than: `recharts@3.10.1`.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (CSV export, notes, status change, polling badge/toasts all survive).
