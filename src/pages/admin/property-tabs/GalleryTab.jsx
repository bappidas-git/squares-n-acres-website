import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, TextField, Button, IconButton } from '@mui/material';
import { Icon } from '@iconify/react';
import ImageUrlHelperText from '../../../components/admin/ImageUrlHelperText';

const PLACEHOLDER_COVER_PREFIX = 'https://picsum.photos/seed/';

const getDefaultCoverUrl = (title) => {
  const seed =
    (title || 'project')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'project';
  return `${PLACEHOLDER_COVER_PREFIX}${seed}/800/600`;
};

const GalleryTab = ({ formData, updateField, updateListItem, addListItem, removeListItem }) => {
  const [dragIndex, setDragIndex] = useState(null);
  const userEditedCover = useRef(false);

  // Auto-set cover image default when property name changes and cover URL is empty or is a placeholder
  useEffect(() => {
    if (userEditedCover.current) return;
    const gallery = formData.gallery;
    if (!gallery?.length || !formData.title) return;
    const currentCover = gallery[0] || '';
    if (currentCover !== '' && !currentCover.startsWith(PLACEHOLDER_COVER_PREFIX)) return;
    const defaultUrl = getDefaultCoverUrl(formData.title);
    if (currentCover === defaultUrl) return;
    const updated = [...gallery];
    updated[0] = defaultUrl;
    updateField('gallery', updated);
  }, [formData.title, formData.gallery, updateField]);

  const handleCoverChange = (value) => {
    // Track if user manually entered a non-placeholder value
    if (value && !value.startsWith(PLACEHOLDER_COVER_PREFIX)) {
      userEditedCover.current = true;
    } else {
      userEditedCover.current = false;
    }
    updateListItem('gallery', 0, value);
  };

  const handleDragStart = (index) => setDragIndex(index);

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const gallery = [...formData.gallery];
    const [moved] = gallery.splice(dragIndex, 1);
    gallery.splice(index, 0, moved);
    updateField('gallery', gallery);
    setDragIndex(index);
  };

  const handleDragEnd = () => setDragIndex(null);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>
        Gallery Images
      </Typography>
      <Typography variant="caption" sx={{ color: 'var(--color-text-muted)', mt: -1.5 }}>
        Add image URLs. Drag to reorder. First image will be the main cover.
      </Typography>

      {formData.gallery.map((url, index) => (
        <Box
          key={index}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          sx={{
            display: 'flex',
            gap: 1.5,
            alignItems: 'center',
            p: 1,
            borderRadius: 2,
            bgcolor: dragIndex === index ? 'var(--color-info-bg)' : 'transparent',
            border: dragIndex === index ? '1px dashed var(--color-info)' : '1px solid transparent',
            cursor: 'grab',
            transition: 'background-color 0.15s',
          }}
        >
          <Icon
            icon="mdi:drag-vertical"
            style={{ fontSize: 20, color: 'var(--color-text-muted)', flexShrink: 0 }}
          />

          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 1.5,
              bgcolor: 'var(--color-surface)',
              backgroundImage: url ? `url(${url})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {!url && (
              <Icon
                icon="mdi:image-outline"
                style={{ fontSize: 20, color: 'var(--color-text-muted)' }}
              />
            )}
          </Box>

          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {index === 0 && (
              <Typography
                variant="caption"
                sx={{ color: 'var(--color-primary-dark)', fontWeight: 600, fontSize: '0.65rem' }}
              >
                COVER IMAGE
              </Typography>
            )}
            <TextField
              size="small"
              fullWidth
              placeholder="Image URL"
              value={url}
              onChange={(e) =>
                index === 0
                  ? handleCoverChange(e.target.value)
                  : updateListItem('gallery', index, e.target.value)
              }
            />
            <ImageUrlHelperText fieldType="gallery" />
          </Box>

          {formData.gallery.length > 1 && (
            <IconButton
              size="small"
              onClick={() => removeListItem('gallery', index)}
              sx={{ color: 'var(--color-error-dark)' }}
            >
              <Icon icon="mdi:close-circle-outline" style={{ fontSize: 20 }} />
            </IconButton>
          )}
        </Box>
      ))}

      <Button
        size="small"
        variant="text"
        onClick={() => addListItem('gallery', '')}
        startIcon={<Icon icon="mdi:plus" />}
        sx={{ color: 'var(--color-text-muted)', alignSelf: 'flex-start' }}
      >
        Add Image
      </Button>
    </Box>
  );
};

export default GalleryTab;
