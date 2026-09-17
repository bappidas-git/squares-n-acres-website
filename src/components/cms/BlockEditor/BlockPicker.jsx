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
 */
export default function BlockPicker({ open, onClose, onPick }) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (schema) =>
      !needle ||
      schema.label.toLowerCase().includes(needle) ||
      schema.description.toLowerCase().includes(needle) ||
      schema.type.toLowerCase().includes(needle);

    return BLOCK_GROUPS.map((group) => ({
      ...group,
      blocks: blocksInGroup(group.key).filter(matches),
    })).filter((group) => group.blocks.length > 0);
  }, [query]);

  const pick = (type) => {
    onPick(type);
    setQuery('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a block"
      description="Every band a page can be built from."
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
