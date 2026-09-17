import { Suspense, lazy, useState } from 'react';
import { Icon } from '@iconify/react';
import { NodeViewWrapper } from '@tiptap/react';

import Button from '../../ui/Button';
import IconButton from '../../ui/IconButton';

import styles from '../RichTextEditor.module.css';

const FaqItemsDialog = lazy(() => import('./FaqItemsDialog'));

/**
 * The FAQ block as it looks while it is being written: the questions it holds,
 * and the button that opens the editor for them.
 */
export default function FaqBlockView({ node, updateAttributes, deleteNode, editor }) {
  const [open, setOpen] = useState(false);
  const items = Array.isArray(node.attrs.items) ? node.attrs.items : [];
  const disabled = !editor.isEditable;

  return (
    <NodeViewWrapper className={styles.nodeBlock} data-drag-handle>
      <div className={styles.nodeBody} contentEditable={false}>
        <div className={styles.nodeHead}>
          <span className={styles.nodeLabel}>
            <Icon icon="mdi:comment-question-outline" width="18" height="18" aria-hidden="true" />
            Questions
          </span>
          {disabled ? null : (
            <IconButton label="Remove these questions" size="sm" onClick={() => deleteNode()}>
              <Icon icon="mdi:close" width="18" height="18" />
            </IconButton>
          )}
        </div>

        {items.length > 0 ? (
          <ol className={styles.nodeList}>
            {items.map((item, index) => (
              <li key={item.id ?? index}>{item.question || 'Untitled question'}</li>
            ))}
          </ol>
        ) : (
          <p className={styles.nodeEmpty}>
            No questions yet — this block will not appear on the page.
          </p>
        )}

        {disabled ? null : (
          <Button
            variant="outline"
            size="sm"
            icon={<Icon icon="mdi:pencil-outline" width="16" height="16" />}
            onClick={() => setOpen(true)}
          >
            {items.length > 0 ? 'Edit questions' : 'Add questions'}
          </Button>
        )}
      </div>

      {open ? (
        <Suspense fallback={null}>
          <FaqItemsDialog
            open
            items={items}
            onChange={(next) => updateAttributes({ items: next })}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      ) : null}
    </NodeViewWrapper>
  );
}
