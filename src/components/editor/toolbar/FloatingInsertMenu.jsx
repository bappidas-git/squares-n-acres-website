import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { posToDOMRect } from '@tiptap/react';

import { isMounted } from './BubbleMenuBar';

import styles from '../RichTextEditor.module.css';

/**
 * The “+” that appears at the start of an empty paragraph.
 *
 * Everything it offers is also on the toolbar; what it adds is the writer's
 * own place — a blank line halfway down a long article, where the toolbar is
 * off the top of the screen.
 *
 * @param {object} props
 * @param {import('@tiptap/core').Editor} props.editor
 * @param {React.RefObject<HTMLElement>} props.containerRef
 * @param {Array<{key: string, label: string, icon: string, run: () => void}>} props.items
 */
export default function FloatingInsertMenu({ editor, containerRef, items }) {
  const [position, setPosition] = useState(null);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const wrapRef = useRef(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!isMounted(editor) || !container) return setPosition(null);

    const { state, view } = editor;
    const { $from, empty } = state.selection;

    const emptyParagraph =
      empty &&
      editor.isEditable &&
      view.hasFocus() &&
      $from.parent.type.name === 'paragraph' &&
      $from.parent.content.size === 0;

    if (!emptyParagraph) return setPosition(null);

    const caret = posToDOMRect(view, $from.pos, $from.pos);
    const box = container.getBoundingClientRect();
    return setPosition({ top: caret.top - box.top, left: caret.left - box.left });
  }, [editor, containerRef]);

  // Focus moving from the editor into the "+" or its panel is not the caret
  // leaving: the control stays (prompt 51 — it vanished on the Tab that should
  // have reached it).
  const onEditorBlur = useCallback(
    ({ event } = {}) => {
      if (wrapRef.current?.contains(event?.relatedTarget)) return;
      measure();
    },
    [measure]
  );

  useEffect(() => {
    if (!editor) return undefined;
    measure();
    editor.on('create', measure);
    editor.on('selectionUpdate', measure);
    editor.on('transaction', measure);
    editor.on('focus', measure);
    editor.on('blur', onEditorBlur);
    return () => {
      editor.off('create', measure);
      editor.off('selectionUpdate', measure);
      editor.off('transaction', measure);
      editor.off('focus', measure);
      editor.off('blur', onEditorBlur);
    };
  }, [editor, measure, onEditorBlur]);

  // The panel closes when the caret moves on, so it never hangs over the line
  // below the one it was opened from.
  useEffect(() => {
    if (!position) setOpen(false);
  }, [position]);

  if (!position) return null;

  return (
    <div
      ref={wrapRef}
      className={styles.inserter}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onBlur={(event) => {
        // Leaving the control for somewhere other than the editor closes it.
        if (wrapRef.current?.contains(event.relatedTarget)) return;
        if (isMounted(editor) && editor.view.dom.contains(event.relatedTarget)) return;
        setOpen(false);
        setPosition(null);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        setOpen(false);
        editor?.chain().focus().run();
      }}
    >
      <button
        type="button"
        className={styles.inserterTrigger}
        aria-label="Insert a block"
        aria-expanded={open}
        aria-controls={open ? 'editor-insert-panel' : undefined}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon icon="mdi:plus" width="18" height="18" aria-hidden="true" />
      </button>

      {open ? (
        // A disclosure of ordinary buttons, reached with Tab (prompt 51).
        <div
          ref={panelRef}
          className={styles.inserterPanel}
          role="group"
          aria-label="Insert"
          id="editor-insert-panel"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className={styles.inserterItem}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setOpen(false);
                item.run();
              }}
            >
              <Icon icon={item.icon} width="18" height="18" aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
