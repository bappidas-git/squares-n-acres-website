import { Suspense, forwardRef, lazy, useCallback, useRef, useState } from 'react';

import Skeleton from '../ui/Skeleton';

/**
 * `RichTextEditor`, loaded only when a form actually shows one.
 *
 * Tiptap and ProseMirror are the heaviest thing in the panel and none of it
 * belongs in the bundle a visitor downloads, so every consumer imports this
 * wrapper rather than the editor itself: the editor and its extensions land in
 * their own chunk, fetched the first time an admin opens a form that edits
 * prose.
 *
 * It is also what breaks the one circular import in this folder — the FAQ
 * block's node view edits its answers with a compact editor, and reaching it
 * through a dynamic import keeps `extensions.js` out of its own dependency
 * cycle.
 *
 * Since prompt 39 it is also where the editor's image dialog gets its
 * "Choose from the library" button. Every form that edits prose imports this
 * one wrapper, so supplying `onRequestImage` here supplied it to all of them —
 * the article body, the locality description, the developer profile, a page
 * block, a property's overview — rather than nine forms each remembering to.
 * A host may still pass its own `onRequestImage` and this one stands aside.
 *
 * The placeholder is drawn with the design system's skeleton rather than a
 * stylesheet of its own: this wrapper sits in the panel's bundle while
 * everything it stands in for sits in the lazy one, and a stylesheet spanning
 * that boundary is what makes the extracted CSS order ambiguous.
 *
 * Every prop is forwarded untouched; see `RichTextEditor.jsx` for the contract.
 */

const RichTextEditor = lazy(() => import('./RichTextEditor'));
const MediaPickerDialog = lazy(() => import('../admin/MediaPickerDialog'));

const RichTextField = forwardRef(function RichTextField(
  { minHeight, onRequestImage, folder = 'articles', ...props },
  ref
) {
  const [picking, setPicking] = useState(false);
  // The dialog answers a promise the image dialog is already waiting on, so
  // the resolver outlives the render that created it.
  const pending = useRef(null);

  const settle = useCallback((picked) => {
    const resolve = pending.current;
    pending.current = null;
    setPicking(false);
    resolve?.(picked);
  }, []);

  const request = useCallback(() => {
    // A second request while one is open would strand the first for ever.
    pending.current?.(null);
    setPicking(true);
    return new Promise((resolve) => {
      pending.current = resolve;
    });
  }, []);

  return (
    <>
      <Suspense
        fallback={
          <div role="status" aria-label="Loading the editor" aria-live="polite">
            <Skeleton variant="rounded" height={44} sx={{ marginBottom: 'var(--space-2)' }} />
            <Skeleton variant="rounded" height={minHeight ?? 220} />
          </div>
        }
      >
        <RichTextEditor
          ref={ref}
          minHeight={minHeight}
          onRequestImage={onRequestImage ?? request}
          {...props}
        />
      </Suspense>

      {picking ? (
        <Suspense fallback={null}>
          <MediaPickerDialog
            open
            accept="image"
            folder={folder}
            title="Choose a picture for this article"
            onClose={() => settle(null)}
            onSelect={(items) => {
              const [first] = items;
              settle(first ? { url: first.url, alt: first.alt, caption: '' } : null);
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
});

export default RichTextField;
