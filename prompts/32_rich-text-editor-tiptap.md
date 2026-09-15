# Prompt 32 — Rich text editor (Tiptap v3): `RichTextEditor`, extensions, custom nodes (CTA / property embed / FAQ), sanitiser, `SafeHtml`, `.prose`; replace every HTML textarea

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §3.3 Tiptap pins, the master spec ART-02…ART-05 restated below, §13 D8), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–31 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
HTML is currently edited in plain textareas (property description, unit/FAQ answers, locality/developer descriptions, page `richText`/`html` blocks, job descriptions, FAQ answers, author bios, expandable cards) and rendered by the temporary `LegacyHtml` (`dangerouslySetInnerHTML` without sanitisation) in `OverviewSection`, `LocalityGuide`, `DeveloperHero`, `FaqAccordion`, `RichTextBlock`, `HtmlBlock`, `ExpandableCardsBlock`, `JobDetail`, `ArticleDetail` (legacy). `src/assets/styles/prose.css` exists (30). Media picker/upload arrive in 39 (`ImageField` contract). Articles admin/public are rewritten in 33/34 and will mount this editor. Allowed packages (exact pins, §3.3): `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-table`, `-table-row`, `-table-cell`, `-table-header`, `@tiptap/extension-youtube`, `@tiptap/extension-text-align`, `@tiptap/extension-underline`, `@tiptap/extensions` (Placeholder, CharacterCount) — all `3.31.3`; `dompurify@3.4.15`.

## 2. Objective
When this prompt is finished `src/components/editor/RichTextEditor.jsx` is the single rich-text editor (Tiptap v3): StarterKit (H2–H4 only, bold/italic/strike/code/blockquote/lists/hr/hard break/history), Underline, Link (dialog: URL, text, new-tab toggle, nofollow toggle, internal-link picker searching properties/localities/articles/pages), Image (from URL now; media library/upload hooks in 39; **alt required**, caption, alignment, width presets; rendered as `<figure><img loading="lazy"><figcaption>`), Table (header row, add/remove rows/cols), YouTube (responsive wrapper), TextAlign, Placeholder, CharacterCount (words + reading time), custom nodes **CtaBlock** (`{title, text, buttonLabel, buttonHref, leadSource}` → `<div data-sna-block="cta" data-*>`), **PropertyEmbed** (`{propertyIds[]}` → `<div data-sna-block="properties" data-ids="1,2">`), **FaqBlock** (`{items[]}` → `<div data-sna-block="faq">` with JSON in `data-items`), a fixed grouped toolbar with tooltips/shortcuts, bubble menu, floating "+" menu, full-screen mode, outline/word-count panel, paste cleanup, drag-drop image (URL prompt until 39), `variant="compact"`; `sanitize.js` (DOMPurify allow-list per ART-04) applied on save (`onChange` emits sanitised HTML) and `SafeHtml` (the **only** `dangerouslySetInnerHTML` in the codebase) rendering sanitised HTML with `.prose` and live rendering of `data-sna-block` placeholders (CTA → `CtaBlock` component with `openLeadModal`; properties → live `PropertyCard`s via `propertyService.list({ ids })`; faq → `FaqAccordion`); every HTML textarea in the app is replaced by the editor and every `LegacyHtml` by `SafeHtml`; `LegacyHtml` is deleted.

