import { useId } from 'react';

import styles from './ListingEngine.module.css';
import { SORT_OPTIONS } from '../../config/enums';

/**
 * The sort order, as a native select.
 *
 * The API owns the ordering (§5.7, D94) — `relevance` is featured first, then
 * the editor's priority, then recency — so this control sends a value and does
 * no sorting of its own.
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(sort: string) => void} props.onChange
 */
export default function SortSelect({ value, onChange }) {
  const id = useId();

  return (
    <div className={styles.sort}>
      <label className={styles.sortLabel} htmlFor={id}>
        Sort
      </label>
      <select
        id={id}
        className={styles.sortSelect}
        value={value ?? 'relevance'}
        onChange={(event) => onChange(event.target.value)}
      >
        {SORT_OPTIONS.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
