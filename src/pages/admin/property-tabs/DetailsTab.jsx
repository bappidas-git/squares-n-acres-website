import React, { useState } from 'react';
import { Box, Typography, TextField, Button, IconButton, Paper } from '@mui/material';
import { Icon } from '@iconify/react';
import IconPicker from '../../../components/admin/IconPicker';

const DetailsTab = ({ formData, updateListItem, addListItem, removeListItem }) => {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconPickerIndex, setIconPickerIndex] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);

  const openIconPicker = (index) => {
    setIconPickerIndex(index);
    setIconPickerOpen(true);
  };

  const handleIconSelect = (iconName) => {
    if (iconPickerIndex !== null) {
      const spec = formData.specifications[iconPickerIndex];
      updateListItem('specifications', iconPickerIndex, { ...spec, icon: iconName });
    }
  };

  const handleDragStart = (index) => setDragIndex(index);

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const specs = [...formData.specifications];
    const [moved] = specs.splice(dragIndex, 1);
    specs.splice(index, 0, moved);
    // Update entire specs array via parent
    // Rebuild the array via parent update
    specs.forEach((spec, i) => {
      updateListItem('specifications', i, spec);
    });
    setDragIndex(index);
  };

  const handleDragEnd = () => setDragIndex(null);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
        Property Details (Key-Value with Icons)
      </Typography>
      <Typography variant="caption" sx={{ color: '#9CA3AF', mt: -1 }}>
        Dynamic details shown in the "Property Details" section. Each item has an icon, label, and value.
        Common examples: Project Area, Total Units, Towers, Floors, RERA ID, Launch Date, Possession Date, etc.
      </Typography>

      {formData.specifications.map((spec, index) => (
        <Paper
          key={index}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          sx={{
            p: 2,
            borderRadius: 2,
            border: dragIndex === index ? '1px dashed #3B82F6' : '1px solid #E5E7EB',
            bgcolor: dragIndex === index ? '#EFF6FF' : '#fff',
            cursor: 'grab',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Icon icon="mdi:drag-vertical" style={{ fontSize: 20, color: '#D1D5DB', flexShrink: 0 }} />

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
                bgcolor: spec.icon ? '#F0F7FF' : '#F9FAFB',
                flexShrink: 0,
                '&:hover': { borderColor: '#C9A86C', bgcolor: '#FEF8F0' },
              }}
            >
              {spec.icon ? (
                <Icon icon={spec.icon} style={{ fontSize: 24, color: '#1B2A4A' }} />
              ) : (
                <Icon icon="mdi:plus" style={{ fontSize: 18, color: '#9CA3AF' }} />
              )}
            </Box>

            <TextField
              size="small"
              label="Key / Label"
              value={spec.key}
              onChange={(e) =>
                updateListItem('specifications', index, { ...spec, key: e.target.value })
              }
              sx={{ flex: '1 1 140px' }}
              placeholder="e.g., Project Area"
            />
            <TextField
              size="small"
              label="Value"
              value={spec.value}
              onChange={(e) =>
                updateListItem('specifications', index, { ...spec, value: e.target.value })
              }
              sx={{ flex: '1 1 140px' }}
              placeholder="e.g., 15 acres"
            />

            {formData.specifications.length > 1 && (
              <IconButton
                size="small"
                onClick={() => removeListItem('specifications', index)}
                sx={{ color: '#EF4444' }}
              >
                <Icon icon="mdi:close-circle-outline" style={{ fontSize: 20 }} />
              </IconButton>
            )}
          </Box>

          {spec.icon && (
            <Typography variant="caption" sx={{ color: '#9CA3AF', ml: 8, mt: 0.5, display: 'block' }}>
              Icon: {spec.icon}
            </Typography>
          )}
        </Paper>
      ))}

      <Button
        size="small"
        variant="text"
        onClick={() => addListItem('specifications', { key: '', value: '', icon: '' })}
        startIcon={<Icon icon="mdi:plus" />}
        sx={{ color: '#6B7280', alignSelf: 'flex-start' }}
      >
        Add Detail Item
      </Button>

      <IconPicker
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSelect={handleIconSelect}
        currentIcon={iconPickerIndex !== null ? formData.specifications[iconPickerIndex]?.icon : ''}
      />
    </Box>
  );
};

export default DetailsTab;
