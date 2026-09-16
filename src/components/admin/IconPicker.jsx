import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../ui/Button';
import Chip from '../ui/Chip';
import IconButton from '../ui/IconButton';
import Modal from '../ui/Modal';
import { AMENITY_CATEGORIES, NEARBY_CATEGORIES } from '../../config/enums';

import styles from './IconPicker.module.css';

/** What a usable Iconify MDI id looks like (§11 item 23). */
export const ICON_ID_PATTERN = /^mdi:[a-z0-9-]+$/;

/**
 * The curated icon library.
 *
 * Every id was checked against the live Iconify MDI set on 2026-09-16: the
 * three that no longer exist (`mdi:apartment`, `mdi:intercom`,
 * `mdi:car-parking`) and the three that were only aliases (`mdi:mountain`,
 * `mdi:restaurant`, `mdi:bricks`) are gone, replaced by canonical ids that
 * render — a blank tile is a broken promise, not a style (ADD-23).
 */
export const ICON_CATEGORIES = {
  'Real Estate': [
    'mdi:home',
    'mdi:home-outline',
    'mdi:home-city',
    'mdi:home-city-outline',
    'mdi:home-group',
    'mdi:home-modern',
    'mdi:home-automation',
    'mdi:office-building',
    'mdi:office-building-outline',
    'mdi:domain',
    'mdi:city-variant',
    'mdi:floor-plan',
    'mdi:door',
    'mdi:window-open',
    'mdi:stairs',
    'mdi:elevator',
    'mdi:garage',
    'mdi:land-plots',
    'mdi:pillar',
    'mdi:wall',
    'mdi:fence',
    'mdi:gate',
    'mdi:key-variant',
    'mdi:key',
    'mdi:lock',
  ],
  Amenities: [
    'mdi:swim',
    'mdi:pool',
    'mdi:dumbbell',
    'mdi:yoga',
    'mdi:spa',
    'mdi:spa-outline',
    'mdi:basketball',
    'mdi:tennis',
    'mdi:badminton',
    'mdi:racquetball',
    'mdi:cricket',
    'mdi:football',
    'mdi:table-tennis',
    'mdi:billiards',
    'mdi:golf',
    'mdi:soccer',
    'mdi:run',
    'mdi:walk',
    'mdi:meditation',
    'mdi:party-popper',
    'mdi:music',
    'mdi:movie-open',
    'mdi:movie-open-outline',
    'mdi:book-open-variant',
    'mdi:grill-outline',
    'mdi:baby-carriage',
    'mdi:teddy-bear',
    'mdi:dog',
    'mdi:paw',
    'mdi:palm-tree',
    'mdi:sofa-outline',
  ],
  'Safety & Security': [
    'mdi:shield-check',
    'mdi:shield-check-outline',
    'mdi:shield-star',
    'mdi:shield-lock',
    'mdi:security',
    'mdi:cctv',
    'mdi:fire-extinguisher',
    'mdi:alarm-light',
    'mdi:doorbell-video',
    'mdi:video-outline',
    'mdi:bell-ring',
    'mdi:eye',
    'mdi:shield-account',
  ],
  Infrastructure: [
    'mdi:lightning-bolt',
    'mdi:flash-outline',
    'mdi:water-pump',
    'mdi:gas-cylinder',
    'mdi:ev-station',
    'mdi:wifi',
    'mdi:satellite-variant',
    'mdi:parking',
    'mdi:car-multiple',
    'mdi:pipe',
    'mdi:solar-panel',
    'mdi:battery-charging',
    'mdi:power-plug',
    'mdi:water',
    'mdi:water-outline',
    'mdi:trash-can',
    'mdi:recycle',
  ],
  'Nature & Environment': [
    'mdi:tree',
    'mdi:tree-outline',
    'mdi:flower',
    'mdi:leaf',
    'mdi:sprout',
    'mdi:nature',
    'mdi:pine-tree',
    'mdi:forest',
    'mdi:grass',
    'mdi:weather-sunny',
    'mdi:white-balance-sunny',
    'mdi:earth',
    'mdi:image-filter-hdr',
  ],
  'Transport & Location': [
    'mdi:map-marker',
    'mdi:map-marker-star',
    'mdi:map-marker-radius',
    'mdi:map-marker-outline',
    'mdi:map-outline',
    'mdi:compass',
    'mdi:car',
    'mdi:bus',
    'mdi:train',
    'mdi:train-variant',
    'mdi:airplane',
    'mdi:road-variant',
    'mdi:highway',
    'mdi:bridge',
    'mdi:subway-variant',
  ],
  'Education & Health': [
    'mdi:school',
    'mdi:school-outline',
    'mdi:hospital',
    'mdi:hospital-box-outline',
    'mdi:medical-bag',
    'mdi:stethoscope',
    'mdi:pill',
    'mdi:heart-pulse',
    'mdi:book-education',
    'mdi:library',
    'mdi:bookshelf',
    'mdi:human-male-board',
  ],
  'Shopping & Dining': [
    'mdi:shopping',
    'mdi:shopping-outline',
    'mdi:cart',
    'mdi:cart-outline',
    'mdi:store',
    'mdi:store-outline',
    'mdi:food',
    'mdi:food-fork-drink',
    'mdi:silverware-fork-knife',
    'mdi:silverware',
    'mdi:coffee',
    'mdi:glass-cocktail',
    'mdi:storefront',
  ],
  'Documents & Files': [
    'mdi:file-document',
    'mdi:file-document-check',
    'mdi:file-document-outline',
    'mdi:file-certificate',
    'mdi:file-pdf-box',
    'mdi:file-image',
    'mdi:file-chart',
    'mdi:clipboard-text',
    'mdi:clipboard-list-outline',
    'mdi:folder',
    'mdi:folder-open',
    'mdi:certificate',
  ],
  Construction: [
    'mdi:crane',
    'mdi:shovel',
    'mdi:hammer',
    'mdi:wrench',
    'mdi:screwdriver',
    'mdi:format-paint',
    'mdi:hard-hat',
    'mdi:account-hard-hat',
    'mdi:texture-box',
    'mdi:bulldozer',
    'mdi:excavator',
    'mdi:ruler',
    'mdi:ruler-square',
    'mdi:tape-measure',
    'mdi:progress-clock',
  ],
  Finance: [
    'mdi:currency-inr',
    'mdi:cash',
    'mdi:credit-card',
    'mdi:bank',
    'mdi:bank-outline',
    'mdi:chart-line',
    'mdi:trending-up',
    'mdi:calculator',
    'mdi:percent',
    'mdi:hand-coin',
    'mdi:wallet',
  ],
  General: [
    'mdi:star',
    'mdi:star-outline',
    'mdi:star-four-points',
    'mdi:heart',
    'mdi:check-circle',
    'mdi:check-decagram',
    'mdi:information',
    'mdi:calendar',
    'mdi:calendar-check',
    'mdi:calendar-star',
    'mdi:clock',
    'mdi:clock-check',
    'mdi:phone',
    'mdi:email',
    'mdi:chat',
    'mdi:account',
    'mdi:account-group',
    'mdi:thumb-up',
    'mdi:trophy',
    'mdi:crown',
    'mdi:diamond',
    'mdi:rocket-launch',
    'mdi:target',
    'mdi:cog',
    'mdi:dots-horizontal',
    'mdi:image',
    'mdi:camera',
    'mdi:emoticon-happy',
    'mdi:emoticon-cool',
  ],
  // Two quick categories straight off the enums, so the icon an admin picks for
  // an amenity or a nearby place is the icon the public site already draws for
  // that category (§6.17).
  'Amenity categories': AMENITY_CATEGORIES.entries.map((entry) => entry.icon),
  'Nearby places': NEARBY_CATEGORIES.entries.map((entry) => entry.icon),
};

