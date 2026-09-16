import { useRef } from 'react';
import { Icon } from '@iconify/react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import SortableList from '../../../../../components/admin/SortableList';
import { Button, IconButton, TextField } from '../../../../../components/ui';
import { HIGHLIGHTS_MAX, HIGHLIGHT_MAX_LENGTH } from '../validators';
import { makeConstructionSpec, makeSpecification } from '../initialState';
import SpecificationsRepeater from '../components/SpecificationsRepeater';
import { usePropertyFormContext } from '../PropertyFormContext';

import styles from './PropertyTabs.module.css';

/**
 * The rows a Bengaluru specification sheet is written in (§4.2 of prompt 20).
 *
 * They are inserted with **empty values**: the labels are the questions a
 * buyer asks, and the answers are the developer's, not ours.
 */
export const STANDARD_CONSTRUCTION_ROWS = [
  { group: 'structure', label: 'RCC framed structure' },
  { group: 'flooring', label: 'Living / Dining' },
  { group: 'flooring', label: 'Bedrooms' },
  { group: 'flooring', label: 'Kitchen' },
  { group: 'flooring', label: 'Balconies' },
  { group: 'kitchen', label: 'Counter' },
  { group: 'kitchen', label: 'Sink' },
  { group: 'doors-windows', label: 'Main door' },
  { group: 'doors-windows', label: 'Internal doors' },
  { group: 'doors-windows', label: 'Windows' },
  { group: 'bathroom', label: 'Sanitary ware' },
  { group: 'bathroom', label: 'CP fittings' },
  { group: 'electrical', label: 'Wiring' },
  { group: 'electrical', label: 'Switches' },
  { group: 'electrical', label: 'Power backup' },
  { group: 'walls-painting', label: 'Internal' },
  { group: 'walls-painting', label: 'External' },
  { group: 'security', label: 'CCTV' },
  { group: 'security', label: 'Intercom' },
  { group: 'lift-common-areas', label: 'Lifts' },
  { group: 'lift-common-areas', label: 'Lobby' },
];

/** The standard rows a list does not already hold (same group, same label). */
export function missingStandardRows(rows = []) {
  const present = new Set(
    rows.map(
      (row) =>
        `${row.group ?? 'other'}::${String(row.label ?? '')
          .trim()
          .toLowerCase()}`
    )
  );
  return STANDARD_CONSTRUCTION_ROWS.filter(
    (row) => !present.has(`${row.group}::${row.label.toLowerCase()}`)
  );
}

/**
 * The sentences of a summary, as highlights.
 *
 * A sentence longer than a highlight is left behind rather than truncated —
 * half a sentence on a card is worse than no card.
 *
 * @param {string} summary `shortDescription`
 * @param {Array<string>} existing
 * @returns {Array<string>}
 */
export function highlightsFromSummary(summary, existing = []) {
  const already = new Set(
    existing.map((entry) =>
      String(entry ?? '')
        .trim()
        .toLowerCase()
    )
  );

  // A terminator only ends a sentence when whitespace or the end of the text
  // follows it, so "1.2 km from the metro" stays one highlight.
  return String(summary ?? '')
    .split(/[.!?]+\s+|[.!?]+$|\n+/)
    .map((sentence) =>
      sentence
        .replace(/\s+/g, ' ')
        .replace(/[.\s]+$/, '')
        .trim()
    )
    .filter(Boolean)
    .filter((sentence) => sentence.length <= HIGHLIGHT_MAX_LENGTH)
    .filter((sentence) => {
      const key = sentence.toLowerCase();
      if (already.has(key)) return false;
      already.add(key);
      return true;
    });
}

/** Stable keys for a list the contract stores as bare strings (§4.3). */
let keySequence = 0;
const nextKey = () => {
  keySequence += 1;
  return `highlight-${keySequence}`;
};

/**
 * Tab 8 — Highlights & specifications.
 *
 * Three lists that all answer "what is this place like?" at different depths:
 * the highlights a card repeats, the specifications table, and the
 * construction specifications that render inside the same section on the
 * public page (D39).
 *
 * The legacy form held the first as `specialities[] {icon, name, description}`;
 * the contract holds plain strings (D40), so an icon-and-paragraph card became
 * a sentence. The other two were a slow drag and a set of fixed area rows;
 * here they are one repeater used twice.
 */
