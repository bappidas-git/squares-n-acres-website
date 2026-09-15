import React, { useState } from 'react';
import { Box, Typography, TextField, Button, IconButton, Paper } from '@mui/material';
import { Icon } from '@iconify/react';
import IconPicker from '../../../components/admin/IconPicker';

const DocumentsTab = ({ formData, updateListItem, addListItem, removeListItem }) => {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconPickerIndex, setIconPickerIndex] = useState(null);

  const openIconPicker = (index) => {
    setIconPickerIndex(index);
    setIconPickerOpen(true);
  };

  const handleIconSelect = (iconName) => {
    if (iconPickerIndex !== null) {
      const doc = formData.documents[iconPickerIndex];
      updateListItem('documents', iconPickerIndex, { ...doc, icon: iconName });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
        Property Documents
      </Typography>
      <Typography variant="caption" sx={{ color: '#9CA3AF', mt: -1 }}>
        Add documents that are available for the property. Users can request to download these.
      </Typography>

      {formData.documents.map((doc, index) => (
        <Paper key={index} sx={{ p: 2, borderRadius: 2, border: '1px solid #E5E7EB' }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Icon selector */}
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
                bgcolor: doc.icon ? '#F0F7FF' : '#F9FAFB',
                flexShrink: 0,
                '&:hover': { borderColor: '#C9A86C' },
              }}
            >
              <Icon icon={doc.icon || 'mdi:file-document'} style={{ fontSize: 22, color: '#1B2A4A' }} />
            </Box>

            <TextField
              size="small"
              label="Document Name"
              value={doc.name}
              onChange={(e) =>
                updateListItem('documents', index, { ...doc, name: e.target.value })
              }
              sx={{ flex: '1 1 180px' }}
              placeholder="e.g., RERA Certificate"
            />
            <TextField
              size="small"
              label="Document URL (optional)"
              value={doc.url || ''}
              onChange={(e) =>
                updateListItem('documents', index, { ...doc, url: e.target.value })
              }
              sx={{ flex: '1 1 200px' }}
              placeholder="https://example.com/doc.pdf"
            />
            {formData.documents.length > 1 && (
              <IconButton
                size="small"
                onClick={() => removeListItem('documents', index)}
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
        onClick={() => addListItem('documents', { name: '', icon: 'mdi:file-document', url: '' })}
        startIcon={<Icon icon="mdi:plus" />}
        sx={{ color: '#6B7280', alignSelf: 'flex-start' }}
      >
        Add Document
      </Button>

      <IconPicker
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSelect={handleIconSelect}
        currentIcon={iconPickerIndex !== null ? formData.documents[iconPickerIndex]?.icon : ''}
      />
    </Box>
  );
};

export default DocumentsTab;
