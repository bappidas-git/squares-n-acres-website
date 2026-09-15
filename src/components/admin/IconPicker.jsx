import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Icon } from '@iconify/react';

const ICON_CATEGORIES = {
  'Real Estate': [
    'mdi:home', 'mdi:home-outline', 'mdi:home-city', 'mdi:home-group', 'mdi:home-modern',
    'mdi:home-automation', 'mdi:office-building', 'mdi:domain', 'mdi:city-variant',
    'mdi:apartment', 'mdi:floor-plan', 'mdi:door', 'mdi:window-open', 'mdi:stairs',
    'mdi:elevator', 'mdi:garage', 'mdi:land-plots', 'mdi:pillar', 'mdi:wall',
    'mdi:fence', 'mdi:gate', 'mdi:key-variant', 'mdi:key', 'mdi:lock',
  ],
  'Amenities': [
    'mdi:swim', 'mdi:pool', 'mdi:dumbbell', 'mdi:yoga', 'mdi:spa', 'mdi:spa-outline',
    'mdi:basketball', 'mdi:tennis', 'mdi:badminton', 'mdi:cricket', 'mdi:football',
    'mdi:table-tennis', 'mdi:billiards', 'mdi:golf', 'mdi:soccer', 'mdi:run',
    'mdi:walk', 'mdi:meditation', 'mdi:party-popper', 'mdi:music', 'mdi:movie-open',
    'mdi:movie-open-outline', 'mdi:book-open-variant', 'mdi:grill-outline',
    'mdi:baby-carriage', 'mdi:dog', 'mdi:paw', 'mdi:palm-tree',
  ],
  'Safety & Security': [
    'mdi:shield-check', 'mdi:shield-star', 'mdi:shield-lock', 'mdi:security',
    'mdi:cctv', 'mdi:fire-extinguisher', 'mdi:alarm-light', 'mdi:intercom',
    'mdi:video-outline', 'mdi:bell-ring', 'mdi:eye', 'mdi:shield-account',
  ],
  'Infrastructure': [
    'mdi:lightning-bolt', 'mdi:water-pump', 'mdi:gas-cylinder', 'mdi:ev-station',
    'mdi:wifi', 'mdi:satellite-variant', 'mdi:car-parking', 'mdi:parking',
    'mdi:pipe', 'mdi:solar-panel', 'mdi:battery-charging', 'mdi:power-plug',
    'mdi:water', 'mdi:water-pump', 'mdi:trash-can', 'mdi:recycle',
  ],
  'Nature & Environment': [
    'mdi:tree', 'mdi:flower', 'mdi:leaf', 'mdi:sprout', 'mdi:nature',
    'mdi:pine-tree', 'mdi:forest', 'mdi:grass', 'mdi:weather-sunny',
    'mdi:white-balance-sunny', 'mdi:earth', 'mdi:mountain',
  ],
  'Transport & Location': [
    'mdi:map-marker', 'mdi:map-marker-star', 'mdi:map-marker-radius',
    'mdi:map-marker-outline', 'mdi:map-outline', 'mdi:compass',
    'mdi:car', 'mdi:bus', 'mdi:train', 'mdi:airplane', 'mdi:road-variant',
    'mdi:highway', 'mdi:bridge', 'mdi:subway-variant',
  ],
  'Education & Health': [
    'mdi:school', 'mdi:hospital', 'mdi:medical-bag', 'mdi:stethoscope',
    'mdi:pill', 'mdi:heart-pulse', 'mdi:book-education', 'mdi:library',
    'mdi:bookshelf', 'mdi:human-male-board',
  ],
  'Shopping & Dining': [
    'mdi:shopping', 'mdi:cart', 'mdi:store', 'mdi:food', 'mdi:food-fork-drink',
    'mdi:silverware-fork-knife', 'mdi:coffee', 'mdi:glass-cocktail',
    'mdi:restaurant', 'mdi:storefront',
  ],
  'Documents & Files': [
    'mdi:file-document', 'mdi:file-document-check', 'mdi:file-certificate',
    'mdi:file-pdf-box', 'mdi:file-image', 'mdi:file-chart', 'mdi:clipboard-text',
    'mdi:clipboard-list-outline', 'mdi:book-open-variant', 'mdi:folder',
    'mdi:folder-open', 'mdi:file-document-outline', 'mdi:certificate',
  ],
  'Construction': [
    'mdi:crane', 'mdi:shovel', 'mdi:hammer', 'mdi:wrench', 'mdi:format-paint',
    'mdi:hard-hat', 'mdi:bricks', 'mdi:bulldozer', 'mdi:ruler',
    'mdi:ruler-square', 'mdi:tape-measure', 'mdi:progress-clock',
  ],
  'Finance': [
    'mdi:currency-inr', 'mdi:cash', 'mdi:credit-card', 'mdi:bank',
    'mdi:chart-line', 'mdi:trending-up', 'mdi:calculator', 'mdi:percent',
    'mdi:hand-coin', 'mdi:wallet',
  ],
  'General': [
    'mdi:star', 'mdi:star-outline', 'mdi:star-four-points', 'mdi:heart',
    'mdi:check-circle', 'mdi:check-decagram', 'mdi:information',
    'mdi:calendar', 'mdi:calendar-check', 'mdi:calendar-star',
    'mdi:clock', 'mdi:clock-check', 'mdi:phone', 'mdi:email',
    'mdi:chat', 'mdi:account', 'mdi:account-group', 'mdi:thumb-up',
    'mdi:trophy', 'mdi:crown', 'mdi:diamond', 'mdi:rocket-launch',
    'mdi:target', 'mdi:cog', 'mdi:dots-horizontal', 'mdi:image',
    'mdi:camera', 'mdi:emoticon-happy', 'mdi:emoticon-cool',
  ],
};

