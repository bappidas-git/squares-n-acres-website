import React from 'react';
import { Box, Typography, TextField, Button, IconButton, Paper } from '@mui/material';
import { Icon } from '@iconify/react';
import { CONSTRUCTION_SPEC_CATEGORIES } from './constants';

const CATEGORY_CONFIG = {
  flooring: { label: 'Flooring', icon: 'mdi:floor-plan' },
  doors: { label: 'Doors & Windows', icon: 'mdi:door' },
  structure: { label: 'Structure', icon: 'mdi:pillar' },
  electrical: { label: 'Electrical', icon: 'mdi:lightning-bolt' },
  plumbing: { label: 'Plumbing', icon: 'mdi:water-pump' },
  others: { label: 'Others', icon: 'mdi:dots-horizontal' },
};

const ConstructionSpecsTab = ({ formData, updateField }) => {
  const updateSpec = (category, index, field, value) => {
    const specs = { ...formData.constructionSpecs };
    const catItems = [...(specs[category] || [])];
    catItems[index] = { ...catItems[index], [field]: value };
    specs[category] = catItems;
    updateField('constructionSpecs', specs);
  };

  const addSpec = (category) => {
    const specs = { ...formData.constructionSpecs };
    specs[category] = [...(specs[category] || []), { area: '', spec: '' }];
    updateField('constructionSpecs', specs);
  };

  const removeSpec = (category, index) => {
    const specs = { ...formData.constructionSpecs };
    specs[category] = specs[category].filter((_, i) => i !== index);
    updateField('constructionSpecs', specs);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
        Construction Specifications
      </Typography>
      <Typography variant="caption" sx={{ color: '#9CA3AF', mt: -2 }}>
        Add detailed construction specs by category. These appear in the Construction Specifications section.
      </Typography>

      {CONSTRUCTION_SPEC_CATEGORIES.map((category) => {
        const items = formData.constructionSpecs[category] || [];
        const config = CATEGORY_CONFIG[category] || { label: category, icon: 'mdi:cog' };

        if (items.length === 0 && !['flooring', 'doors', 'structure', 'electrical'].includes(category)) {
          return (
            <Button
              key={category}
              size="small"
              variant="outlined"
              onClick={() => addSpec(category)}
              startIcon={<Icon icon="mdi:plus" />}
              sx={{ alignSelf: 'flex-start', borderRadius: 2, color: '#6B7280', borderColor: '#D1D5DB' }}
            >
              Add {config.label} Specs
            </Button>
          );
        }

        return (
          <Paper key={category} sx={{ p: 2, borderRadius: 2, border: '1px solid #E5E7EB' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Icon icon={config.icon} style={{ fontSize: 20, color: '#C9A86C' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
                {config.label}
              </Typography>
            </Box>

            {items.map((item, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  label="Area / Component"
                  value={item.area}
                  onChange={(e) => updateSpec(category, index, 'area', e.target.value)}
                  sx={{ flex: '1 1 150px' }}
                  placeholder="e.g., Living Room"
                />
                <TextField
                  size="small"
                  label="Specification"
                  value={item.spec}
                  onChange={(e) => updateSpec(category, index, 'spec', e.target.value)}
                  sx={{ flex: '2 1 250px' }}
                  placeholder="e.g., Italian marble flooring"
                />
                {items.length > 1 && (
                  <IconButton size="small" onClick={() => removeSpec(category, index)} sx={{ color: '#EF4444' }}>
                    <Icon icon="mdi:close-circle-outline" style={{ fontSize: 20 }} />
                  </IconButton>
                )}
              </Box>
            ))}

            <Button
              size="small"
              variant="text"
              onClick={() => addSpec(category)}
              startIcon={<Icon icon="mdi:plus" />}
              sx={{ color: '#6B7280' }}
            >
              Add {config.label} Spec
            </Button>
          </Paper>
        );
      })}
    </Box>
  );
};

export default ConstructionSpecsTab;
