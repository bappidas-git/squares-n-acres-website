import { Icon } from '@iconify/react';

import ImageField from '../../../../../components/admin/ImageField';
import SortableList from '../../../../../components/admin/SortableList';
import {
  Button,
  DateField,
  IconButton,
  NumberField,
  SelectField,
  TextField,
} from '../../../../../components/ui';
import { TIMELINE_STATUS } from '../../../../../config/enums';
import { toneColor } from '../../../../../components/ui/tones';

import styles from './TimelineRepeater.module.css';

/**
 * The milestones a project is built in, and the percentage they add up to
 * (00_MASTER_CONTEXT.md §6.1 `constructionTimeline` / `constructionProgressPercent`).
 *
 * The five presets are the phases a Bengaluru project is reported in; nothing
 * stops an editor renaming them or adding their own, and the button never
 * duplicates a milestone that is already listed.
 */

/** The phases a project is usually reported in (§4.5 of prompt 20). */
export const STANDARD_MILESTONES = ['Foundation', 'Structure', 'Masonry', 'Finishing', 'Handover'];

/**
 * Completed milestones as a percentage of all of them, rounded.
 *
 * An empty timeline is 0 — not "unknown" and not `null`, because the only
 * caller is a button this component disables when there is nothing to count.
 *
 * @param {Array<{status?: string}>} rows
 * @returns {number} 0–100
 */
export function autoProgressFrom(rows = []) {
  const counted = rows.filter((row) => String(row?.milestone ?? '').trim() !== '');
  if (counted.length === 0) return 0;
  const done = counted.filter((row) => row.status === 'completed').length;
  return Math.round((done / counted.length) * 100);
}

/** The milestones of `STANDARD_MILESTONES` this timeline does not hold yet. */
export function missingStandardMilestones(rows = []) {
  const present = new Set(
    rows
      .map((row) =>
        String(row?.milestone ?? '')
          .trim()
          .toLowerCase()
      )
      .filter(Boolean)
  );
  return STANDARD_MILESTONES.filter((milestone) => !present.has(milestone.toLowerCase()));
}

/**
 * The tab section itself: the rows, the presets and the percentage.
 *
 * @param {object} props
 * @param {Array<object>} props.rows
 * @param {Record<string, string>} props.errors keyed `constructionTimeline.<i>.<field>`
 * @param {number|string|null} props.progress `constructionProgressPercent`
 * @param {(value: number|null) => void} props.onProgressChange
 * @param {boolean} [props.disabled]
 * @param {(patch?: object) => void} props.onAdd
 * @param {(id: string|number, patch: object) => void} props.onUpdate
 * @param {(id: string|number) => void} props.onRemove
 * @param {(from: number, to: number) => void} props.onMove
 * @param {(milestones: string[]) => void} props.onAddPresets
 */
