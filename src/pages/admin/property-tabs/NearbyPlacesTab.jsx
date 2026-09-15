import React from 'react';
import { Box, Typography, TextField, Button, IconButton, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Icon } from '@iconify/react';
import { NEARBY_TYPES } from './constants';

const NearbyPlacesTab = ({ formData, updateListItem, addListItem, removeListItem }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
        Nearby Places
      </Typography>
      <Typography variant="caption" sx={{ color: '#9CA3AF', mt: -1 }}>
        Add important places near the property. These are displayed in the Location section.
      </Typography>

      {formData.nearbyPlaces.map((place, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="Place Name"
            value={place.name}
            onChange={(e) =>
              updateListItem('nearbyPlaces', index, { ...place, name: e.target.value })
            }
            sx={{ flex: '1 1 180px' }}
            placeholder="e.g., International Tech Park"
          />
          <TextField
            size="small"
            label="Distance"
            value={place.distance}
            onChange={(e) =>
              updateListItem('nearbyPlaces', index, { ...place, distance: e.target.value })
            }
            sx={{ width: 120 }}
            placeholder="e.g., 3 km"
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={place.type}
              label="Type"
              onChange={(e) =>
                updateListItem('nearbyPlaces', index, { ...place, type: e.target.value })
              }
            >
              {NEARBY_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {formData.nearbyPlaces.length > 1 && (
            <IconButton size="small" onClick={() => removeListItem('nearbyPlaces', index)} sx={{ color: '#EF4444' }}>
              <Icon icon="mdi:close-circle-outline" style={{ fontSize: 20 }} />
            </IconButton>
          )}
        </Box>
      ))}

      <Button
        size="small"
        variant="text"
        onClick={() => addListItem('nearbyPlaces', { name: '', distance: '', type: 'school' })}
        startIcon={<Icon icon="mdi:plus" />}
        sx={{ color: '#6B7280', alignSelf: 'flex-start' }}
      >
        Add Nearby Place
      </Button>
    </Box>
  );
};

export default NearbyPlacesTab;
