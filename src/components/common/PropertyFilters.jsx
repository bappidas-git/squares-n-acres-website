import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Autocomplete,
  TextField,
  SwipeableDrawer,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import styles from './PropertyFilters.module.css';

const BHK_OPTIONS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '4.5 BHK', '5+ BHK'];

const PRICE_RANGES = [
  { label: 'Under ₹50L', min: 0, max: 5000000 },
  { label: '₹50L - 1Cr', min: 5000000, max: 10000000 },
  { label: '₹1Cr - 2Cr', min: 10000000, max: 20000000 },
  { label: '₹2Cr - 5Cr', min: 20000000, max: 50000000 },
  { label: '₹5Cr+', min: 50000000, max: Infinity },
];

const PROPERTY_TYPES = [
  { label: 'Apartment', value: 'apartment' },
  { label: 'Villa', value: 'villa' },
];

const POSSESSION_STATUSES = [
  { label: 'Ready to Move', value: 'ready-to-move' },
  { label: 'Under Construction', value: 'under-construction' },
  { label: 'Pre-Launch', value: 'pre-launch' },
];

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Possession Date', value: 'possession' },
];

const selectSx = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.85rem',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--color-border)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--color-primary)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--color-secondary)',
  },
};

const PropertyFilters = ({
  properties,
  totalCount,
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  preFilters = {},
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchParams, setSearchParams] = useSearchParams();
  const [panelOpen, setPanelOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Local filter state for mobile sheet (apply on submit)
  const [localFilters, setLocalFilters] = useState(filters);

  // Extract unique locations from properties for autocomplete
  const locationOptions = useMemo(() => {
    if (!properties || !properties.length) return [];
    const areas = new Set();
    properties.forEach((p) => {
      const area = p.location?.area || p.location_area;
      if (area) areas.add(area);
    });
    return Array.from(areas).sort();
  }, [properties]);

  // Extract unique developers from properties
  const developerOptions = useMemo(() => {
    if (!properties || !properties.length) return [];
    const devs = new Set();
    properties.forEach((p) => {
      if (p.developer) devs.add(p.developer);
    });
    return Array.from(devs).sort();
  }, [properties]);

  const handleFilterChange = useCallback(
    (key, value) => {
      const updated = { ...filters, [key]: value };
      onFiltersChange(updated);
      // Update URL params
      const params = new URLSearchParams(searchParams);
      if (value && (Array.isArray(value) ? value.length > 0 : value)) {
        params.set(key, Array.isArray(value) ? value.join(',') : value);
      } else {
        params.delete(key);
      }
      setSearchParams(params, { replace: true });
    },
    [filters, onFiltersChange, searchParams, setSearchParams]
  );

  const handleLocalFilterChange = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    // Update URL params
    const params = new URLSearchParams(searchParams);
    Object.entries(localFilters).forEach(([key, value]) => {
      // Skip pre-filters from URL
      if (preFilters[key]) return;
      if (value && (Array.isArray(value) ? value.length > 0 : value)) {
        params.set(key, Array.isArray(value) ? value.join(',') : value);
      } else {
        params.delete(key);
      }
    });
    setSearchParams(params, { replace: true });
    setPanelOpen(false);
    setMobileSheetOpen(false);
  };

  const clearFilters = () => {
    const cleared = {
      bhk: [],
      priceRange: '',
      locations: [],
      propertyType: '',
      status: '',
      developer: '',
      ...preFilters,
    };
    onFiltersChange(cleared);
    setLocalFilters(cleared);
    const params = new URLSearchParams();
    setSearchParams(params, { replace: true });
  };

  const handleSortChange = (e) => {
    onSortChange(e.target.value);
    const params = new URLSearchParams(searchParams);
    if (e.target.value) {
      params.set('sort', e.target.value);
    } else {
      params.delete('sort');
    }
    setSearchParams(params, { replace: true });
  };

  const removeChip = (key, value) => {
    if (Array.isArray(filters[key])) {
      handleFilterChange(
        key,
        filters[key].filter((v) => v !== value)
      );
    } else {
      handleFilterChange(key, '');
    }
  };

  // Build chip list from active filters (excluding pre-filters)
  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.bhk?.length && !preFilters.bhk) {
      filters.bhk.forEach((b) => chips.push({ key: 'bhk', value: b, label: b }));
    }
    if (filters.priceRange && !preFilters.priceRange) {
      const range = PRICE_RANGES.find(
        (r) => `${r.min}-${r.max}` === filters.priceRange
      );
      chips.push({
        key: 'priceRange',
        value: filters.priceRange,
        label: range?.label || filters.priceRange,
      });
    }
    if (filters.locations?.length && !preFilters.locations) {
      filters.locations.forEach((l) =>
        chips.push({ key: 'locations', value: l, label: l })
      );
    }
    if (filters.propertyType && !preFilters.propertyType) {
      const pt = PROPERTY_TYPES.find((t) => t.value === filters.propertyType);
      chips.push({
        key: 'propertyType',
        value: filters.propertyType,
        label: pt?.label || filters.propertyType,
      });
    }
    if (filters.status && !preFilters.status) {
      const st = POSSESSION_STATUSES.find((s) => s.value === filters.status);
      chips.push({
        key: 'status',
        value: filters.status,
        label: st?.label || filters.status,
      });
    }
    if (filters.developer && !preFilters.developer) {
      chips.push({
        key: 'developer',
        value: filters.developer,
        label: filters.developer,
      });
    }
    return chips;
  }, [filters, preFilters]);

  const togglePanel = () => {
    if (isMobile) {
      setLocalFilters(filters);
      setMobileSheetOpen(true);
    } else {
      setPanelOpen((prev) => !prev);
    }
  };

  // Render filter fields (shared between desktop panel and mobile sheet)
  const renderFilterFields = (currentFilters, onChange, isMobileView = false) => {
    const fieldClass = isMobileView ? styles.mobileField : styles.filterField;

    return (
      <>
        <div className={isMobileView ? undefined : styles.filterGrid}>
          {/* BHK */}
          <div className={fieldClass}>
            <label>BHK</label>
            <Select
              multiple
              value={currentFilters.bhk || []}
              onChange={(e) => onChange('bhk', e.target.value)}
              input={<OutlinedInput size="small" />}
              renderValue={(selected) => selected.join(', ')}
              fullWidth
              size="small"
              sx={selectSx}
              displayEmpty
            >
              {BHK_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  <Checkbox
                    checked={(currentFilters.bhk || []).includes(opt)}
                    size="small"
                  />
                  <ListItemText primary={opt} />
                </MenuItem>
              ))}
            </Select>
          </div>

          {/* Price Range */}
          <div className={fieldClass}>
            <label>Price Range</label>
            <Select
              value={currentFilters.priceRange || ''}
              onChange={(e) => onChange('priceRange', e.target.value)}
              fullWidth
              size="small"
              displayEmpty
              sx={selectSx}
            >
              <MenuItem value="">All Prices</MenuItem>
              {PRICE_RANGES.map((range) => (
                <MenuItem key={range.label} value={`${range.min}-${range.max}`}>
                  {range.label}
                </MenuItem>
              ))}
            </Select>
          </div>

          {/* Location */}
          <div className={isMobileView ? fieldClass : styles.filterFieldFull}>
            <label>Location (Select up to 3)</label>
            <Autocomplete
              multiple
              options={locationOptions}
              value={currentFilters.locations || []}
              onChange={(_, newValue) => {
                if (newValue.length <= 3) {
                  onChange('locations', newValue);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search locations..."
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.85rem',
                    },
                  }}
                />
              )}
              size="small"
              limitTags={2}
            />
          </div>
        </div>

        {/* More Filters */}
        {isMobileView ? (
          <>
            {/* Property Type */}
            <div className={fieldClass}>
              <label>Property Type</label>
              <Select
                value={currentFilters.propertyType || ''}
                onChange={(e) => onChange('propertyType', e.target.value)}
                fullWidth
                size="small"
                displayEmpty
                sx={selectSx}
              >
                <MenuItem value="">All Types</MenuItem>
                {PROPERTY_TYPES.map((pt) => (
                  <MenuItem key={pt.value} value={pt.value}>
                    {pt.label}
                  </MenuItem>
                ))}
              </Select>
            </div>

            {/* Possession Status */}
            <div className={fieldClass}>
              <label>Possession Status</label>
              <Select
                value={currentFilters.status || ''}
                onChange={(e) => onChange('status', e.target.value)}
                fullWidth
                size="small"
                displayEmpty
                sx={selectSx}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {POSSESSION_STATUSES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </div>

            {/* Developer */}
            <div className={fieldClass}>
              <label>Developer</label>
              <Autocomplete
                options={developerOptions}
                value={currentFilters.developer || ''}
                onChange={(_, newValue) => onChange('developer', newValue || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search developers..."
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.85rem',
                      },
                    }}
                  />
                )}
                size="small"
                freeSolo
              />
            </div>
          </>
        ) : (
          <>
            <button
              className={styles.moreFiltersBtn}
              onClick={() => setMoreOpen((prev) => !prev)}
              type="button"
            >
              More Filters
              <Icon
                icon="mdi:chevron-down"
                className={`${styles.moreFiltersIcon} ${moreOpen ? styles.moreFiltersIconOpen : ''}`}
              />
            </button>

            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className={styles.moreFiltersGrid}>
                    {/* Property Type */}
                    <div className={styles.filterField}>
                      <label>Property Type</label>
                      <Select
                        value={currentFilters.propertyType || ''}
                        onChange={(e) => onChange('propertyType', e.target.value)}
                        fullWidth
                        size="small"
                        displayEmpty
                        sx={selectSx}
                      >
                        <MenuItem value="">All Types</MenuItem>
                        {PROPERTY_TYPES.map((pt) => (
                          <MenuItem key={pt.value} value={pt.value}>
                            {pt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </div>

                    {/* Possession Status */}
                    <div className={styles.filterField}>
                      <label>Possession Status</label>
                      <Select
                        value={currentFilters.status || ''}
                        onChange={(e) => onChange('status', e.target.value)}
                        fullWidth
                        size="small"
                        displayEmpty
                        sx={selectSx}
                      >
                        <MenuItem value="">All Statuses</MenuItem>
                        {POSSESSION_STATUSES.map((s) => (
                          <MenuItem key={s.value} value={s.value}>
                            {s.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </div>

                    {/* Developer */}
                    <div className={styles.filterField}>
                      <label>Developer</label>
                      <Autocomplete
                        options={developerOptions}
                        value={currentFilters.developer || ''}
                        onChange={(_, newValue) =>
                          onChange('developer', newValue || '')
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Search developers..."
                            size="small"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                fontFamily: 'var(--font-body)',
                                fontSize: '0.85rem',
                              },
                            }}
                          />
                        )}
                        size="small"
                        freeSolo
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </>
    );
  };

  return (
    <>
      {/* Top Row: Filters button + Sort + Count Badge */}
      <div className={styles.filterRow}>
        <button
          className={`${styles.filterToggle} ${panelOpen || mobileSheetOpen ? styles.filterToggleActive : ''}`}
          onClick={togglePanel}
          type="button"
        >
          <Icon icon="mdi:filter-variant" className={styles.filterToggleIcon} />
          Filters
        </button>

        <div className={styles.rightControls}>
          <div className={styles.sortWrapper}>
            <Select
              value={sortBy}
              onChange={handleSortChange}
              fullWidth
              size="small"
              displayEmpty
              sx={{
                ...selectSx,
                '& .MuiSelect-select': {
                  fontSize: '0.85rem',
                },
              }}
            >
              <MenuItem value="">Sort By</MenuItem>
              {SORT_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </div>

          <div className={styles.countBadge}>
            <strong>{totalCount}</strong> <span>Properties</span>
          </div>
        </div>
      </div>

      {/* Applied Chips */}
      {activeChips.length > 0 && (
        <div className={styles.chipRow}>
          {activeChips.map((chip, idx) => (
            <div key={`${chip.key}-${chip.value}-${idx}`} className={styles.chip}>
              {chip.label}
              <button
                className={styles.chipRemove}
                onClick={() => removeChip(chip.key, chip.value)}
                aria-label={`Remove ${chip.label}`}
                type="button"
              >
                <Icon icon="mdi:close" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Desktop Filter Panel */}
      {!isMobile && (
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              className={styles.filterPanel}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div className={styles.filterPanelInner}>
                {renderFilterFields(filters, handleFilterChange, false)}

                <div className={styles.filterActions}>
                  <button
                    className={styles.applyBtn}
                    onClick={() => setPanelOpen(false)}
                    type="button"
                  >
                    Apply Filters
                  </button>
                  <button
                    className={styles.clearBtn}
                    onClick={clearFilters}
                    type="button"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Mobile Bottom Sheet */}
      {isMobile && (
        <SwipeableDrawer
          anchor="bottom"
          open={mobileSheetOpen}
          onClose={() => setMobileSheetOpen(false)}
          onOpen={() => setMobileSheetOpen(true)}
          disableSwipeToOpen
          PaperProps={{
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '90vh',
            },
          }}
        >
          <div className={styles.mobileSheetHeader}>
            <span className={styles.mobileSheetTitle}>Filters</span>
            <button
              className={styles.mobileCloseBtn}
              onClick={() => setMobileSheetOpen(false)}
              type="button"
            >
              <Icon icon="mdi:close" />
            </button>
          </div>

          <div className={styles.mobileSheetContent}>
            {renderFilterFields(localFilters, handleLocalFilterChange, true)}

            <button
              className={styles.clearBtn}
              onClick={() => {
                const cleared = {
                  bhk: [],
                  priceRange: '',
                  locations: [],
                  propertyType: '',
                  status: '',
                  developer: '',
                  ...preFilters,
                };
                setLocalFilters(cleared);
              }}
              type="button"
              style={{ marginTop: 16 }}
            >
              Clear All Filters
            </button>
          </div>

          <div className={styles.mobileApplyBtn}>
            <button
              className={styles.mobileApplyBtnInner}
              onClick={applyFilters}
              type="button"
            >
              Apply Filters
            </button>
          </div>
        </SwipeableDrawer>
      )}
    </>
  );
};

export default PropertyFilters;