const ALL_ICONS = Object.values(ICON_CATEGORIES).flat();

const ICONS_PER_PAGE = 60;

const IconPicker = ({ open, onClose, onSelect, currentIcon = '' }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [customIcon, setCustomIcon] = useState('');
  const [visibleCount, setVisibleCount] = useState(ICONS_PER_PAGE);
  const gridRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setActiveCategory('All');
      setCustomIcon('');
      setVisibleCount(ICONS_PER_PAGE);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  const filteredIcons = useMemo(() => {
    let icons = activeCategory === 'All'
      ? ALL_ICONS
      : ICON_CATEGORIES[activeCategory] || [];

    if (search.trim()) {
      const q = search.toLowerCase();
      icons = ALL_ICONS.filter((icon) => icon.toLowerCase().includes(q));
    }

    return [...new Set(icons)];
  }, [search, activeCategory]);

  const visibleIcons = useMemo(
    () => filteredIcons.slice(0, visibleCount),
    [filteredIcons, visibleCount]
  );

  const handleScroll = useCallback(() => {
    const el = gridRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
      setVisibleCount((prev) => Math.min(prev + ICONS_PER_PAGE, filteredIcons.length));
    }
  }, [filteredIcons.length]);

  const handleSelect = useCallback(
    (iconName) => {
      onSelect(iconName);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleCustomSubmit = useCallback(() => {
    if (customIcon.trim()) {
      handleSelect(customIcon.trim());
    }
  }, [customIcon, handleSelect]);

  const categories = ['All', ...Object.keys(ICON_CATEGORIES)];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, height: '80vh', maxHeight: 700 },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1B2A4A' }}>
            Select Icon
          </Typography>
          <Typography variant="caption" sx={{ color: '#6B7280' }}>
            Choose from library or enter a custom Iconify name
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Icon icon="mdi:close" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Search & Custom Input */}
        <Box sx={{ px: 3, pt: 2, pb: 1 }}>
          <TextField
            inputRef={searchInputRef}
            size="small"
            fullWidth
            placeholder="Search icons... (e.g., home, car, star)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(ICONS_PER_PAGE);
              if (e.target.value) setActiveCategory('All');
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Icon icon="mdi:magnify" style={{ color: '#9CA3AF' }} />
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}>
                    <Icon icon="mdi:close-circle" style={{ fontSize: 18, color: '#9CA3AF' }} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Custom icon input */}
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Or type custom: mdi:icon-name"
              value={customIcon}
              onChange={(e) => setCustomIcon(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCustomSubmit();
                }
              }}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: customIcon && (
                  <InputAdornment position="start">
                    <Icon icon={customIcon} style={{ fontSize: 20, color: '#1B2A4A' }} />
                  </InputAdornment>
                ),
              }}
            />
            <IconButton
              size="small"
              onClick={handleCustomSubmit}
              disabled={!customIcon.trim()}
              sx={{
                bgcolor: customIcon.trim() ? '#1B2A4A' : '#F3F4F6',
                color: customIcon.trim() ? '#fff' : '#9CA3AF',
                '&:hover': { bgcolor: customIcon.trim() ? '#2D4470' : '#E5E7EB' },
              }}
            >
              <Icon icon="mdi:check" />
            </IconButton>
          </Box>
        </Box>

        {/* Category chips */}
        <Box
          sx={{
            px: 3,
            py: 1,
            display: 'flex',
            gap: 0.5,
            flexWrap: 'nowrap',
            overflowX: 'auto',
            borderBottom: '1px solid #F3F4F6',
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#D1D5DB', borderRadius: 2 },
          }}
        >
          {categories.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              size="small"
              clickable
              onClick={() => {
                setActiveCategory(cat);
                setSearch('');
                setVisibleCount(ICONS_PER_PAGE);
              }}
              sx={{
                flexShrink: 0,
                fontWeight: 500,
                fontSize: '0.75rem',
                bgcolor: activeCategory === cat ? '#1B2A4A' : '#F3F4F6',
                color: activeCategory === cat ? '#fff' : '#6B7280',
                '&:hover': {
                  bgcolor: activeCategory === cat ? '#2D4470' : '#E5E7EB',
                },
              }}
            />
          ))}
        </Box>

        {/* Icon grid */}
        <Box
          ref={gridRef}
          onScroll={handleScroll}
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: 3,
            py: 2,
          }}
        >
          {visibleIcons.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Icon icon="mdi:magnify-close" style={{ fontSize: 48, color: '#D1D5DB' }} />
              <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 1 }}>
                No icons found. Try a different search or use the custom input above.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                gap: 1,
              }}
            >
              {visibleIcons.map((iconName) => (
                <Box
                  key={iconName}
                  onClick={() => handleSelect(iconName)}
                  title={iconName}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                    p: 1,
                    borderRadius: 2,
                    cursor: 'pointer',
                    border: currentIcon === iconName ? '2px solid #C9A86C' : '1px solid transparent',
                    bgcolor: currentIcon === iconName ? '#FEF8F0' : 'transparent',
                    transition: 'all 0.15s',
                    '&:hover': {
                      bgcolor: '#F3F4F6',
                      border: '1px solid #E5E7EB',
                    },
                  }}
                >
                  <Icon icon={iconName} style={{ fontSize: 28, color: '#1B2A4A' }} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.6rem',
                      color: '#9CA3AF',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '100%',
                    }}
                  >
                    {iconName.replace('mdi:', '')}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {visibleCount < filteredIcons.length && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <CircularProgress size={24} sx={{ color: '#C9A86C' }} />
            </Box>
          )}
        </Box>

        {/* Footer with count */}
        <Box
          sx={{
            px: 3,
            py: 1,
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
            {filteredIcons.length} icons available
          </Typography>
          {currentIcon && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: '#6B7280' }}>
                Current:
              </Typography>
              <Icon icon={currentIcon} style={{ fontSize: 20, color: '#C9A86C' }} />
              <Typography variant="caption" sx={{ color: '#1B2A4A', fontWeight: 600 }}>
                {currentIcon}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default IconPicker;
