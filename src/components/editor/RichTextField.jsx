import { Suspense, forwardRef, lazy, useCallback, useEffect, useRef, useState } from 'react';

import Skeleton from '../ui/Skeleton';
import useMediaUpload, { kindOf } from '../../pages/admin/media/useMediaUpload';

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
 * And since prompt 51, a picture **dropped** on the editor is uploaded into the
 * form's folder when Cloudinary is configured (the same queue as the media
 * library) and then described in the image dialog; before, the dialog opened
 * empty and the file was thrown away. The upload's progress, or why it failed,
 * is the line under the editor.
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

/** The drop's status line, styled inline for the reason the skeleton is (above). */
const STATUS_STYLE = {
  margin: 'var(--space-2) 0 0',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-muted)',
};
const ERROR_STYLE = { ...STATUS_STYLE, color: 'var(--color-error-dark)' };
const SILENT_STYLE = { margin: 0 };

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

  /* ---------------- a dropped picture ---------------- */

  const queue = useMediaUpload({ folder, accept: 'image' });
  const [dropId, setDropId] = useState(null);
  const dropResolve = useRef(null);
  const dropped = dropId ? (queue.items.find((item) => item.id === dropId) ?? null) : null;

  const onDropFiles = useCallback(
    (files) => {
      if (!queue.configured) return null;
      const image = Array.from(files ?? []).find((file) => kindOf(file) === 'image');
      if (!image) return null;
      dropResolve.current?.(null);
      const [item] = queue.enqueue([image]);
      setDropId(item?.id ?? null);
      return new Promise((resolve) => {
        dropResolve.current = resolve;
      });
    },
    [queue]
  );

  // The upload settles the drop: done hands the address to the image dialog,
  // a failure leaves its reason on the line under the editor.
  const { dismiss } = queue;
  useEffect(() => {
    if (!dropped) return;
    if (dropped.status === 'done' && dropped.record) {
      const resolve = dropResolve.current;
      dropResolve.current = null;
      resolve?.({ src: dropped.record.url, alt: dropped.record.alt ?? '' });
      dismiss(dropped.id);
      setDropId(null);
    } else if (dropped.status === 'error' || dropped.status === 'cancelled') {
      const resolve = dropResolve.current;
      dropResolve.current = null;
      resolve?.(null);
    }
  }, [dropped, dismiss]);

  const uploading =
    dropped && ['queued', 'uploading', 'saving'].includes(dropped.status) ? dropped : null;
  const failed = dropped && dropped.status === 'error' ? dropped : null;

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
          onDropFiles={onDropFiles}
          {...props}
        />
      </Suspense>

      {/* The live region is always there, so the first message is announced. */}
      <p
        role="status"
        aria-live="polite"
        style={failed ? ERROR_STYLE : uploading ? STATUS_STYLE : SILENT_STYLE}
      >
        {uploading
          ? `Uploading ${uploading.name}… ${Math.round(uploading.progress ?? 0)}%`
          : failed
            ? `${failed.name} could not be uploaded: ${failed.error}`
            : null}
      </p>

      {picking ? (
        <Suspense fallback={null}>
          <MediaPickerDialog
            open
            accept="image"
            folder={folder}
            title="Insert an image"
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