## 3. Scope
### Files to create
- `src/components/editor/RichTextEditor.jsx` (+ css), `extensions.js`, `toolbar/Toolbar.jsx`, `toolbar/BubbleMenuBar.jsx`, `toolbar/FloatingInsertMenu.jsx`, `toolbar/LinkDialog.jsx`, `toolbar/ImageDialog.jsx`, `toolbar/TableMenu.jsx`, `toolbar/YoutubeDialog.jsx`, `toolbar/OutlinePanel.jsx`, `nodes/CtaBlockNode.js` (+ `CtaBlockView.jsx`), `nodes/PropertyEmbedNode.js` (+ view), `nodes/FaqBlockNode.js` (+ view), `nodes/FigureImage.js` (Image extension configured to render `<figure>`), `InternalLinkPicker.jsx`, `sanitize.js`, `SafeHtml.jsx`, `blocks/RenderedCta.jsx`, `blocks/RenderedProperties.jsx`, `blocks/RenderedFaq.jsx`, `normalizeHtml.js` (trim trailing empty paragraphs, collapse `<p><br></p>` chains), `pasteRules.js`
- Tests: `src/components/editor/__tests__/sanitize.test.js` (allow-list: keeps figure/table/iframe YouTube, strips scripts/on*/javascript:/unknown iframes/styles; keeps `data-sna-*`), `normalizeHtml.test.js`, `SafeHtml.test.jsx` (renders CTA/properties/faq placeholders as components), `RichTextEditor.test.jsx` (mounts with jsdom, emits sanitised HTML; Tiptap needs `document.createRange`/`getClientRects` polyfills in `setupTests.js`)
### Files to modify
- `package.json` (pins), `src/setupTests.js` (polyfills), `src/assets/styles/prose.css` (editor + rendered styles, `.prose` figures/tables/callouts), every HTML textarea consumer: property form (description, FAQ answers, unit? no), `LocalityFormPage`, `DeveloperFormPage`, `contentConfigs.js` (FAQ answer, team bio) with `formFields type: 'richtext'` supported by `MasterDataForm`, `blockSchemas.js` (`richText.html`, `html.html`, `expandableCards.items[].html` → `richtext`), `JobsPage` config (description), `AuthorsPage` (33) will use it; every `LegacyHtml` consumer → `SafeHtml`; `docs/*`
### Files to delete
- `src/components/common/LegacyHtml.jsx` (or wherever prompt 11 placed it)
### May also touch
- `src/components/admin/MasterDataForm.jsx` (`richtext` field type)

