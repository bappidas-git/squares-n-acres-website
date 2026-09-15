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
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>
        Property Highlights / Specialities
      </Typography>
      <Typography variant="caption" sx={{ color: 'var(--color-text-muted)', mt: -1 }}>
        Key features shown as highlight cards with icons. e.g., RERA Approved, Eco-Friendly, Smart
        Home, etc.
      </Typography>

      {formData.specialities.map((item, index) => (
        <Paper key={index} sx={{ p: 2, borderRadius: 2, border: '1px solid var(--color-border)' }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Icon selector */}
            <Box
              onClick={() => openIconPicker(index)}
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                border: '1px dashed var(--color-border-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                bgcolor: item.icon ? 'var(--color-info-bg)' : 'var(--color-surface)',
                flexShrink: 0,
                '&:hover': {
                  borderColor: 'var(--color-primary)',
                  bgcolor: 'var(--color-warning-bg)',
                },
              }}
            >
              {item.icon ? (
                <Icon icon={item.icon} style={{ fontSize: 24, color: 'var(--color-charcoal)' }} />
              ) : (
                <Icon icon="mdi:plus" style={{ fontSize: 18, color: 'var(--color-text-muted)' }} />
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
                sx={{ color: 'var(--color-error-dark)' }}
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
        sx={{ color: 'var(--color-text-muted)', alignSelf: 'flex-start' }}
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
