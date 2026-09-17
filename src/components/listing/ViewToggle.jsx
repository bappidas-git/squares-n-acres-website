import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

import storage from '../../utils/storage';
import styles from './ListingEngine.module.css';

/** Where the chosen layout is remembered (§4.2). */
export const VIEW_KEY = 'sna_listing_view';

export const VIEWS = ['grid', 'list'];

const read = () => {
  const stored = storage.getItem(VIEW_KEY, 'grid');
  return VIEWS.includes(stored) ? stored : 'grid';
};

/**
 * Grid or list, remembered between visits.
 *
 * The first render is always `grid`, and the stored preference is applied after
 * mount: a prerendered page (prompt 41) must not bake one visitor's layout into
 * the HTML everybody else is served.
 *
 * @returns {[('grid'|'list'), (view: string) => void]}
 */
export function useListingView() {
  const [view, setView] = useState('grid');

  useEffect(() => {
    setView(read());
  }, []);

  const choose = useCallback((next) => {
    if (!VIEWS.includes(next)) return;
    setView(next);
    storage.setItem(VIEW_KEY, next);
  }, []);

  return [view, choose];
}

const OPTIONS = [
  { value: 'grid', label: 'Grid view', icon: 'mdi:view-grid-outline' },
  { value: 'list', label: 'List view', icon: 'mdi:view-list-outline' },
];

/**
 * @param {object} props
 * @param {'grid'|'list'} props.value
 * @param {(view: string) => void} props.onChange
 */
export default function ViewToggle({ value, onChange }) {
  return (
    <div className={styles.viewToggle} role="group" aria-label="Result layout">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={[styles.viewButton, value === option.value ? styles.viewButtonOn : '']
            .filter(Boolean)
            .join(' ')}
          aria-pressed={value === option.value}
          aria-label={option.label}
          onClick={() => onChange(option.value)}
        >
          <Icon icon={option.icon} width="18" height="18" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
