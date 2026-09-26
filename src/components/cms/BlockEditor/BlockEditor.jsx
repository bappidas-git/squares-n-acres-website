import { useCallback, useState } from 'react';
import { Icon } from '@iconify/react';

import BlockCard from './BlockCard';
import BlockPicker from './BlockPicker';
import Button from '../../ui/Button';
import ConfirmDialog from '../../ui/ConfirmDialog';
import EmptyState from '../../ui/EmptyState';
import SortableList from '../../admin/SortableList';
import { blockSchema, blockSummary, defaultData } from './blockSchemas';

import styles from './BlockEditor.module.css';

/**
 * The list of blocks a CMS page is made of (00_MASTER_CONTEXT.md §6.10).
 *
 * The editor owns no data: `blocks` in, `onChange(blocks)` out, with `order`
 * renumbered on every change so the array and the field always agree. The API
 * renumbers again on save, which means a reorder that leaves gaps or ties still
 * round-trips exactly.
 *
 * A block added here carries a `tmp-…` id. The server assigns the real one
 * (§5.5), and until it has, the temporary id is what keeps React's keys, the
 * open/collapsed state and the error map pointing at the same block through a
 * reorder.
 *
 * @param {object} props
 * @param {Array<{id: string|number, type: string, order: number, data: object}>} props.blocks
 * @param {(blocks: Array<object>) => void} props.onChange
 * @param {Record<string, Record<string, string>>} [props.errors] `{ [blockId]: { field: message } }`
 * @param {boolean} [props.disabled]
 * @param {number} [props.revealErrors] a counter: each new value opens every block
 *   that holds a message
 * @param {Array<string>} [props.allowedTypes] the types "Add block" offers — every
 *   type when absent; an empty list turns the button off
 * @param {string} [props.addNote] why the choice is narrowed, said beside the button
 *   and in the picker
 */

/** New blocks are `tmp-1`, `tmp-2`… within one editing session. */
let temporaryId = 0;
const nextTemporaryId = () => {
  temporaryId += 1;
  return `tmp-${temporaryId}`;
};

/** Whether an id was minted here rather than by the API. */
export const isTemporaryId = (id) => typeof id === 'string' && id.startsWith('tmp-');

/** `order` as `1…n`, in array order — the shape the API stores (§6.10). */
export const renumber = (blocks) => blocks.map((block, index) => ({ ...block, order: index + 1 }));

