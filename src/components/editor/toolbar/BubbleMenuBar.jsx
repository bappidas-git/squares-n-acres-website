import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { posToDOMRect } from '@tiptap/react';

import styles from '../RichTextEditor.module.css';

/** How far above the selection the bar floats. */
const OFFSET = 8;

/**
 * Whether the editor has a live ProseMirror view behind it.
 *
 * `useEditor` hands back an instance before `EditorContent` has mounted its
 * view, and React's strict mode tears the view down and builds it again; asking
 * that instance where the selection is on screen throws. Both menus measure
 * geometry, so both have to ask first.
 */
export const isMounted = (editor) =>
  Boolean(editor) && editor.isInitialized && !editor.isDestroyed;

/**
 * The little bar that appears over a text selection.
 *
 * It is written here rather than taken from Tiptap's own menu package for two
 * reasons: it needs to be a real `role="toolbar"` whose buttons a keyboard can
 * reach, and its position has to be measured against the editor's own box so
 * that a full-screen editor and one inside a scrolling form both put it in the
 * right place.
 *
 * @param {object} props
 * @param {import('@tiptap/core').Editor} props.editor
 * @param {React.RefObject<HTMLElement>} props.containerRef the positioned ancestor
 * @param {() => void} props.onLink
 */
export default function BubbleMenuBar({ editor, containerRef, onLink }) {
  const ref = useRef(null);
  const [rect, setRect] = useState(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!isMounted(editor) || !container) return setRect(null);

    const { state, view } = editor;
    const { from, to, empty } = state.selection;

    if (empty || !editor.isEditable || !view.hasFocus()) return setRect(null);
    if (state.doc.textBetween(from, to, ' ').trim().length === 0) return setRect(null);

    const selection = posToDOMRect(view, from, to);
    const box = container.getBoundingClientRect();
    const height = ref.current?.offsetHeight ?? 40;

    return setRect({
      top: selection.top - box.top - height - OFFSET,
      left: Math.max(0, selection.left - box.left + selection.width / 2),
    });
  }, [editor, containerRef]);

  useEffect(() => {
    if (!editor) return undefined;
    measure();
    editor.on('create', measure);
    editor.on('selectionUpdate', measure);
    editor.on('transaction', measure);
    editor.on('focus', measure);
    editor.on('blur', measure);
    return () => {
      editor.off('create', measure);
      editor.off('selectionUpdate', measure);
      editor.off('transaction', measure);
      editor.off('focus', measure);
      editor.off('blur', measure);
    };
  }, [editor, measure]);

  if (!editor || !rect) return null;

  const button = (label, icon, active, run) => (
    <button
      type="button"
      className={[styles.bubbleButton, active ? styles.bubbleButtonOn : '']
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={run}
    >
      <Icon icon={icon} width="18" height="18" aria-hidden="true" />
    </button>
  );

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Selection formatting"
      className={styles.bubble}
      style={{ top: `${rect.top}px`, left: `${rect.left}px` }}
    >
      {button('Bold', 'mdi:format-bold', editor.isActive('bold'), () =>
        editor.chain().focus().toggleBold().run()
      )}
      {button('Italic', 'mdi:format-italic', editor.isActive('italic'), () =>
        editor.chain().focus().toggleItalic().run()
      )}
      {button('Link', 'mdi:link-variant', editor.isActive('link'), onLink)}
      {button('Heading 2', 'mdi:format-header-2', editor.isActive('heading', { level: 2 }), () =>
        editor.chain().focus().toggleHeading({ level: 2 }).run()
      )}
      {button('Heading 3', 'mdi:format-header-3', editor.isActive('heading', { level: 3 }), () =>
        editor.chain().focus().toggleHeading({ level: 3 }).run()
      )}
    </div>
  );
}