## 4. Detailed tasks
1. `npm i @tiptap/react@3.31.3 @tiptap/pm@3.31.3 @tiptap/starter-kit@3.31.3 @tiptap/extension-link@3.31.3 @tiptap/extension-image@3.31.3 @tiptap/extension-table@3.31.3 @tiptap/extension-table-row@3.31.3 @tiptap/extension-table-cell@3.31.3 @tiptap/extension-table-header@3.31.3 @tiptap/extension-youtube@3.31.3 @tiptap/extension-text-align@3.31.3 @tiptap/extension-underline@3.31.3 @tiptap/extensions@3.31.3 dompurify@3.4.15`. Verify `npm ls @tiptap/react` shows one version; confirm the export names `Placeholder` and `CharacterCount` from `@tiptap/extensions` (D8) — if the installed version exports them elsewhere, follow the package's own `README`/types and record the exact import in `docs/DECISIONS.md`.
2. **`extensions.js`** — `buildExtensions({ variant, placeholder, onImageRequest })`: StarterKit configured `heading: { levels: [2, 3, 4] }`, `codeBlock: false`? (keep `code` inline; code blocks off for real-estate content — record), Underline, Link (`openOnClick: false`, `autolink: true`, `defaultProtocol: 'https'`, `HTMLAttributes: { rel: 'noopener' }`), `FigureImage` (extends Image with `alt` required attribute validation, `caption`, `align: left|center|right`, `width: 'full'|'wide'|'half'`; `renderHTML` → `<figure class="sna-figure align-x width-y"><img src alt loading="lazy"><figcaption>`; `parseHTML` for `figure > img`), Table + row/cell/header (`resizable: false`), Youtube (`nocookie: true`, `width/height` responsive via CSS), TextAlign (`types: ['heading','paragraph']`), Placeholder, CharacterCount, the three custom nodes (atom blocks with `NodeViewWrapper` React views: CTA (editable fields inline), PropertyEmbed (chips of selected properties + "Edit" → `EntityPicker` dialog), FaqBlock (list editor)), `pasteRules.js` (strip Word/Google Docs `class`/`style`/`span` noise, keep headings/lists/links/bold/italic/tables).
3. **`RichTextEditor` props:** `{ value (HTML), onChange(html), placeholder, variant: 'full'|'compact', minHeight, disabled, focusKeyword (for the alt hint), onRequestImage (async → `{ url, alt, caption }`; when absent the image dialog asks for a URL + alt), maxWords?, id, label, error, helper }`; emits `onChange(sanitize(normalizeHtml(editor.getHTML())))` debounced 200 ms; exposes `ref` methods `focus()`, `insertHtml()`, `getOutline()` (H2/H3 list), `getStats()` (`{ words, characters, readingTime }`). Toolbar groups: Text (paragraph/H2/H3/H4 select), Marks (bold, italic, underline, strike, code), Align, Lists (bullet, ordered), Blocks (blockquote, hr, table, image, YouTube, link), Inserts (CTA, Properties, FAQ), Utilities (undo/redo, clear formatting, full-screen, outline). `compact` variant: Text select, bold/italic/underline, lists, link, undo/redo only. Bubble menu on text selection (bold/italic/link/H2/H3); floating "+" menu on empty paragraphs (image, table, YouTube, CTA, properties, FAQ, hr). Keyboard shortcuts documented in tooltips. Full-screen = fixed overlay with `Escape` to exit and focus retained. Outline panel (right rail in full mode / collapsible in normal) with heading list (click → scroll) + counters (words, characters, reading time). Mobile: toolbar scrolls horizontally, 44 px buttons. Accessibility: toolbar `role="toolbar"` with arrow-key navigation, `aria-pressed` on toggles, `aria-label`s, editor `role="textbox" aria-multiline`.
4. **Link dialog:** URL (validated `https?://`, `mailto:`, `tel:`, `/relative`), text (when no selection), "Open in new tab", "No follow", and the **internal link picker** (`InternalLinkPicker`: tabs Properties / Localities / Articles / Pages, search via `propertyService.adminList({ q })`, `masterDataService.localities.list({ q })`, `articleService.adminList({ q })`, `pageService.adminList({ q })` → inserts the canonical public path from `paths.js`).
5. **`sanitize.js`:** `sanitizeHtml(html)` = DOMPurify with `ALLOWED_TAGS` (`p, br, h2, h3, h4, strong, em, u, s, code, blockquote, ul, ol, li, hr, a, img, figure, figcaption, table, thead, tbody, tr, th, td, iframe, div, span, mark, sup, sub`), `ALLOWED_ATTR` (`href, target, rel, src, alt, title, loading, width, height, class, colspan, rowspan, data-sna-block, data-ids, data-title, data-text, data-button-label, data-button-href, data-lead-source, data-items, data-align, data-width, allow, allowfullscreen, frameborder`), `iframe` `src` only for hosts `www.youtube.com`, `www.youtube-nocookie.com`, `player.vimeo.com`, `www.google.com/maps` (hook `uponSanitizeElement`), `class` limited to `sna-*`/`prose-*` values (hook), `javascript:`/`data:` URLs blocked (except `data:image/` on `img`? — blocked too), `target="_blank"` forces `rel="noopener"` (+ keeps `nofollow` when present); `ADD_TAGS`/`ADD_ATTR` as needed for `data-*`. `normalizeHtml` trims trailing `<p></p>`/`<p><br></p>` and collapses consecutive empties.
6. **`SafeHtml({ html, className, propertyCards = true })`:** sanitises again, splits the HTML at top-level `div[data-sna-block]` boundaries (parse with `DOMParser`; SSR/prerender fallback when `DOMParser` is undefined → render the sanitised HTML as-is), renders plain segments with `dangerouslySetInnerHTML` inside `<div class="prose">`, and the placeholders as React components: `RenderedCta` (band with `openLeadModal({ entry: leadSource })` or a link), `RenderedProperties` (`useApi(() => propertyService.list({ ids }))` → `PropertyCard`s in a small grid; hidden when none), `RenderedFaq` (`FaqAccordion`; the FAQ items are also exposed to `<Seo>` in 38 via a `useFaqBlocks` context? — simpler: `SafeHtml` accepts `onFaqItems(items)` callback that article/page pages use to merge into the `FAQPage` schema; record). Also adds `id`s to H2/H3 (slugified text, de-duplicated) for tables of contents; external links get `rel="noopener"`; images inside `.prose` get `loading="lazy"`.
7. **`prose.css`:** typographic rules for the rendered HTML and the editor (`.ProseMirror` shares the same class), figures (align/width variants), tables (scroll container), blockquotes, callouts, YouTube wrapper (16/9), `mark`, task lists none; tokens only.
8. **Replace consumers:** property form (description → editor full; FAQ answers → compact; unit configurations no; nearby no), locality/developer forms (description → full), `MasterDataForm` `richtext` type (FAQ answer compact, team bio compact, testimonials message stays plain), block editor (`richText`/`html`/`expandableCards.html` → full/compact), jobs description (full); `SafeHtml` everywhere `LegacyHtml` was; delete `LegacyHtml`; ensure `grep -rn "dangerouslySetInnerHTML" src` → only `SafeHtml.jsx`.
9. Tests (jsdom polyfills for Tiptap: `Range.prototype.getBoundingClientRect/getClientRects`, `document.createRange`, `window.matchMedia`), format, verify bundle: the editor is only in admin chunks (`npm run build` → check the main public chunk does not include `@tiptap`; lazy-load `RichTextEditor` in forms with `React.lazy`).

