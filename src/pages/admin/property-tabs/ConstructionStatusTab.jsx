import React, { useState } from 'react';
import { Box, Typography, TextField, Button, IconButton, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Icon } from '@iconify/react';
import IconPicker from '../../../components/admin/IconPicker';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: '#9CA3AF' },
  { value: 'in-progress', label: 'In Progress', color: '#D97706' },
  { value: 'completed', label: 'Completed', color: '#059669' },
];

const ConstructionStatusTab = ({ formData, updateField }) => {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconPickerIndex, setIconPickerIndex] = useState(null);

  const timeline = formData.constructionTimeline || [];

  const updateItem = (index, field, value) => {
    const updated = [...timeline];
    updated[index] = { ...updated[index], [field]: value };
    updateField('constructionTimeline', updated);
  };

  const addItem = () => {
    updateField('constructionTimeline', [
      ...timeline,
      { label: '', status: 'pending', icon: 'mdi:progress-clock' },
    ]);
  };

  const removeItem = (index) => {
    updateField('constructionTimeline', timeline.filter((_, i) => i !== index));
  };

  const openIconPicker = (index) => {
    setIconPickerIndex(index);
    setIconPickerOpen(true);
  };

  const handleIconSelect = (iconName) => {
    if (iconPickerIndex !== null) {
      updateItem(iconPickerIndex, 'icon', iconName);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
        Construction Timeline
      </Typography>
      <Typography variant="caption" sx={{ color: '#9CA3AF', mt: -1 }}>
        Define milestones for the construction timeline. Each milestone has a label, status, and optional icon.
      </Typography>

      {timeline.map((item, index) => (
        <Paper key={index} sx={{ p: 2, borderRadius: 2, border: '1px solid #E5E7EB' }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Status indicator */}
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: STATUS_OPTIONS.find((s) => s.value === item.status)?.color || '#9CA3AF',
                flexShrink: 0,
              }}
            />

            {/* Icon */}
            <Box
              onClick={() => openIconPicker(index)}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                border: '1px dashed #D1D5DB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                bgcolor: '#F9FAFB',
                flexShrink: 0,
                '&:hover': { borderColor: '#C9A86C' },
              }}
            >
              <Icon icon={item.icon || 'mdi:progress-clock'} style={{ fontSize: 22, color: '#1B2A4A' }} />
            </Box>

            <TextField
              size="small"
              label="Milestone Label"
              value={item.label}
              onChange={(e) => updateItem(index, 'label', e.target.value)}
              sx={{ flex: '1 1 160px' }}
              placeholder="e.g., Foundation"
            />

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={item.status}
                label="Status"
                onChange={(e) => updateItem(index, 'status', e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: opt.color }} />
                      {opt.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {timeline.length > 1 && (
              <IconButton size="small" onClick={() => removeItem(index)} sx={{ color: '#EF4444' }}>
                <Icon icon="mdi:close-circle-outline" style={{ fontSize: 20 }} />
              </IconButton>
            )}
          </Box>
        </Paper>
      ))}

      <Button
        size="small"
        variant="text"
        onClick={addItem}
        startIcon={<Icon icon="mdi:plus" />}
        sx={{ color: '#6B7280', alignSelf: 'flex-start' }}
      >
        Add Milestone
      </Button>

      <IconPicker
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSelect={handleIconSelect}
        currentIcon={iconPickerIndex !== null ? timeline[iconPickerIndex]?.icon : ''}
      />
    </Box>
  );
};

export default ConstructionStatusTab;
