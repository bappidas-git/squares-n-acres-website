import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import IconButton from '../ui/IconButton';

import styles from './SortableList.module.css';

const defaultId = (item, index) => item?.id ?? index;

/**
 * A list the admin can reorder.
 *
 * Dragging is the fast path; the ↑/↓ buttons are the real one. They are always
 * in the DOM (visible on hover and on focus), which is what makes the list work
 * with a keyboard, with a screen reader — every move is announced through an
 * `aria-live` region — and on a touch device, where HTML5 drag events do not
 * fire at all. `Alt+↑` / `Alt+↓` move the focused row without reaching for them.
 *
 * A row is dragged by its handle only. Draggable end to end, a row turned
 * every attempt to select text in one of its fields into a drag of the whole
 * row; and `Alt+↑` pressed inside a field — the paragraph jump on a Mac —
 * moved the row out from under the cursor. The shortcut now belongs to the
 * row itself, focused, and nothing inside it.
 *
 * @param {object} props
 * @param {Array<object>} props.items
 * @param {(items: Array<object>, move: {from: number, to: number, item: object}) => void}
 *   props.onReorder the whole list in its new order, plus the one move that got
 *   it there — a caller that writes positions needs to know which row travelled
 * @param {(item: object, index: number) => React.ReactNode} props.renderItem
 * @param {(item: object, index: number) => string|number} [props.getId]
 * @param {(item: object, index: number) => string} [props.getLabel] used in the announcement
 * @param {boolean} [props.disabled]
 */
export default function SortableList({
  items = [],
  onReorder,
  renderItem,
  getId = defaultId,
  getLabel,
  disabled = false,
  label = 'Sortable list',
}) {
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  // The row whose handle is held: only that row is draggable, for as long as it is.
  const [armedIndex, setArmedIndex] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const listRef = useRef(null);

  // A handle pressed and released somewhere else disarms its row as well.
  useEffect(() => {
    if (armedIndex === null) return undefined;
    const disarm = () => setArmedIndex(null);
    window.addEventListener('pointerup', disarm);
    return () => window.removeEventListener('pointerup', disarm);
  }, [armedIndex]);

  const nameOf = (item, index) => getLabel?.(item, index) ?? `Item ${index + 1}`;

  const move = (from, to, { focus = false } = {}) => {
    if (disabled || to < 0 || to >= items.length || from === to) return;

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder?.(next, { from, to, item: moved });
    setAnnouncement(`${nameOf(moved, from)} moved to position ${to + 1} of ${items.length}.`);

    if (!focus) return;
    // The row travelled; the focus follows it to its new position.
    window.requestAnimationFrame(() => {
      listRef.current?.querySelectorAll(`[data-sortable-row]`)[to]?.focus();
    });
  };

  return (
    <div className={styles.wrapper}>
      <ul className={styles.list} ref={listRef} aria-label={label}>
        {items.map((item, index) => {
          const id = getId(item, index);
          return (
            <li
              key={id}
              data-sortable-row
              tabIndex={disabled ? undefined : 0}
              draggable={!disabled && armedIndex === index}
              aria-label={`${nameOf(item, index)}, position ${index + 1} of ${items.length}`}
              className={[
                styles.item,
                draggingIndex === index ? styles.dragging : '',
                overIndex === index && draggingIndex !== index ? styles.over : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onDragStart={(event) => {
                setDraggingIndex(index);
                event.dataTransfer.effectAllowed = 'move';
                // Firefox refuses to start a drag without payload.
                event.dataTransfer.setData('text/plain', String(id));
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (overIndex !== index) setOverIndex(index);
              }}
              onDragLeave={() => setOverIndex((current) => (current === index ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                if (draggingIndex !== null) move(draggingIndex, index);
                setDraggingIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDraggingIndex(null);
                setOverIndex(null);
                setArmedIndex(null);
              }}
              onKeyDown={(event) => {
                if (!event.altKey) return;
                // The row's own shortcut: pressed in a field inside it, the keys
                // belong to the field.
                if (event.target !== event.currentTarget) return;
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  move(index, index - 1, { focus: true });
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  move(index, index + 1, { focus: true });
                }
              }}
            >
              <span
                className={[styles.handle, disabled ? styles.handleOff : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden="true"
                onPointerDown={() => {
                  if (!disabled) setArmedIndex(index);
                }}
              >
                <Icon icon="mdi:drag-vertical" width="20" height="20" />
              </span>

              <div className={styles.body}>{renderItem?.(item, index)}</div>

              <span className={styles.moves}>
                <IconButton
                  label={`Move ${nameOf(item, index)} up`}
                  size="sm"
                  disabled={disabled || index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  <Icon icon="mdi:arrow-up" width="18" height="18" />
                </IconButton>
                <IconButton
                  label={`Move ${nameOf(item, index)} down`}
                  size="sm"
                  disabled={disabled || index === items.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  <Icon icon="mdi:arrow-down" width="18" height="18" />
                </IconButton>
              </span>
            </li>
          );
        })}
      </ul>

      <p className={styles.announcer} aria-live="polite" role="status">
        {announcement}
      </p>
    </div>
  );
}
