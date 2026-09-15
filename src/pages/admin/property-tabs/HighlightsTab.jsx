import React, { useState } from 'react';
import { Box, Typography, TextField, Button, IconButton, Paper } from '@mui/material';
import { Icon } from '@iconify/react';
import IconPicker from '../../../components/admin/IconPicker';

const HighlightsTab = ({ formData, updateListItem, addListItem, removeListItem }) => {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconPickerIndex, setIconPickerIndex] = useState(null);

  const openIconPicker = (index) => {
    setIconPickerIndex(index);
    setIconPickerOpen(true);
  };

  const handleIconSelect = (iconName) => {
    if (iconPickerIndex !== null) {
      const item = formData.specialities[iconPickerIndex];
      updateListItem('specialities', iconPickerIndex, { ...item, icon: iconName });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
        Property Highlights / Specialities
      </Typography>
      <Typography variant="caption" sx={{ color: '#9CA3AF', mt: -1 }}>
        Key features shown as highlight cards with icons. e.g., RERA Approved, Eco-Friendly, Smart Home, etc.
      </Typography>

      {formData.specialities.map((item, index) => (
        <Paper key={index} sx={{ p: 2, borderRadius: 2, border: '1px solid #E5E7EB' }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Icon selector */}
            <Box
              onClick={() => openIconPicker(index)}
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                border: '1px dashed #D1D5DB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                bgcolor: item.icon ? '#F0F7FF' : '#F9FAFB',
                flexShrink: 0,
                '&:hover': { borderColor: '#C9A86C', bgcolor: '#FEF8F0' },
              }}
            >
              {item.icon ? (
                <Icon icon={item.icon} style={{ fontSize: 24, color: '#1B2A4A' }} />
              ) : (
                <Icon icon="mdi:plus" style={{ fontSize: 18, color: '#9CA3AF' }} />
              )}
            </Box>

            <TextField
              size="small"
              label="Name"
              value={item.name}
              onChange={(e) =>
                updateListItem('specialities', index, { ...item, name: e.target.value })
              }
              sx={{ flex: '1 1 140px' }}
              placeholder="e.g., RERA Approved"
            />
            <TextField
              size="small"
              label="Description"
              value={item.description}
              onChange={(e) =>
                updateListItem('specialities', index, { ...item, description: e.target.value })
              }
              sx={{ flex: '2 1 200px' }}
              placeholder="Short description"
            />
            {formData.specialities.length > 1 && (
              <IconButton
                size="small"
                onClick={() => removeListItem('specialities', index)}
                sx={{ color: '#EF4444' }}
              >
                <Icon icon="mdi:close-circle-outline" style={{ fontSize: 20 }} />
              </IconButton>
            )}
          </Box>
        </Paper>
      ))}

      <Button
        size="small"
        variant="text"
        onClick={() => addListItem('specialities', { icon: '', name: '', description: '' })}
        startIcon={<Icon icon="mdi:plus" />}
        sx={{ color: '#6B7280', alignSelf: 'flex-start' }}
      >
        Add Highlight
      </Button>

      <IconPicker
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSelect={handleIconSelect}
        currentIcon={iconPickerIndex !== null ? formData.specialities[iconPickerIndex]?.icon : ''}
      />
    </Box>
  );
};

export default HighlightsTab;
