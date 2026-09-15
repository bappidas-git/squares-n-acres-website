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
import { AMENITY_CATEGORIES } from './constants';

const AmenitiesTab = ({ formData, updateField }) => {
  const [customDialog, setCustomDialog] = useState(false);
  const [customAmenity, setCustomAmenity] = useState({ name: '', icon: 'mdi:star-outline', category: 'convenience' });
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const toggleAmenity = (amenity) => {
    const exists = formData.amenities.find((a) => a.name === amenity.name);
    if (exists) {
      updateField('amenities', formData.amenities.filter((a) => a.name !== amenity.name));
    } else {
      updateField('amenities', [...formData.amenities, amenity]);
    }
  };

  const isSelected = (name) => formData.amenities.some((a) => a.name === name);

  const customAmenities = formData.amenities.filter(
    (a) => !Object.values(AMENITY_CATEGORIES).some((cat) => cat.items.some((item) => item.name === a.name))
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
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

      {Object.entries(AMENITY_CATEGORIES).map(([catKey, category]) => (
        <Paper key={catKey} sx={{ p: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Icon icon={category.icon} style={{ fontSize: 20, color: '#C9A86C' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
              {category.label}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {category.items.map((amenity) => {
              const selected = isSelected(amenity.name);
              return (
                <Chip
                  key={amenity.name}
                  icon={<Icon icon={amenity.icon} style={{ fontSize: 16 }} />}
                  label={amenity.name}
                  clickable
                  onClick={() => toggleAmenity({ ...amenity, category: catKey })}
                  sx={{
                    fontWeight: 500,
                    bgcolor: selected ? '#1B2A4A' : '#F3F4F6',
                    color: selected ? '#fff' : '#6B7280',
                    '& .MuiChip-icon': { color: selected ? '#C9A86C' : '#9CA3AF' },
                    '&:hover': {
                      bgcolor: selected ? '#2D4470' : '#E5E7EB',
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
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A', mb: 1 }}>
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
                  bgcolor: '#1B2A4A',
                  color: '#fff',
                  '& .MuiChip-icon': { color: '#C9A86C' },
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
        <DialogTitle sx={{ fontWeight: 600, color: '#1B2A4A' }}>Add Custom Amenity</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
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
              {Object.entries(AMENITY_CATEGORIES).map(([key, cat]) => (
                <MenuItem key={key} value={key}>{cat.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCustomDialog(false)} sx={{ color: '#6B7280' }}>Cancel</Button>
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
