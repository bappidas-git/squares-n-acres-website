import { Suspense, forwardRef, lazy } from 'react';

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
 * The placeholder is drawn with the design system's skeleton rather than a
 * stylesheet of its own: this wrapper sits in the panel's bundle while
 * everything it stands in for sits in the lazy one, and a stylesheet spanning
 * that boundary is what makes the extracted CSS order ambiguous.
 *
 * Every prop is forwarded untouched; see `RichTextEditor.jsx` for the contract.
 */

const RichTextEditor = lazy(() => import('./RichTextEditor'));

const RichTextField = forwardRef(function RichTextField({ minHeight, ...props }, ref) {
  return (
    <Suspense
      fallback={
        <div role="status" aria-label="Loading the editor" aria-live="polite">
          <Skeleton variant="rounded" height={44} sx={{ marginBottom: 'var(--space-2)' }} />
          <Skeleton variant="rounded" height={minHeight ?? 220} />
        </div>
      }
    >
      <RichTextEditor ref={ref} minHeight={minHeight} {...props} />
    </Suspense>
  );
});

export default RichTextField;