export default function BlockEditor({
  blocks = [],
  onChange,
  errors = {},
  disabled = false,
  revealErrors = 0,
  allowedTypes,
  addNote,
}) {
  const [openIds, setOpenIds] = useState(() => new Set());
  const [picking, setPicking] = useState(false);
  // Where the picker puts its block: after this index, or at the end (prompt 51).
  const [insertAfter, setInsertAfter] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // A refused save asks for the blocks that hold its messages to be opened: a
  // problem inside a collapsed card made Save and Publish look dead (prompt 51).
  // Opened in the render the request arrives in, so the host's effect that puts
  // the cursor in the first message already finds the card open.
  const [revealed, setRevealed] = useState(revealErrors);
  if (revealErrors !== revealed) {
    setRevealed(revealErrors);
    const withErrors = Object.keys(errors).filter((id) => Object.keys(errors[id] ?? {}).length);
    if (withErrors.length > 0) {
      setOpenIds((current) => new Set([...current, ...withErrors]));
    }
  }

  const emit = useCallback((next) => onChange?.(renumber(next)), [onChange]);
  const nothingToAdd = Array.isArray(allowedTypes) && allowedTypes.length === 0;

  const toggle = (id) =>
    setOpenIds((current) => {
      const next = new Set(current);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const add = (type) => {
    const block = {
      id: nextTemporaryId(),
      type,
      order: blocks.length + 1,
      data: defaultData(type),
    };
    const at = insertAfter === null ? blocks.length : insertAfter + 1;
    const next = [...blocks];
    next.splice(at, 0, block);
    emit(next);
    setInsertAfter(null);
    // A block an editor has just chosen opens: they added it to fill it in.
    setOpenIds((current) => new Set(current).add(String(block.id)));
  };

  /** "Insert below": the picker, for the place after this block. */
  const insertBelow = (index) => {
    setInsertAfter(index);
    setPicking(true);
  };

  /** "Hide for now": kept on the page record, left off the page. */
  const toggleHidden = (id) =>
    emit(
      blocks.map((block) =>
        String(block.id) === String(id) ? { ...block, hidden: block.hidden !== true } : block
      )
    );

  const update = (id, data) =>
    emit(blocks.map((block) => (String(block.id) === String(id) ? { ...block, data } : block)));

  const duplicate = (index) => {
    const source = blocks[index];
    const copy = {
      ...source,
      id: nextTemporaryId(),
      data: JSON.parse(JSON.stringify(source.data ?? {})),
    };
    const next = [...blocks];
    next.splice(index + 1, 0, copy);
    emit(next);
  };

  const remove = (id) => {
    emit(blocks.filter((block) => String(block.id) !== String(id)));
    setDeleting(null);
  };

  const nameOf = (block, index) => {
    const schema = blockSchema(block.type);
    const label = schema ? schema.label : 'Unsupported block';
    const summary = schema ? blockSummary(block.type, block.data) : '';
    return summary ? `${label} — ${summary}` : `${label} ${index + 1}`;
  };

  const expandAll = () => setOpenIds(new Set(blocks.map((block) => String(block.id))));
  const collapseAll = () => setOpenIds(new Set());

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        <p className={styles.count}>
          {blocks.length === 0
            ? 'No blocks yet'
            : `${blocks.length} ${blocks.length === 1 ? 'block' : 'blocks'}`}
        </p>
        {blocks.length > 1 ? (
          <span className={styles.toolbarActions}>
            <Button variant="ghost" size="sm" onClick={expandAll}>
              Expand all
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              Collapse all
            </Button>
          </span>
        ) : null}
      </div>

      {blocks.length === 0 ? (
        <EmptyState
          icon={<Icon icon="mdi:view-dashboard-outline" width="28" height="28" />}
          title="This page has no blocks"
          text="A page is a stack of bands — a hero, some words, a form. Add the first one."
          action={
            <Button disabled={disabled || nothingToAdd} onClick={() => setPicking(true)}>
              Add block
            </Button>
          }
          compact
        />
      ) : (
        <SortableList
          items={blocks}
          disabled={disabled}
          label="Page blocks, in order"
          getId={(block) => block.id}
          getLabel={nameOf}
          onReorder={emit}
          renderItem={(block, index) => (
            <BlockCard
              block={block}
              index={index}
              open={openIds.has(String(block.id))}
              errors={errors[String(block.id)] ?? {}}
              disabled={disabled}
              canDuplicate={!Array.isArray(allowedTypes) || allowedTypes.includes(block.type)}
              canInsert={!nothingToAdd}
              onToggle={() => toggle(block.id)}
              onChange={(data) => update(block.id, data)}
              onDuplicate={() => duplicate(index)}
              onInsertBelow={() => insertBelow(index)}
              onToggleHidden={() => toggleHidden(block.id)}
              onDelete={() => setDeleting({ id: block.id, name: nameOf(block, index) })}
            />
          )}
        />
      )}

      {blocks.length > 0 ? (
        <Button
          variant="outline"
          disabled={disabled || nothingToAdd}
          icon={<Icon icon="mdi:plus" width="18" height="18" />}
          onClick={() => setPicking(true)}
        >
          Add block
        </Button>
      ) : null}
      {addNote ? <p className={styles.addNote}>{addNote}</p> : null}

      <BlockPicker
        open={picking}
        onClose={() => {
          setPicking(false);
          setInsertAfter(null);
        }}
        onPick={add}
        position={insertAfter === null ? null : insertAfter + 2}
        types={allowedTypes}
        note={addNote}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this block?"
        message={
          deleting
            ? `“${deleting.name}” will be removed from the page when you save. This cannot be undone afterwards.`
            : undefined
        }
        confirmLabel="Delete"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={() => remove(deleting.id)}
      />
    </div>
  );
}