export default function TimelineRepeater({
  rows = [],
  errors = {},
  progress,
  onProgressChange,
  disabled = false,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
  onAddPresets,
}) {
  const auto = autoProgressFrom(rows);
  const countable = rows.filter((row) => String(row.milestone ?? '').trim() !== '').length;
  const missing = missingStandardMilestones(rows);
  const shown =
    progress === null || progress === undefined || progress === '' ? 0 : Number(progress);
  const percent = Number.isFinite(shown) ? Math.min(100, Math.max(0, shown)) : 0;

  return (
    <div className={styles.wrapper}>
      {rows.length === 0 ? (
        <p className={styles.empty}>
          No milestones yet. They become the construction-progress section of the listing — a buyer
          reads them to know what has actually been built.
        </p>
      ) : (
        <SortableList
          label="Construction milestones in order"
          items={rows}
          disabled={disabled}
          getLabel={(row, index) => row.milestone || `Milestone ${index + 1}`}
          onReorder={(_next, { from, to }) => onMove?.(from, to)}
          renderItem={(row, index) => {
            const path = `constructionTimeline.${index}`;
            const status = row.status || 'upcoming';
            const tone = TIMELINE_STATUS.meta[status]?.tone ?? 'neutral';

            return (
              <div className={styles.row}>
                <div className={styles.rowHead}>
                  <span
                    className={styles.dot}
                    style={{ backgroundColor: toneColor(tone) }}
                    aria-hidden="true"
                  />
                  <h5 className={styles.rowTitle}>
                    {row.milestone || `Milestone ${index + 1}`}
                    <span className={styles.rowStatus}>{TIMELINE_STATUS.labelOf(status)}</span>
                  </h5>
                  <IconButton
                    label={`Remove ${row.milestone || `milestone ${index + 1}`}`}
                    size="sm"
                    disabled={disabled}
                    onClick={() => onRemove?.(row.id)}
                  >
                    <Icon icon="mdi:close" width="18" height="18" />
                  </IconButton>
                </div>

                <div className={styles.rowGrid}>
                  <TextField
                    label="Milestone"
                    value={row.milestone ?? ''}
                    error={errors[`${path}.milestone`]}
                    disabled={disabled}
                    maxLength={120}
                    placeholder="e.g. Structure"
                    onChange={(event) => onUpdate?.(row.id, { milestone: event.target.value })}
                  />
                  <SelectField
                    label="Status"
                    options={TIMELINE_STATUS.options}
                    value={status}
                    error={errors[`${path}.status`]}
                    disabled={disabled}
                    onChange={(event) => onUpdate?.(row.id, { status: event.target.value })}
                  />
                  <DateField
                    label="Date"
                    value={row.date ?? ''}
                    error={errors[`${path}.date`]}
                    disabled={disabled}
                    hint="When it was finished, or is expected to be."
                    onChange={(event) => onUpdate?.(row.id, { date: event.target.value })}
                  />
                  <TextField
                    label="Note"
                    value={row.note ?? ''}
                    error={errors[`${path}.note`]}
                    disabled={disabled}
                    maxLength={240}
                    placeholder="Optional — what this stage covered"
                    onChange={(event) => onUpdate?.(row.id, { note: event.target.value })}
                  />
                  <div className={styles.rowWide}>
                    <ImageField
                      label="Site photograph"
                      hint="gallery"
                      value={row.imageUrl ?? ''}
                      error={errors[`${path}.imageUrl`]}
                      disabled={disabled}
                      alt={`${row.milestone || 'Construction'} progress`}
                      onChange={(url) => onUpdate?.(row.id, { imageUrl: url })}
                    />
                  </div>
                </div>
              </div>
            );
          }}
        />
      )}

      <div className={styles.actions}>
        {missing.length > 0 ? (
          <Button
            variant="ghost"
            disabled={disabled}
            onClick={() => onAddPresets?.(missing)}
            icon={<Icon icon="mdi:playlist-plus" width="18" height="18" />}
          >
            Add standard milestones
          </Button>
        ) : null}
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => onAdd?.()}
          icon={<Icon icon="mdi:plus" width="18" height="18" />}
        >
          Add milestone
        </Button>
      </div>

      <div className={styles.progress}>
        <NumberField
          label="Construction progress (%)"
          min={0}
          max={100}
          value={progress ?? ''}
          error={errors.constructionProgressPercent}
          disabled={disabled}
          hint="Shown as a bar on the listing page."
          onChange={(event) =>
            onProgressChange?.(
              event.target.value === '' ? null : Math.trunc(Number(event.target.value))
            )
          }
        />

        <Button
          variant="outline"
          size="sm"
          disabled={disabled || countable === 0}
          onClick={() => onProgressChange?.(auto)}
          icon={<Icon icon="mdi:calculator-variant-outline" width="16" height="16" />}
        >
          Auto from milestones ({auto}%)
        </Button>

        <div className={styles.barRow}>
          <div
            className={styles.bar}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Construction progress"
          >
            <span className={styles.barFill} style={{ width: `${percent}%` }} />
          </div>
          <span className={styles.barValue}>{percent}%</span>
        </div>
      </div>
    </div>
  );
}
