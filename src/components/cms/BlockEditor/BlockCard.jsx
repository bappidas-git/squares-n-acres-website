import { useId } from 'react';
import { Icon } from '@iconify/react';

import BlockForm from './BlockForm';
import IconButton from '../../ui/IconButton';
import { blockSchema, blockSummary } from './blockSchemas';

import styles from './BlockEditor.module.css';

/**
 * One block in the editor: a header that says what it is, and its form.
 *
 * Collapsed, the header is all there is — the type, the block's own heading (or
 * the first words it carries) and a badge when something in it is still
 * missing. That is what makes a twelve-block page readable: an editor scrolls a
 * list of twelve lines, not twelve open forms.
 *
 * A block whose `type` this build does not know is not thrown away. It is shown
 * as "Unsupported block" with its raw type and a delete button, because the
 * data is still on the server and a browser that does not understand it is not
 * a reason to silently drop it on the next save.
 *
 * @param {object} props
 * @param {{id: string|number, type: string, data: object}} props.block
 * @param {number} props.index position in the list, for the labels
 * @param {boolean} props.open
 * @param {() => void} props.onToggle
 * @param {(data: object) => void} props.onChange
 * @param {() => void} props.onDuplicate
 * @param {() => void} props.onDelete
 * @param {Record<string, string>} [props.errors] keyed inside `data`
 * @param {boolean} [props.disabled]
 */
export default function BlockCard({
  block,
  index,
  open,
  onToggle,
  onChange,
  onDuplicate,
  onDelete,
  errors = {},
  disabled = false,
}) {
  const panelId = useId();
  const schema = blockSchema(block.type);
  const errorCount = Object.keys(errors).length;
  const summary = schema ? blockSummary(block.type, block.data) : block.type;
  const name = schema ? schema.label : 'Unsupported block';
  // "the hero block" reads well; "the unsupported block block" does not.
  const subject = schema ? `the ${name.toLowerCase()} block` : 'this unsupported block';

  return (
    <div className={[styles.card, open ? styles.cardOpen : ''].filter(Boolean).join(' ')}>
      <div className={styles.cardHead}>
        <button
          type="button"
          className={styles.cardToggle}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className={styles.cardIcon} aria-hidden="true">
            <Icon icon={schema ? schema.icon : 'mdi:help-rhombus-outline'} width="20" height="20" />
          </span>
          <span className={styles.cardText}>
            <span className={styles.cardType}>
              {index + 1}. {name}
            </span>
            {summary ? <span className={styles.cardSummary}>{summary}</span> : null}
          </span>
          <Icon
            icon={open ? 'mdi:chevron-up' : 'mdi:chevron-down'}
            width="20"
            height="20"
            aria-hidden="true"
            className={styles.cardChevron}
          />
        </button>

        {errorCount > 0 ? (
          <span className={styles.cardBadge}>
            <Icon icon="mdi:alert-circle-outline" width="14" height="14" aria-hidden="true" />
            {errorCount === 1 ? '1 problem' : `${errorCount} problems`}
          </span>
        ) : null}

        <span className={styles.cardActions}>
          {schema ? (
            <IconButton
              label={`Duplicate ${subject}`}
              size="sm"
              disabled={disabled}
              onClick={onDuplicate}
            >
              <Icon icon="mdi:content-copy" width="18" height="18" />
            </IconButton>
          ) : null}
          <IconButton
            label={`Delete ${subject}`}
            size="sm"
            disabled={disabled}
            className={styles.danger}
            onClick={onDelete}
          >
            <Icon icon="mdi:delete-outline" width="18" height="18" />
          </IconButton>
        </span>
      </div>

      <div id={panelId} className={styles.cardBody} hidden={!open}>
        {schema ? (
          <BlockForm
            schema={schema}
            data={block.data ?? {}}
            errors={errors}
            disabled={disabled}
            onChange={onChange}
          />
        ) : (
          <p className={styles.unsupported}>
            This page carries a block of type <code>{block.type}</code>, which this version of the
            panel cannot edit. It is left exactly as it is when the page is saved; delete it if it
            no longer belongs here.
          </p>
        )}
      </div>
    </div>
  );
}
