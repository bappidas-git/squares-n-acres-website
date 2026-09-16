import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Icon } from '@iconify/react';
import IconPicker from '../../../components/admin/IconPicker';
import { AMENITY_CATEGORIES } from '../../../config/enums';
import { useAmenitiesGrouped } from '../../../hooks/useMasterData';

/**
 * The amenities tab of the property form.
 *
 * The tick list is master data now (§6.4): whatever the admin has made active,
 * grouped by category, in its order — not the five hardcoded groups this tab
 * used to carry. What it stores is unchanged until prompt 20 moves the form to
 * `amenityIds`.
 */
const AmenitiesTab = ({ formData, updateField }) => {
  const groups = useAmenitiesGrouped();
  const [customDialog, setCustomDialog] = useState(false);
  const [customAmenity, setCustomAmenity] = useState({
    name: '',
    icon: 'mdi:star-outline',
    category: 'convenience',
  });
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const toggleAmenity = (amenity) => {
    const exists = formData.amenities.find((a) => a.name === amenity.name);
    if (exists) {
      updateField(
        'amenities',
        formData.amenities.filter((a) => a.name !== amenity.name)
      );
    } else {
      updateField('amenities', [...formData.amenities, amenity]);
    }
  };

  const isSelected = (name) => formData.amenities.some((a) => a.name === name);

  // Anything ticked that the master list no longer offers — an amenity typed
  // into the dialog below, or one an editor has since deleted.
  const known = new Set(groups.flatMap((group) => group.items.map((item) => item.name)));
  const customAmenities = formData.amenities.filter((amenity) => !known.has(amenity.name));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>
          Amenities ({formData.amenities.length} selected)
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setCustomDialog(true)}
          startIcon={<Icon icon="mdi:plus" />}
          sx={{ borderRadius: 2 }}
        >
          Custom Amenity
        </Button>
      </Box>

      {groups.map((group) => (
        <Paper key={group.category} sx={{ p: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Icon icon={group.icon} style={{ fontSize: 20, color: 'var(--color-primary-dark)' }} />
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, color: 'var(--color-charcoal)' }}
            >
              {group.label}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {group.items.map((amenity) => {
              const selected = isSelected(amenity.name);
              return (
                <Chip
                  key={amenity.id}
                  icon={<Icon icon={amenity.icon} style={{ fontSize: 16 }} />}
                  label={amenity.name}
                  clickable
                  onClick={() =>
                    toggleAmenity({
                      icon: amenity.icon,
                      name: amenity.name,
                      category: group.category,
                    })
                  }
                  sx={{
                    fontWeight: 500,
                    bgcolor: selected ? 'var(--color-charcoal)' : 'var(--color-surface)',
                    color: selected ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
                    '& .MuiChip-icon': {
                      color: selected ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
                    },
                    '&:hover': {
                      bgcolor: selected ? 'var(--color-charcoal)' : 'var(--color-surface-2)',
                    },
                  }}
                />
              );
            })}
          </Box>
        </Paper>
      ))}

      {customAmenities.length > 0 && (
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, color: 'var(--color-charcoal)', mb: 1 }}
          >
            Custom Amenities
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {customAmenities.map((amenity) => (
              <Chip
                key={amenity.name}
                icon={<Icon icon={amenity.icon} style={{ fontSize: 16 }} />}
                label={amenity.name}
                onDelete={() => toggleAmenity(amenity)}
                sx={{
                  fontWeight: 500,
                  bgcolor: 'var(--color-charcoal)',
                  color: 'var(--color-text-inverse)',
                  '& .MuiChip-icon': { color: 'var(--color-primary-dark)' },
                  '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.6)' },
                }}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Custom Amenity Dialog */}
      <Dialog
        open={customDialog}
        onClose={() => setCustomDialog(false)}
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>
          Add Custom Amenity
        </DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}
        >
          <TextField
            label="Amenity Name"
            value={customAmenity.name}
            onChange={(e) => setCustomAmenity((prev) => ({ ...prev, name: e.target.value }))}
            fullWidth
          />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              label="Icon"
              value={customAmenity.icon}
              onChange={(e) => setCustomAmenity((prev) => ({ ...prev, icon: e.target.value }))}
              sx={{ flex: 1 }}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={() => setIconPickerOpen(true)}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              <Icon icon="mdi:image-search" style={{ fontSize: 20 }} />
            </Button>
          </Box>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={customAmenity.category}
              label="Category"
              onChange={(e) => setCustomAmenity((prev) => ({ ...prev, category: e.target.value }))}
            >
              {AMENITY_CATEGORIES.options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCustomDialog(false)} sx={{ color: 'var(--color-text-muted)' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!customAmenity.name.trim()}
            onClick={() => {
              if (customAmenity.name.trim()) {
                toggleAmenity({
                  icon: customAmenity.icon,
                  name: customAmenity.name.trim(),
                  category: customAmenity.category,
                });
                setCustomAmenity({ name: '', icon: 'mdi:star-outline', category: 'convenience' });
                setCustomDialog(false);
              }
            }}
            sx={{ borderRadius: 2 }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <IconPicker
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSelect={(icon) => setCustomAmenity((prev) => ({ ...prev, icon }))}
        currentIcon={customAmenity.icon}
      />
    </Box>
  );
};

export default AmenitiesTab;