export const ALL_ICONS = [...new Set(Object.values(ICON_CATEGORIES).flat())];

const ALL = 'All';
const CATEGORIES = [ALL, ...Object.keys(ICON_CATEGORIES)];
const ICONS_PER_PAGE = 60;

/**
 * Picks an Iconify MDI id.
 *
 * Every tile is a real `<button>` with a name, a pressed state and a place in a
 * roving tab order, so the grid is as usable from the keyboard as it is with a
 * mouse (§8.3). Search narrows **within the active category** — searching
 * "home" inside Finance used to silently jump back to everything (ADD-23).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(icon: string) => void} props.onSelect
 * @param {string} [props.currentIcon]
 */
export default function IconPicker({ open, onClose, onSelect, currentIcon = '' }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(ALL);
  const [custom, setCustom] = useState('');
  const [visibleCount, setVisibleCount] = useState(ICONS_PER_PAGE);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const gridRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setCategory(ALL);
    setCustom('');
    setVisibleCount(ICONS_PER_PAGE);
    setFocusedIndex(0);
  }, [open]);

  const icons = useMemo(() => {
    const pool = category === ALL ? ALL_ICONS : (ICON_CATEGORIES[category] ?? []);
    const query = search.trim().toLowerCase();
    const found = query ? pool.filter((icon) => icon.toLowerCase().includes(query)) : pool;
    return [...new Set(found)];
  }, [category, search]);

  const visible = useMemo(() => icons.slice(0, visibleCount), [icons, visibleCount]);

  const choose = useCallback(
    (icon) => {
      onSelect?.(icon);
      onClose?.();
    },
    [onSelect, onClose]
  );

  /** The number of tiles per row, read from the grid the browser laid out. */
  const columnCount = () => {
    const grid = gridRef.current;
    if (!grid || typeof window === 'undefined') return 1;
    const template = window.getComputedStyle(grid).gridTemplateColumns;
    return Math.max(template.split(' ').filter(Boolean).length, 1);
  };

  const moveFocus = (index) => {
    const next = Math.max(0, Math.min(index, visible.length - 1));
    setFocusedIndex(next);
    gridRef.current?.querySelectorAll('[data-icon-tile]')[next]?.focus();
  };

  const onGridKeyDown = (event, index) => {
    const columns = columnCount();
    const moves = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      ArrowDown: index + columns,
      ArrowUp: index - columns,
      Home: 0,
      End: visible.length - 1,
    };

    if (!(event.key in moves)) return;
    event.preventDefault();
    moveFocus(moves[event.key]);
  };

  const onScroll = () => {
    const el = gridRef.current?.parentElement;
    if (!el) return;
    if (el.scrollTop + el.clientHeight < el.scrollHeight - 50) return;
    setVisibleCount((current) => Math.min(current + ICONS_PER_PAGE, icons.length));
  };

  const customIsValid = ICON_ID_PATTERN.test(custom.trim());

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      mobile="fullscreen"
      title="Select icon"
      description="Choose one from the library, or type any Iconify MDI id."
      footer={
        <div className={styles.footer}>
          <span className={styles.count}>
            {icons.length} {icons.length === 1 ? 'icon' : 'icons'}
          </span>
          {currentIcon ? (
            <span className={styles.current}>
              Current:
              <Icon icon={currentIcon} width="20" height="20" aria-hidden="true" />
              <code>{currentIcon}</code>
            </span>
          ) : null}
        </div>
      }
    >
      <div className={styles.controls}>
        <label className={styles.srOnly} htmlFor="icon-picker-search">
          Search icons
        </label>
        <span className={styles.searchBox}>
          <Icon icon="mdi:magnify" width="18" height="18" aria-hidden="true" />
          <input
            id="icon-picker-search"
            ref={searchRef}
            type="search"
            className={styles.input}
            placeholder="Search icons — home, car, star…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(ICONS_PER_PAGE);
              setFocusedIndex(0);
            }}
          />
          {search ? (
            <IconButton label="Clear search" size="sm" onClick={() => setSearch('')}>
              <Icon icon="mdi:close" width="16" height="16" />
            </IconButton>
          ) : null}
        </span>

        <div className={styles.customRow}>
          <label className={styles.srOnly} htmlFor="icon-picker-custom">
            Custom Iconify id
          </label>
          <span className={styles.customBox}>
            <span className={styles.customPreview} aria-hidden="true">
              {customIsValid ? <Icon icon={custom.trim()} width="20" height="20" /> : null}
            </span>
            <input
              id="icon-picker-custom"
              type="text"
              className={styles.input}
              placeholder="mdi:icon-name"
              value={custom}
              aria-invalid={custom && !customIsValid ? true : undefined}
              aria-describedby="icon-picker-custom-hint"
              onChange={(event) => setCustom(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                if (customIsValid) choose(custom.trim());
              }}
            />
          </span>
          <Button size="sm" disabled={!customIsValid} onClick={() => choose(custom.trim())}>
            Use
          </Button>
        </div>
        <p className={styles.hint} id="icon-picker-custom-hint">
          {custom && !customIsValid
            ? 'An id looks like mdi:home-city-outline — lowercase letters, numbers and hyphens.'
            : 'Any id from the Iconify MDI set works, e.g. mdi:home-city-outline.'}
        </p>

        <div className={styles.categories}>
          {CATEGORIES.map((entry) => (
            <Chip
              key={entry}
              tone={entry === category ? 'primary' : 'neutral'}
              selected={entry === category}
              onClick={() => {
                setCategory(entry);
                setVisibleCount(ICONS_PER_PAGE);
                setFocusedIndex(0);
              }}
            >
              {entry}
            </Chip>
          ))}
        </div>
      </div>

      <div className={styles.gridScroller} onScroll={onScroll}>
        {visible.length === 0 ? (
          <p className={styles.noResults}>
            No icon in {category === ALL ? 'the library' : category} matches “{search.trim()}”. Try
            another category, or type the id above.
          </p>
        ) : (
          <div className={styles.grid} ref={gridRef} role="group" aria-label="Icons">
            {visible.map((icon, index) => (
              <button
                key={icon}
                type="button"
                data-icon-tile
                className={[styles.tile, icon === currentIcon ? styles.tileActive : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-label={icon}
                aria-pressed={icon === currentIcon}
                tabIndex={index === focusedIndex ? 0 : -1}
                onFocus={() => setFocusedIndex(index)}
                onKeyDown={(event) => onGridKeyDown(event, index)}
                onClick={() => choose(icon)}
              >
                <Icon icon={icon} width="26" height="26" aria-hidden="true" />
                <span className={styles.tileLabel}>{icon.replace('mdi:', '')}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
