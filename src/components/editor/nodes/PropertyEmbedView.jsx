import { Suspense, lazy, useState } from 'react';
import { Icon } from '@iconify/react';
import { NodeViewWrapper } from '@tiptap/react';

import Button from '../../ui/Button';
import Chip from '../../ui/Chip';
import IconButton from '../../ui/IconButton';

import styles from '../RichTextEditor.module.css';

const PropertyPickerDialog = lazy(() => import('./PropertyPickerDialog'));

/** The listings row as it looks while it is being written. */
export default function PropertyEmbedView({ node, updateAttributes, deleteNode, editor }) {
  const [open, setOpen] = useState(false);
  const ids = Array.isArray(node.attrs.ids) ? node.attrs.ids : [];
  const disabled = !editor.isEditable;

  return (
    <NodeViewWrapper className={styles.nodeBlock} data-drag-handle>
      <div className={styles.nodeBody} contentEditable={false}>
        <div className={styles.nodeHead}>
          <span className={styles.nodeLabel}>
            <Icon icon="mdi:home-group" width="18" height="18" aria-hidden="true" />
            Listings
          </span>
          {disabled ? null : (
            <IconButton label="Remove these listings" size="sm" onClick={() => deleteNode()}>
              <Icon icon="mdi:close" width="18" height="18" />
            </IconButton>
          )}
        </div>

        {ids.length > 0 ? (
          <div className={styles.nodeChips}>
            {ids.map((id) => (
              <Chip key={id}>Listing #{id}</Chip>
            ))}
          </div>
        ) : (
          <p className={styles.nodeEmpty}>
            No listings chosen yet — this block will not appear on the page.
          </p>
        )}

        {disabled ? null : (
          <Button
            variant="outline"
            size="sm"
            icon={<Icon icon="mdi:pencil-outline" width="16" height="16" />}
            onClick={() => setOpen(true)}
          >
            {ids.length > 0 ? 'Edit listings' : 'Choose listings'}
          </Button>
        )}
      </div>

      {open ? (
        <Suspense fallback={null}>
          <PropertyPickerDialog
            open
            ids={ids}
            onChange={(next) => updateAttributes({ ids: next })}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      ) : null}
    </NodeViewWrapper>
  );
}
