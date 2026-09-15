import React from 'react';
import { Box, Typography, TextField, Button, IconButton, Paper, InputAdornment } from '@mui/material';
import { Icon } from '@iconify/react';
import ImageUrlHelperText from '../../../components/admin/ImageUrlHelperText';

const FloorPlansTab = ({ formData, updateField, updateListItem, addListItem, removeListItem }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
        Floor Plans & Pricing
      </Typography>
      <Typography variant="caption" sx={{ color: '#9CA3AF', mt: -1 }}>
        Add floor plan variants with configuration details. These appear in the Floor Plans section.
      </Typography>

      {/* Brochure & Floor Plan URLs */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Brochure URL"
          value={formData.brochureUrl}
          onChange={(e) => updateField('brochureUrl', e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
          placeholder="https://example.com/brochure.pdf"
          size="small"
        />
        <TextField
          label="Floor Plan PDF URL"
          value={formData.floorPlanPdfUrl}
          onChange={(e) => updateField('floorPlanPdfUrl', e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
          placeholder="https://example.com/floorplans.pdf"
          size="small"
        />
      </Box>

      {formData.floorPlans.map((fp, index) => (
        <Paper key={index} sx={{ p: 2, borderRadius: 2, border: '1px solid #E5E7EB' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#6B7280' }}>
              Floor Plan #{index + 1}
            </Typography>
            {formData.floorPlans.length > 1 && (
              <IconButton size="small" onClick={() => removeListItem('floorPlans', index)} sx={{ color: '#EF4444' }}>
                <Icon icon="mdi:close-circle-outline" style={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              label="Configuration"
              value={fp.config}
              onChange={(e) => updateListItem('floorPlans', index, { ...fp, config: e.target.value })}
              sx={{ flex: '1 1 140px' }}
              placeholder="e.g., 2 BHK"
            />
            <TextField
              size="small"
              label="Area"
              value={fp.area}
              onChange={(e) => updateListItem('floorPlans', index, { ...fp, area: e.target.value })}
              sx={{ flex: '1 1 120px' }}
              placeholder="e.g., 1245 sqft"
            />
            <TextField
              size="small"
              label="Price"
              type="number"
              value={fp.price}
              onChange={(e) => updateListItem('floorPlans', index, { ...fp, price: e.target.value })}
              sx={{ flex: '1 1 140px' }}
              InputProps={{ startAdornment: <InputAdornment position="start">&#8377;</InputAdornment> }}
            />
            <TextField
              size="small"
              label="Bedrooms"
              type="number"
              value={fp.bedrooms}
              onChange={(e) => updateListItem('floorPlans', index, { ...fp, bedrooms: e.target.value })}
              sx={{ width: 100 }}
            />
            <TextField
              size="small"
              label="Bathrooms"
              type="number"
              value={fp.bathrooms}
              onChange={(e) => updateListItem('floorPlans', index, { ...fp, bathrooms: e.target.value })}
              sx={{ width: 100 }}
            />
            <Box sx={{ flex: '1 1 100%' }}>
              <TextField
                size="small"
                label="Image URL"
                value={fp.image}
                onChange={(e) => updateListItem('floorPlans', index, { ...fp, image: e.target.value })}
                fullWidth
                placeholder="https://placehold.co/600x400"
              />
              <ImageUrlHelperText fieldType="floorPlan" />
            </Box>
          </Box>
        </Paper>
      ))}

      <Button
        size="small"
        variant="text"
        onClick={() =>
          addListItem('floorPlans', { config: '', area: '', price: '', image: '', bedrooms: '', bathrooms: '' })
        }
        startIcon={<Icon icon="mdi:plus" />}
        sx={{ color: '#6B7280', alignSelf: 'flex-start' }}
      >
        Add Floor Plan
      </Button>
    </Box>
  );
};

export default FloorPlansTab;
