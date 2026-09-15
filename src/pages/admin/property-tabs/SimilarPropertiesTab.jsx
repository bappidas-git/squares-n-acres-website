import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip, Paper, CircularProgress, TextField, InputAdornment } from '@mui/material';
import { Icon } from '@iconify/react';
import { propertyService } from '../../../services/api';

const formatPrice = (price) => {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${price?.toLocaleString('en-IN') || 0}`;
};

const SimilarPropertiesTab = ({ formData, updateField, propertyId }) => {
  const [allProperties, setAllProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const selectedIds = formData.similarPropertyIds || [];

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const data = await propertyService.getAll({ isActive: true });
        setAllProperties(data.filter((p) => p.id !== propertyId));
      } catch {
        setAllProperties([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [propertyId]);

  const toggleProperty = (id) => {
    if (selectedIds.includes(id)) {
      updateField('similarPropertyIds', selectedIds.filter((pid) => pid !== id));
    } else {
      updateField('similarPropertyIds', [...selectedIds, id]);
    }
  };

  const filteredProperties = allProperties.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.location?.area?.toLowerCase().includes(q) ||
      p.developer?.toLowerCase().includes(q)
    );
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
        Similar Properties
      </Typography>
      <Typography variant="caption" sx={{ color: '#9CA3AF', mt: -1 }}>
        Select related properties to show in the "Similar Properties" section. If none selected, the system auto-selects based on type.
      </Typography>

      {selectedIds.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {selectedIds.map((id) => {
            const prop = allProperties.find((p) => p.id === id);
            return (
              <Chip
                key={id}
                label={prop?.title || `ID: ${id}`}
                size="small"
                onDelete={() => toggleProperty(id)}
                sx={{ bgcolor: '#1B2A4A', color: '#fff', '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.6)' } }}
              />
            );
          })}
        </Box>
      )}

      <TextField
        size="small"
        placeholder="Search properties..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Icon icon="mdi:magnify" style={{ color: '#9CA3AF' }} />
            </InputAdornment>
          ),
        }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} sx={{ color: '#C9A86C' }} />
        </Box>
      ) : filteredProperties.length === 0 ? (
        <Typography variant="body2" sx={{ color: '#9CA3AF', textAlign: 'center', py: 4 }}>
          No properties found.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 400, overflowY: 'auto' }}>
          {filteredProperties.map((prop) => {
            const isSelected = selectedIds.includes(prop.id);
            return (
              <Paper
                key={prop.id}
                onClick={() => toggleProperty(prop.id)}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #C9A86C' : '1px solid #E5E7EB',
                  bgcolor: isSelected ? '#FEF8F0' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: isSelected ? '#FEF8F0' : '#F9FAFB' },
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 1.5,
                    bgcolor: '#F3F4F6',
                    backgroundImage: prop.gallery?.[0] ? `url(${prop.gallery[0]})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {!prop.gallery?.[0] && (
                    <Icon icon="mdi:home-outline" style={{ fontSize: 24, color: '#D1D5DB' }} />
                  )}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color: '#1B2A4A',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {prop.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>
                    {prop.location?.area}, {prop.location?.city} &middot; {formatPrice(prop.price)}
                  </Typography>
                </Box>

                <Box sx={{ flexShrink: 0 }}>
                  {isSelected ? (
                    <Icon icon="mdi:check-circle" style={{ fontSize: 24, color: '#C9A86C' }} />
                  ) : (
                    <Icon icon="mdi:circle-outline" style={{ fontSize: 24, color: '#D1D5DB' }} />
                  )}
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default SimilarPropertiesTab;
