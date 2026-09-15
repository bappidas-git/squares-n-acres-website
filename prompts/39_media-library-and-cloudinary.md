# Prompt 39 — Media library and Cloudinary: unsigned uploads, `MediaPickerDialog`, `cloudinaryUrl` transformations, `LazyImage`/`Picture` `srcSet`, replace every image/file field

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §3 ARCH-08 media decision, §6.12 media, §5.14 media rows, the master spec SET-02, §8.6 performance, §13 D12), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–38 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
`src/utils/cloudinary.js` (31) has `isCloudinaryConfigured()`, `uploadToCloudinary(file, { resourceType, folder, onProgress })`, `cloudinaryUrl(url, { w, h, crop, quality, format })`. `ImageField` (13) renders URL + preview and shows `Upload`/`Media library` buttons only when handlers are provided (none yet). `LazyImage` (04) accepts `srcSet/sizes` but nobody passes them. The editor's image dialog (32) accepts `onRequestImage`. Mock: `GET /admin/media` (filters `type|folder|q|provider`, `withUsage`), `POST /admin/media` (metadata), `PATCH`, `DELETE`. Config precedence: `settings.integrations.cloudinaryCloudName/UploadPreset` → `REACT_APP_CLOUDINARY_*`. `/admin/media` is a placeholder.

## 2. Objective
When this prompt is finished: `/admin/media` (grid with search/filter by type/folder/provider, multi-file upload to Cloudinary (unsigned; images/videos/PDF via `resource_type auto`; per-file progress; folder chosen per upload), "Add by URL" (creates a metadata record; infers type/provider), edit alt/title/tags/folder, copy URL, view usage (`withUsage`), delete (metadata only, with a note that the Cloudinary asset is not deleted; blocked when `usedIn` non-empty unless "force"), pagination), `MediaPickerDialog` (same grid in a dialog with Upload/URL tabs, single/multi select, returns `{ url, alt, title, width, height }`), every image/file field across admin wired to it (`ImageField` → `onOpenMedia`/`onUpload`; property gallery editor multi-select + drag-drop upload; floor plans; documents (PDF); developer/locality/author/testimonial/team images; page blocks (hero/image/gallery); featured images; editor `onRequestImage`; settings logos (40 will use it); résumé upload already uses `uploadToCloudinary`); every upload also records a `media` metadata record; `LazyImage`/`Picture` render `srcSet`/`sizes` via `cloudinaryUrl` for Cloudinary URLs (widths `[320, 480, 640, 960, 1280, 1600]`, `f_auto,q_auto`, `c_fill` with the box ratio when `ratio` is set; `dpr_auto`), blur-up placeholder (`w_24,e_blur:200,q_1` Cloudinary thumb when Cloudinary; solid surface otherwise), fixed aspect boxes; non-Cloudinary URLs untouched. When Cloudinary is not configured, upload buttons are hidden and URL entry works everywhere.

## 3. Scope
### Files to create
- `src/pages/admin/media/MediaLibraryPage.jsx` (+ css), `MediaGrid.jsx`, `MediaCard.jsx`, `MediaUploadZone.jsx`, `MediaEditDrawer.jsx`, `MediaAddUrlDialog.jsx`, `useMediaUpload.js` (queue with progress, retries, `media` record creation)
- `src/components/admin/MediaPickerDialog.jsx` (+ css), `src/components/admin/useMediaField.js` (glue: gives `ImageField` the `onOpenMedia`/`onUpload` handlers when configured)
- `src/hooks/useCloudinaryConfig.js` (`{ configured, cloudName, uploadPreset }` from settings/env)
- `src/components/ui/Picture.jsx` (art direction: `sources` per breakpoint; wraps `LazyImage`)
- Tests: `src/utils/__tests__/cloudinary.test.js` (extend: `cloudinaryUrl` srcSet builder `buildSrcSet(url, widths, opts)`, non-Cloudinary passthrough, blur thumb), `src/components/ui/__tests__/LazyImage.test.jsx` (srcSet/sizes for Cloudinary URLs; none for others), `src/pages/admin/media/__tests__/MediaLibraryPage.test.jsx` (URL add creates a record; delete blocked when used), `src/components/admin/__tests__/MediaPickerDialog.test.jsx` (select returns the record)
### Files to modify
- `src/components/admin/ImageField.jsx` (use `useMediaField`), `src/components/ui/LazyImage.jsx`, every image consumer that renders Cloudinary-capable images (`PropertyCard`, gallery/lightbox slides, article/locality/developer heroes, avatars) to pass `sizes`/`ratio` so `srcSet` applies; property `ImageGalleryEditor` (multi upload/select), `FloorPlansTab`, `DocumentsTab` (file picker for PDFs), `RichTextEditor` hosts (`onRequestImage` → picker), `blockSchemas.js` image fields, `src/routes/adminRouteConfig.js`, `docs/*`
### Files to delete
- none
### May also touch
- `src/utils/cloudinary.js` (extend), `mock-server/routes/media.js` (`force` delete flag)