export default function HighlightsSpecificationsTab() {
  const { values, errors, setField, addItem, removeItem, moveItem, updateItem, disabled } =
    usePropertyFormContext();

  const highlights = values.highlights ?? [];
  const specifications = values.specifications ?? [];
  const constructionSpecs = values.constructionSpecs ?? [];

  // `highlights` is a `string[]`, so a row has no id of its own to key on.
  // The keys travel with the rows: an add appends one, a remove drops one, a
  // move moves one, and a load — where the lengths no longer agree — re-keys.
  const keysRef = useRef([]);
  if (keysRef.current.length !== highlights.length) {
    keysRef.current = highlights.map((_row, index) => keysRef.current[index] ?? nextKey());
  }

  const full = highlights.length >= HIGHLIGHTS_MAX;

  const addHighlights = (entries) => {
    const room = HIGHLIGHTS_MAX - highlights.length;
    const accepted = entries.slice(0, Math.max(0, room));
    if (accepted.length === 0) return;
    accepted.forEach(() => keysRef.current.push(nextKey()));
    setField('highlights', [...highlights, ...accepted]);
  };

  const updateHighlight = (index, text) =>
    setField(
      'highlights',
      highlights.map((row, position) => (position === index ? text : row))
    );

  const removeHighlight = (index) => {
    keysRef.current.splice(index, 1);
    setField(
      'highlights',
      highlights.filter((_row, position) => position !== index)
    );
  };

  const moveHighlight = (from, to) => {
    const [key] = keysRef.current.splice(from, 1);
    keysRef.current.splice(to, 0, key);
    moveItem('highlights', from, to);
  };

  // Counted rather than discovered on the press: a button that reads
  // "From short description" and then does nothing — because the summary is
  // one sentence too long to be a highlight — is worse than one that says so.
  const importable = highlightsFromSummary(values.shortDescription, highlights);
  const fromSummary = () => addHighlights(importable);

  const addStandardRows = () =>
    missingStandardRows(constructionSpecs).forEach((row) =>
      addItem('constructionSpecs', makeConstructionSpec(row.group, { label: row.label }))
    );

  const standardLeft = missingStandardRows(constructionSpecs).length;

  return (
    <>
      <FormSection
        title="Highlights"
        description="One line each — the short claims a card repeats and the listing page prints with a tick. Keep them factual: they are the first thing a buyer reads."
      >
        <FormColumn>
          {highlights.length === 0 ? (
            <p className={styles.counter}>
              Nothing here yet. “Walk to Whitefield Metro”, “Corner unit with two balconies”, “Khata
              transferred” — the things this listing has that its neighbours do not.
            </p>
          ) : (
            <SortableList
              label="Highlights in order"
              items={highlights.map((textValue, index) => ({
                id: keysRef.current[index],
                text: textValue,
                index,
              }))}
              disabled={disabled}
              getId={(row) => row.id}
              getLabel={(row, position) => row.text || `Highlight ${position + 1}`}
              onReorder={(_next, { from, to }) => moveHighlight(from, to)}
              renderItem={(row) => (
                <div className={styles.highlightRow}>
                  <TextField
                    label={`Highlight ${row.index + 1}`}
                    value={row.text ?? ''}
                    error={errors[`highlights.${row.index}`]}
                    disabled={disabled}
                    maxLength={HIGHLIGHT_MAX_LENGTH}
                    placeholder="e.g. Five minutes from Whitefield Metro"
                    onChange={(event) => updateHighlight(row.index, event.target.value)}
                  />
                  <span className={styles.rowAction}>
                    <IconButton
                      label={`Remove highlight ${row.index + 1}`}
                      size="sm"
                      disabled={disabled}
                      onClick={() => removeHighlight(row.index)}
                    >
                      <Icon icon="mdi:close" width="18" height="18" />
                    </IconButton>
                  </span>
                </div>
              )}
            />
          )}
        </FormColumn>

        <FormColumn>
          <p className={styles.counter}>
            <span className={full ? styles.counterWarn : undefined}>
              {highlights.length} of {HIGHLIGHTS_MAX} used
            </span>
            <span>
              Up to {HIGHLIGHT_MAX_LENGTH} characters each — a longer sentence is not imported.
            </span>
          </p>
          <div className={[styles.actions, styles.actionsEnd].join(' ')}>
            <Button
              variant="ghost"
              disabled={disabled || full || importable.length === 0}
              onClick={fromSummary}
              icon={<Icon icon="mdi:text-box-plus-outline" width="18" height="18" />}
            >
              From short description ({importable.length})
            </Button>
            <Button
              variant="outline"
              disabled={disabled || full}
              onClick={() => addHighlights([''])}
              icon={<Icon icon="mdi:plus" width="18" height="18" />}
            >
              Add highlight
            </Button>
          </div>
        </FormColumn>
      </FormSection>

      <FormSection
        title="Specifications"
        description="The table under the overview: a label, its value, and an optional icon. Group them the way a buyer scans them."
      >
        <FormColumn>
          <SpecificationsRepeater
            path="specifications"
            rows={specifications}
            errors={errors}
            withIcon
            disabled={disabled}
            labelPlaceholder="e.g. Structure"
            valuePlaceholder="e.g. RCC framed, seismic zone II"
            emptyText="Nothing here yet. Add the rows the developer's sheet lists — one group at a time."
            onAdd={(group) => addItem('specifications', makeSpecification(group))}
            onUpdate={(id, patch) => updateItem('specifications', id, patch)}
            onRemove={(id) => removeItem('specifications', id)}
            onMove={(from, to) => moveItem('specifications', from, to)}
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="Construction specifications"
        description="What the building is made of, group by group. It renders inside the Specifications section of the listing as a second block (D39)."
        action={
          standardLeft > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={addStandardRows}
              icon={<Icon icon="mdi:playlist-plus" width="16" height="16" />}
            >
              Add standard rows ({standardLeft})
            </Button>
          ) : null
        }
      >
        <FormColumn>
          <SpecificationsRepeater
            path="constructionSpecs"
            rows={constructionSpecs}
            errors={errors}
            disabled={disabled}
            labelPlaceholder="e.g. Living / Dining"
            valuePlaceholder="e.g. 800 × 800 mm vitrified tiles"
            emptyText="Nothing here yet. “Add standard rows” lays out the usual labels with empty values — fill in what the developer specifies and delete the rest."
            onAdd={(group) => addItem('constructionSpecs', makeConstructionSpec(group))}
            onUpdate={(id, patch) => updateItem('constructionSpecs', id, patch)}
            onRemove={(id) => removeItem('constructionSpecs', id)}
            onMove={(from, to) => moveItem('constructionSpecs', from, to)}
          />
        </FormColumn>
      </FormSection>
    </>
  );
}
