import { Icon } from '@iconify/react';
import { useEditorState } from '@tiptap/react';

import Tooltip from '../../ui/Tooltip';

import styles from '../RichTextEditor.module.css';

/** The table commands, in the order an editor reaches for them. */
const ACTIONS = [
  { key: 'addRowAfter', label: 'Add row below', icon: 'mdi:table-row-plus-after' },
  { key: 'addRowBefore', label: 'Add row above', icon: 'mdi:table-row-plus-before' },
  { key: 'deleteRow', label: 'Delete row', icon: 'mdi:table-row-remove' },
  { key: 'addColumnAfter', label: 'Add column right', icon: 'mdi:table-column-plus-after' },
  { key: 'addColumnBefore', label: 'Add column left', icon: 'mdi:table-column-plus-before' },
  { key: 'deleteColumn', label: 'Delete column', icon: 'mdi:table-column-remove' },
  { key: 'toggleHeaderRow', label: 'Header row', icon: 'mdi:table-headers-eye' },
  { key: 'mergeOrSplit', label: 'Merge or split cells', icon: 'mdi:table-merge-cells' },
  { key: 'deleteTable', label: 'Delete table', icon: 'mdi:table-remove' },
];

/**
 * The row of table commands, shown only while the cursor is inside a table.
 *
 * A table is the one structure the main toolbar cannot express with a single
 * button, and hiding these nine controls until they can do anything keeps the
 * toolbar readable for the ninety per cent of writing that has no table in it.
 *
 * @param {object} props
 * @param {import('@tiptap/core').Editor} props.editor
 */
export default function TableMenu({ editor }) {
  const inTable = useEditorState({
    editor,
    selector: ({ editor: instance }) => Boolean(instance?.isActive('table')),
  });

  if (!editor || !inTable) return null;

  return (
    <div role="toolbar" aria-label="Table" className={styles.tableMenu}>
      {ACTIONS.map((action) => (
        <Tooltip key={action.key} title={action.label}>
          <span className={styles.toolbarSlot}>
            <button
              type="button"
              className={styles.toolbarButton}
              aria-label={action.label}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor.chain().focus()[action.key]().run()}
            >
              <Icon icon={action.icon} width="18" height="18" aria-hidden="true" />
            </button>
          </span>
        </Tooltip>
      ))}
    </div>
  );
}
