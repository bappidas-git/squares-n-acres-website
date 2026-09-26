import { Icon } from '@iconify/react';
import { NodeViewWrapper } from '@tiptap/react';

import { SITE_LEAD_SOURCE_OPTIONS } from '../../../config/enums';
import { SelectField, TextField, TextareaField } from '../../ui/FormField';
import IconButton from '../../ui/IconButton';

import styles from '../RichTextEditor.module.css';

/**
 * The CTA block as it looks while it is being written.
 *
 * Its fields are edited in place rather than behind a dialog: a call to action
 * is four short strings, and an editor comparing it with the paragraph above it
 * should be able to see both at once. The panel is `contentEditable={false}` so
 * the outer document never treats these boxes as text to format.
 *
 * @param {object} props Tiptap's node-view props
 */
export default function CtaBlockView({ node, updateAttributes, deleteNode, editor }) {
  const { title, text, buttonLabel, buttonHref, leadSource } = node.attrs;
  const disabled = !editor.isEditable;

  return (
    <NodeViewWrapper className={styles.nodeBlock} data-drag-handle>
      <div className={styles.nodeBody} contentEditable={false}>
        <div className={styles.nodeHead}>
          <span className={styles.nodeLabel}>
            <Icon icon="mdi:bullhorn-outline" width="18" height="18" aria-hidden="true" />
            Call to action
          </span>
          {disabled ? null : (
            <IconButton label="Remove this call to action" size="sm" onClick={() => deleteNode()}>
              <Icon icon="mdi:close" width="18" height="18" />
            </IconButton>
          )}
        </div>

        <div className={styles.nodeGrid}>
          <TextField
            label="Heading"
            value={title ?? ''}
            disabled={disabled}
            maxLength={120}
            onChange={(event) => updateAttributes({ title: event.target.value })}
          />
          <TextareaField
            label="Sentence"
            rows={2}
            value={text ?? ''}
            disabled={disabled}
            maxLength={300}
            onChange={(event) => updateAttributes({ text: event.target.value })}
          />
          <TextField
            label="Button label"
            value={buttonLabel ?? ''}
            disabled={disabled}
            maxLength={60}
            fieldClassName={styles.nodeHalf}
            onChange={(event) => updateAttributes({ buttonLabel: event.target.value })}
          />
          <SelectField
            label="File enquiries as"
            options={SITE_LEAD_SOURCE_OPTIONS}
            placeholder="Do not open the form"
            value={leadSource ?? ''}
            disabled={disabled}
            fieldClassName={styles.nodeHalf}
            hint="With a source the button opens the enquiry dialog; without one it is a link."
            onChange={(event) => updateAttributes({ leadSource: event.target.value })}
          />
          {leadSource ? null : (
            <TextField
              label="Button link"
              value={buttonHref ?? ''}
              disabled={disabled}
              placeholder="/localities/whitefield"
              onChange={(event) => updateAttributes({ buttonHref: event.target.value })}
            />
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}
