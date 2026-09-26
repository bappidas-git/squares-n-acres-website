import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import Modal from '../../ui/Modal';
import { BLOCK_GROUPS, blocksInGroup } from './blockSchemas';
import { TextField } from '../../ui';

import styles from './BlockEditor.module.css';

/**
 * "Add block": every block type, grouped, searchable, each with the sentence
 * that says what it is for.
 *
 * Twenty-five names in a dropdown would tell an editor nothing — "Facts" and
 * "Stats" are indistinguishable until you read what they do — so the picker is
 * a dialog of cards rather than a `<select>`, and the search matches the
 * descriptions as well as the labels.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(type: string) => void} props.onPick
 * @param {Array<string>} [props.types] the block types this page can show — the
 *   home page renders one Features and one Steps block and nothing else, so it
 *   offers nothing else (prompt 51)
 * @param {string} [props.note] why the list is shorter than every type
 * @param {number|null} [props.position] the place the block goes, when it is
 *   inserted mid-list ("Insert below", prompt 51); the end of the page otherwise
 */
export default function BlockPicker({ open, onClose, onPick, types, note, position = null }) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (schema) =>
      !needle ||
      schema.label.toLowerCase().includes(needle) ||
      schema.description.toLowerCase().includes(needle) ||
      schema.type.toLowerCase().includes(needle);

    const allowed = (schema) => !types || types.includes(schema.type);

    return BLOCK_GROUPS.map((group) => ({
      ...group,
      blocks: blocksInGroup(group.key).filter((schema) => allowed(schema) && matches(schema)),
    })).filter((group) => group.blocks.length > 0);
  }, [query, types]);

  const pick = (type) => {
    onPick(type);
    setQuery('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={position ? `Insert a block at position ${position}` : 'Add a block'}
      description={note ?? 'Every band a page can be built from.'}
      size="lg"
      mobile="fullscreen"
    >
      <div className={styles.picker}>
        <TextField
          label="Search blocks"
          type="search"
          value={query}
          placeholder="Features, FAQ, map…"
          onChange={(event) => setQuery(event.target.value)}
        />

        {groups.length === 0 ? (
          <p className={styles.pickerEmpty}>No block type matches “{query.trim()}”.</p>
        ) : null}

        {groups.map((group) => (
          <section key={group.key} className={styles.pickerGroup}>
            <h3 className={styles.pickerGroupTitle}>{group.label}</h3>
            <p className={styles.pickerGroupHint}>{group.description}</p>

            <ul className={styles.pickerGrid}>
              {group.blocks.map((schema) => (
                <li key={schema.type}>
                  <button
                    type="button"
                    className={styles.pickerCard}
                    onClick={() => pick(schema.type)}
                  >
                    <span className={styles.pickerIcon} aria-hidden="true">
                      <Icon icon={schema.icon} width="22" height="22" />
                    </span>
                    <span className={styles.pickerLabel}>{schema.label}</span>
                    <span className={styles.pickerDescription}>{schema.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
