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
 * as "Unsupported block" with its raw type and a delete button: the API refuses
 * a page that holds it (`blocks.N.type`), so the card says so and the refusal
 * lands on it, rather than on no card at all.
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
 * @param {boolean} [props.canDuplicate] `false` where a second one would never be
 *   shown — the home page's Features and Steps
 * @param {() => void} [props.onInsertBelow] opens the picker for the place after
 *   this block (prompt 51)
 * @param {() => void} [props.onToggleHidden] "Hide for now" and back (prompt 51)
 * @param {boolean} [props.canInsert] `false` when there is nothing left to add
 */
export default function BlockCard({
  block,
  index,
  open,
  onToggle,
  onChange,
  onDuplicate,
  onDelete,
  onInsertBelow,
  onToggleHidden,
  errors = {},
  disabled = false,
  canDuplicate = true,
  canInsert = true,
}) {
  const panelId = useId();
  const schema = blockSchema(block.type);
  const errorCount = Object.keys(errors).length;
  const summary = schema ? blockSummary(block.type, block.data) : block.type;
  const name = schema ? schema.label : 'Unsupported block';
  // "the hero block" reads well; "the unsupported block block" does not.
  const subject = schema ? `the ${name.toLowerCase()} block` : 'this unsupported block';
  const hidden = block.hidden === true;

  return (
    <div
      className={[styles.card, open ? styles.cardOpen : '', hidden ? styles.cardHidden : '']
        .filter(Boolean)
        .join(' ')}
    >
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

        {hidden ? (
          <span className={styles.hiddenBadge}>
            <Icon icon="mdi:eye-off-outline" width="14" height="14" aria-hidden="true" />
            Hidden
          </span>
        ) : null}

        {errorCount > 0 ? (
          <span className={styles.cardBadge}>
            <Icon icon="mdi:alert-circle-outline" width="14" height="14" aria-hidden="true" />
            {errorCount === 1 ? '1 problem' : `${errorCount} problems`}
          </span>
        ) : null}

        <span className={styles.cardActions}>
          {schema && onToggleHidden ? (
            <IconButton
              label={hidden ? `Show ${subject} on the page` : `Hide ${subject} for now`}
              size="sm"
              disabled={disabled}
              aria-pressed={hidden}
              onClick={onToggleHidden}
            >
              <Icon
                icon={hidden ? 'mdi:eye-outline' : 'mdi:eye-off-outline'}
                width="18"
                height="18"
              />
            </IconButton>
          ) : null}
          {onInsertBelow && canInsert ? (
            <IconButton
              label={`Insert a block below ${subject}`}
              size="sm"
              disabled={disabled}
              onClick={onInsertBelow}
            >
              <Icon icon="mdi:table-row-plus-after" width="18" height="18" />
            </IconButton>
          ) : null}
          {schema && canDuplicate ? (
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
        {errors.type ? (
          <p className={styles.cardError} role="alert">
            {errors.type}
          </p>
        ) : null}
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
            panel cannot edit — and a page holding it cannot be saved, because the API refuses a
            block type it does not know. Delete the block to save the page.
          </p>
        )}
      </div>
    </div>
  );
}