## 4. Detailed tasks
1. **`cloudinaryUrl` extensions**: `buildSrcSet(url, widths = [320,480,640,960,1280,1600], { ratio, crop = 'fill' })` → `"<url w_320> 320w, …"` with `f_auto,q_auto,dpr_auto` (+ `h_` when `ratio`); `blurThumb(url)` (`w_24,q_1,e_blur:200,f_auto`); `parseCloudinary(url)` → `{ cloudName, publicId, version, resourceType }`; all pure with tests; non-Cloudinary URLs return `null`/passthrough.
2. **`LazyImage`**: when `parseCloudinary(src)` → `srcSet`/`sizes` (default `sizes` from a `sizes` prop or `(max-width: 899px) 100vw, 33vw`), blur-up background from `blurThumb`, `src` = `cloudinaryUrl(src, { w: 960 })`; else plain `src`; keep ratio boxes, `loading="lazy"` (except `priority` prop → eager + `fetchpriority="high"` for LCP images: property hero, article featured image, home hero), `decoding="async"`, error fallback; `Picture` for art direction (hero mobile/desktop from settings).
3. **Upload queue (`useMediaUpload`)**: accepts files (validate types: images jpg/png/webp/avif/gif ≤ 10 MB, videos mp4/webm ≤ 100 MB, documents pdf/doc/docx ≤ 10 MB), uploads sequentially (max 2 concurrent) via `uploadToCloudinary` with `folder` (`sna/<folder>`), progress per file, retry once on failure; on success `mediaService.create({ url, publicId, provider: 'cloudinary', type, width, height, bytes, format, alt: <filename-derived, editable>, title, folder, tags })`; returns records; cancel support (abort XHR).
4. **Media library page**: header (count, Upload button (hidden when not configured, with an info `Alert` "Configure Cloudinary in Settings → Integrations to enable uploads"), Add by URL), filters (search alt/title/url, type, folder select (distinct folders from the list + free text), provider), grid (cards: thumbnail via `cloudinaryUrl` 320 or a type icon for documents/videos; alt/title; size/dimensions; copy URL button; "Used in N" badge), pagination; `MediaEditDrawer` (preview, url (read-only + copy), alt (required), title, folder, tags (creatable), usage list with links, Delete (confirm; blocked when used unless "Force delete metadata" checkbox — add `?force=true` to the mock DELETE: 409 without force when used)); `MediaUploadZone` (drag-drop + file input + folder select + progress rows); `MediaAddUrlDialog` (URL, alt required, title, type auto-detected from extension/host, provider inferred).
5. **`MediaPickerDialog`**: props `{ open, onClose, onSelect(items), multiple, accept: 'image'|'document'|'video'|'any', folder }`; tabs Library (grid + filters + selection with checkmarks) / Upload (zone; auto-selects uploaded items) / URL (dialog inline); footer "Select N"; keyboard accessible; returns records.
6. **Wire fields**: `useMediaField({ accept })` gives `ImageField` `onOpenMedia` (opens the picker, single) and `onUpload` (direct upload) when configured; property gallery editor: "Add from library" (multi) + drop zone upload (records + rows with alt prefilled); floor plan images/PDFs; documents (`accept: 'document'`); editor `onRequestImage` → picker (returns `{ url, alt, caption }`); page block image fields; developer/locality/author/testimonial/team fields (through `ImageField`); `LazyImage` `sizes` passed by cards/heroes; property/article hero images `priority`.
7. Tests; format; verify `npm run build` bundle: media library/picker code only in admin chunks.

## 5. Data contract touched
Consumed: `GET /admin/media` (+ `withUsage`), `POST /admin/media`, `PATCH /admin/media/:id`, `DELETE /admin/media/:id?force=true` (mock change: 409 when used and not forced — registry/docs/test), Cloudinary unsigned upload API (external). Config: `settings.integrations.cloudinaryCloudName/cloudinaryUploadPreset`, `REACT_APP_CLOUDINARY_CLOUD_NAME/UPLOAD_PRESET`.

## 6. UI/UX requirements
Grid 6/4/2 columns with square thumbnails (`object-fit: cover`), selection rings in primary, drawer 480 px; upload zone with dashed border and progress bars; picker dialog `maxWidth="lg"` full-screen on mobile; copy URL toast; every control labelled; images everywhere keep ratios (no CLS); LCP images eager.

## 7. Edge cases that must work
- Not configured: no upload UI anywhere; URL entry everywhere; picker Library/URL tabs only.
- Upload failure mid-queue → other files continue; failed rows show Retry.
- Deleting used media without force → 409 dialog listing usages.
- Picker multi-select returns items in selection order; gallery appends without duplicates (by URL).
- `LazyImage` with a Cloudinary URL that already contains transformations → transformations merged (don't double `/upload/`).
- Very large seed lists (200+ media) paginate; search debounced.

## 8. Acceptance criteria
- [ ] `/admin/media` and `MediaPickerDialog` work (with URL mode always; upload mode when Cloudinary is configured — if no test cloud is available, record "upload path verified by unit tests only").
- [ ] Every admin image/file field offers Library/URL (and Upload when configured); the editor's image dialog uses the picker; property gallery multi-select works.
- [ ] `LazyImage`/`Picture` emit `srcSet`/`sizes`/blur-up for Cloudinary URLs (inspect a brand image element) and plain `src` for picsum URLs.
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
Manual QA (desktop + 390 px): `/admin/media` → Add by URL (picsum) with alt → appears; edit tags; try deleting a used seed image → blocked; property gallery → "Add from library" → select 2 → rows added; editor image → picker; if configured: upload a PNG → progress → record → use it on a page; check `<img srcset>` on the header logo (Cloudinary) in DevTools.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 39 report; Pending rewrites: none for media; next prompt: 40.
- `docs/DECISIONS.md`: D12, upload limits, folder convention `sna/<folder>`, force-delete rule, `priority` images list.

## 11. Commit
`git add -A && git commit -m "feat(media): media library, Cloudinary unsigned uploads, picker dialog, responsive Cloudinary images"`

## 12. Guardrails
- Do not touch: `db.json`, `theme.js`, `global.css`, mock beyond the force-delete rule.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (URL entry remains everywhere).
