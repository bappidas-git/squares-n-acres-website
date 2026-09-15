import React, { useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Chip,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { CONFIGURATION_OPTIONS } from './constants';

const OverviewTab = ({ formData, updateField, updateListItem, addListItem, removeListItem, errors }) => {
  const updateLocation = useCallback(
    (field, value) => {
      updateField('location', { ...formData.location, [field]: value });
    },
    [formData.location, updateField]
  );

  const updateDimensionRange = useCallback(
    (field, value) => {
      updateField('dimensionRange', { ...formData.dimensionRange, [field]: value });
    },
    [formData.dimensionRange, updateField]
  );

  const toggleConfiguration = (config) => {
    updateField(
      'configuration',
      formData.configuration.includes(config)
        ? formData.configuration.filter((c) => c !== config)
        : [...formData.configuration, config]
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Description */}
      <TextField
        label="Property Description"
        value={formData.description}
        onChange={(e) => updateField('description', e.target.value)}
        error={!!errors.description}
        helperText={errors.description || 'Describe the property in detail. This appears in the Overview section.'}
        multiline
        rows={5}
        fullWidth
        required
      />

      {/* Location */}
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
        Location
      </Typography>
      <TextField
        label="Area / Locality"
        value={formData.location.area}
        onChange={(e) => updateLocation('area', e.target.value)}
        error={!!errors['location.area']}
        helperText={errors['location.area']}
        fullWidth
        required
      />
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="City"
          value={formData.location.city}
          onChange={(e) => updateLocation('city', e.target.value)}
          error={!!errors['location.city']}
          helperText={errors['location.city']}
          required
          sx={{ flex: 1, minWidth: 200 }}
        />
        <TextField
          label="State"
          value={formData.location.state}
          onChange={(e) => updateLocation('state', e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
        />
      </Box>
      <TextField
        label="Full Address"
        value={formData.location.address || ''}
        onChange={(e) => updateLocation('address', e.target.value)}
        multiline
        rows={2}
        fullWidth
      />
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Latitude"
          type="number"
          value={formData.location.lat}
          onChange={(e) => updateLocation('lat', e.target.value)}
          sx={{ flex: 1, minWidth: 180 }}
          inputProps={{ step: 'any' }}
        />
        <TextField
          label="Longitude"
          type="number"
          value={formData.location.lng}
          onChange={(e) => updateLocation('lng', e.target.value)}
          sx={{ flex: 1, minWidth: 180 }}
          inputProps={{ step: 'any' }}
        />
      </Box>

      {/* Configuration */}
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A', mt: 1 }}>
        Configuration Options
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {CONFIGURATION_OPTIONS.map((config) => (
          <Chip
            key={config}
            label={config}
            clickable
            onClick={() => toggleConfiguration(config)}
            sx={{
              fontWeight: 500,
              bgcolor: formData.configuration.includes(config) ? '#1B2A4A' : '#F3F4F6',
              color: formData.configuration.includes(config) ? '#fff' : '#6B7280',
              '&:hover': {
                bgcolor: formData.configuration.includes(config) ? '#2D4470' : '#E5E7EB',
              },
            }}
          />
        ))}
      </Box>

      {/* Dimension Range */}
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A', mt: 1 }}>
        Dimension Range
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          label="Min Area"
          type="number"
          size="small"
          value={formData.dimensionRange.min}
          onChange={(e) => updateDimensionRange('min', e.target.value)}
          sx={{ width: 140 }}
        />
        <Typography variant="body2" sx={{ color: '#9CA3AF' }}>to</Typography>
        <TextField
          label="Max Area"
          type="number"
          size="small"
          value={formData.dimensionRange.max}
          onChange={(e) => updateDimensionRange('max', e.target.value)}
          sx={{ width: 140 }}
        />
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Unit</InputLabel>
          <Select
            value={formData.dimensionRange.unit}
            label="Unit"
            onChange={(e) => updateDimensionRange('unit', e.target.value)}
          >
            <MenuItem value="sqft">sqft</MenuItem>
            <MenuItem value="sqm">sqm</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Highlights */}
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A', mt: 1 }}>
        Highlights
      </Typography>
      <Typography variant="caption" sx={{ color: '#9CA3AF', mt: -2 }}>
        Key selling points that appear in the Overview section.
      </Typography>
      {formData.highlights.map((highlight, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            fullWidth
            placeholder={`Highlight ${index + 1}`}
            value={highlight}
            onChange={(e) => updateListItem('highlights', index, e.target.value)}
          />
          {formData.highlights.length > 1 && (
            <IconButton size="small" onClick={() => removeListItem('highlights', index)} sx={{ color: '#EF4444' }}>
              <Icon icon="mdi:close-circle-outline" style={{ fontSize: 20 }} />
            </IconButton>
          )}
        </Box>
      ))}
      <Button
        size="small"
        variant="text"
        onClick={() => addListItem('highlights', '')}
        startIcon={<Icon icon="mdi:plus" />}
        sx={{ color: '#6B7280', alignSelf: 'flex-start' }}
      >
        Add Highlight
      </Button>
    </Box>
  );
};

export default OverviewTab;
