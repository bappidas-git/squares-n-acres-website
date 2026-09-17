import { Icon } from '@iconify/react';

import Button from '../../ui/Button';
import IconButton from '../../ui/IconButton';
import Modal from '../../ui/Modal';
import RichTextField from '../RichTextField';
import SortableList from '../../admin/SortableList';
import { TextField } from '../../ui/FormField';

import styles from '../RichTextEditor.module.css';

/** The next free id in a list of `{ id }` items. */
const nextId = (items) =>
  items.reduce((highest, item) => Math.max(highest, Number(item?.id) || 0), 0) + 1;

/**
 * The dialog behind a FAQ block's "Edit questions".
 *
 * Editing happens here rather than inline for a reason that is not only about
 * room: a dialog is a portal, so the compact editor each answer uses is never
 * nested inside the document being written. It is loaded on demand, which also
 * keeps the reorder list and the editor wrapper out of the editor's own chunk.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {Array<{id: number, question: string, answer: string}>} props.items
 * @param {(items: Array<object>) => void} props.onChange
 * @param {() => void} props.onClose
 */
export default function FaqItemsDialog({ open, items, onChange, onClose }) {
  const update = (id, patch) =>
    onChange(items.map((item) => (String(item.id) === String(id) ? { ...item, ...patch } : item)));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Questions in this block"
      description="They are rendered as the accordion the rest of the site uses."
      size="md"
      mobile="fullscreen"
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      {items.length > 0 ? (
        <SortableList
          items={items}
          label="Questions, in order"
          getId={(item) => item.id}
          getLabel={(item, index) => item.question || `Question ${index + 1}`}
          onReorder={onChange}
          renderItem={(item, index) => (
            <div className={styles.faqRow}>
              <div className={styles.faqRowHead}>
                <TextField
                  label={`Question ${index + 1}`}
                  fieldClassName={styles.faqRowField}
                  value={item.question ?? ''}
                  maxLength={200}
                  onChange={(event) => update(item.id, { question: event.target.value })}
                />
                <IconButton
                  label={`Remove question ${index + 1}`}
                  size="sm"
                  onClick={() =>
                    onChange(items.filter((entry) => String(entry.id) !== String(item.id)))
                  }
                >
                  <Icon icon="mdi:close" width="18" height="18" />
                </IconButton>
              </div>
              <RichTextField
                label="Answer"
                variant="compact"
                minHeight={120}
                value={item.answer ?? ''}
                onChange={(html) => update(item.id, { answer: html })}
              />
            </div>
          )}
        />
      ) : (
        <p className={styles.nodeEmpty}>Nothing here yet.</p>
      )}

      <Button
        variant="outline"
        size="sm"
        className={styles.faqAdd}
        icon={<Icon icon="mdi:plus" width="16" height="16" />}
        onClick={() => onChange([...items, { id: nextId(items), question: '', answer: '' }])}
      >
        Add question
      </Button>
    </Modal>
  );
}
