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

  // The panel closes when the caret moves on, so it never hangs over the line
  // below the one it was opened from.
  useEffect(() => {
    if (!position) setOpen(false);
  }, [position]);

  if (!position) return null;

  return (
    <div
      className={styles.inserter}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <button
        type="button"
        className={styles.inserterTrigger}
        aria-label="Insert a block"
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon icon="mdi:plus" width="18" height="18" aria-hidden="true" />
      </button>

      {open ? (
        <div ref={panelRef} className={styles.inserterPanel} role="menu" aria-label="Insert">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
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
