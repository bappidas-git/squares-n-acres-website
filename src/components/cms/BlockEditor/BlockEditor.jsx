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

export default function BlockEditor({ blocks = [], onChange, errors = {}, disabled = false }) {
  const [openIds, setOpenIds] = useState(() => new Set());
  const [picking, setPicking] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const emit = useCallback((next) => onChange?.(renumber(next)), [onChange]);

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
    emit([...blocks, block]);
    // A block an editor has just chosen opens: they added it to fill it in.
    setOpenIds((current) => new Set(current).add(String(block.id)));
  };

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
            <Button disabled={disabled} onClick={() => setPicking(true)}>
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
              onToggle={() => toggle(block.id)}
              onChange={(data) => update(block.id, data)}
              onDuplicate={() => duplicate(index)}
              onDelete={() => setDeleting({ id: block.id, name: nameOf(block, index) })}
            />
          )}
        />
      )}

      {blocks.length > 0 ? (
        <Button
          variant="outline"
          disabled={disabled}
          icon={<Icon icon="mdi:plus" width="18" height="18" />}
          onClick={() => setPicking(true)}
        >
          Add block
        </Button>
      ) : null}

      <BlockPicker open={picking} onClose={() => setPicking(false)} onPick={add} />

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