## 5. Data contract touched
No endpoint changes. Consumed for the link picker/embeds: admin lists (`q`) and `GET /properties?ids=`. npm: Tiptap packages + `dompurify` (pins above).

## 6. UI/UX requirements
Editor chrome on white with a subtle border, sticky toolbar inside long forms, focus ring; bubble/floating menus small and keyboard-reachable; dialogs from the UI kit; `.prose` readable (72ch, 1.7 line-height, headings scale); rendered CTA band uses `--color-primary-light`; embedded property grid 3/2/1; mobile toolbar scroll; reduced motion.

## 7. Edge cases that must work
- Pasting from Word keeps headings/lists/bold and drops `mso-*` styles/spans; pasting a YouTube URL on an empty line offers/creates an embed.
- Image without alt → dialog blocks insertion ("Alt text is required").
- Saving content with a `<script>` pasted as HTML in the `html` block → stripped by the sanitiser (and the mock rejects raw scripts).
- Existing seed HTML (articles/pages/properties) round-trips through the editor without losing figures/tables/`data-sna-block` nodes.
- `SafeHtml` with an unknown `data-sna-block` type → renders nothing for that block.
- `variant="compact"` hides block inserts; full-screen works on mobile.
- Editor in a disabled form (sales read-only) → `editable: false`, toolbar hidden.

## 8. Acceptance criteria
- [ ] `RichTextEditor` implements every feature of ART-02/ART-03 listed in §2 (verified manually + tests); custom nodes serialise to the documented placeholders.
- [ ] `sanitize.js` allow-list tests pass; `SafeHtml` is the only `dangerouslySetInnerHTML`; `LegacyHtml` deleted; every HTML textarea replaced.
- [ ] Public pages render seed HTML with `.prose` and live CTA/property/FAQ blocks (check an article via the legacy `ArticleDetail` — it now uses `SafeHtml`).
- [ ] Editor code is not in the public bundle (lazy chunk); `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run smoke` pass; no console warnings.
- [ ] One commit; clean tree.

## 9. Verification
```
npm ls @tiptap/react dompurify
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run dev   (then) npm run smoke
```
Manual QA (desktop + 390 px): admin → edit property 1 description → H2, list, table, image with alt, internal link to a locality, CTA block, property embed, FAQ block → Save → public property overview renders all (CTA opens the modal, property cards appear, FAQ accordion works); paste a Word-formatted paragraph → clean; full-screen + outline; compact editor in FAQ answer; `/insights/articles/<slug>` renders seed HTML with figures/tables.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 32 report; Pending rewrites: remove every "LegacyHtml → SafeHtml" and "textarea → editor" entry; next prompt: 33.
- `docs/DECISIONS.md`: D8 (exact import paths), code blocks disabled, `onFaqItems` callback, iframe host allow-list.

## 11. Commit
`git add -A && git commit -m "feat(editor): Tiptap rich text editor with custom SNA blocks, sanitiser and SafeHtml; replace all HTML textareas"`

## 12. Guardrails
- Do not touch: `db.json`, `theme.js`, `global.css` (editor styles in `prose.css`/module css), mock server.
- Do not add dependencies other than: the Tiptap packages and `dompurify` pinned in §1.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality.
