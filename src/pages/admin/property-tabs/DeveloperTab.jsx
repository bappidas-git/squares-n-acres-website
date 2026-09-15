import React, { useState } from 'react';
import { Box, Typography, TextField, Button, IconButton, Paper } from '@mui/material';
import { Icon } from '@iconify/react';
import IconPicker from '../../../components/admin/IconPicker';
import ImageUrlHelperText from '../../../components/admin/ImageUrlHelperText';

const DeveloperTab = ({ formData, updateField }) => {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconPickerIndex, setIconPickerIndex] = useState(null);

  const devInfo = formData.developerInfo || { name: '', description: '', logo: '', stats: [] };

  const updateDevInfo = (field, value) => {
    updateField('developerInfo', { ...devInfo, [field]: value });
  };

  const updateStat = (index, field, value) => {
    const stats = [...devInfo.stats];
    stats[index] = { ...stats[index], [field]: value };
    updateDevInfo('stats', stats);
  };

  const addStat = () => {
    updateDevInfo('stats', [
      ...devInfo.stats,
      { value: '', suffix: '+', label: '', icon: 'mdi:chart-line' },
    ]);
  };

  const removeStat = (index) => {
    updateDevInfo('stats', devInfo.stats.filter((_, i) => i !== index));
  };

  const openIconPicker = (index) => {
    setIconPickerIndex(index);
    setIconPickerOpen(true);
  };

  const handleIconSelect = (iconName) => {
    if (iconPickerIndex !== null) {
      updateStat(iconPickerIndex, 'icon', iconName);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
        Developer Information
      </Typography>
      <Typography variant="caption" sx={{ color: '#9CA3AF', mt: -2 }}>
        The developer name from Basic Info is used as the heading. Add extra details here.
      </Typography>

      <TextField
        label="Developer Description"
        value={devInfo.description}
        onChange={(e) => updateDevInfo('description', e.target.value)}
        multiline
        rows={4}
        fullWidth
        placeholder="Describe the developer's background, track record, and reputation..."
      />

      <Box>
        <TextField
          label="Logo URL"
          value={devInfo.logo}
          onChange={(e) => updateDevInfo('logo', e.target.value)}
          fullWidth
          size="small"
          placeholder="https://example.com/developer-logo.png"
        />
        <ImageUrlHelperText fieldType="developerLogo" />
      </Box>

      {/* Stats */}
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A', mt: 1 }}>
        Developer Stats / Metrics
      </Typography>
      <Typography variant="caption" sx={{ color: '#9CA3AF', mt: -1 }}>
        Add metrics displayed in the developer section. e.g., "20+ Years Experience", "50+ Projects".
      </Typography>

      {devInfo.stats.map((stat, index) => (
        <Paper key={index} sx={{ p: 2, borderRadius: 2, border: '1px solid #E5E7EB' }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
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
              <Icon icon={stat.icon || 'mdi:chart-line'} style={{ fontSize: 22, color: '#1B2A4A' }} />
            </Box>

            <TextField
              size="small"
              label="Value"
              type="number"
              value={stat.value}
              onChange={(e) => updateStat(index, 'value', e.target.value)}
              sx={{ width: 100 }}
              placeholder="20"
            />
            <TextField
              size="small"
              label="Suffix"
              value={stat.suffix}
              onChange={(e) => updateStat(index, 'suffix', e.target.value)}
              sx={{ width: 80 }}
              placeholder="+"
            />
            <TextField
              size="small"
              label="Label"
              value={stat.label}
              onChange={(e) => updateStat(index, 'label', e.target.value)}
              sx={{ flex: '1 1 160px' }}
              placeholder="e.g., Years Experience"
            />
            {devInfo.stats.length > 1 && (
              <IconButton size="small" onClick={() => removeStat(index)} sx={{ color: '#EF4444' }}>
                <Icon icon="mdi:close-circle-outline" style={{ fontSize: 20 }} />
              </IconButton>
            )}
          </Box>
        </Paper>
      ))}

      <Button
        size="small"
        variant="text"
        onClick={addStat}
        startIcon={<Icon icon="mdi:plus" />}
        sx={{ color: '#6B7280', alignSelf: 'flex-start' }}
      >
        Add Stat
      </Button>

      <IconPicker
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSelect={handleIconSelect}
        currentIcon={iconPickerIndex !== null ? devInfo.stats[iconPickerIndex]?.icon : ''}
      />
    </Box>
  );
};

export default DeveloperTab;
