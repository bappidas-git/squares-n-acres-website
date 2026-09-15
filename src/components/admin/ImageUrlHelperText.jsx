import React from 'react';
import { Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import IMAGE_FIELD_CONFIG from './imageFieldConfig';

const ImageUrlHelperText = ({ fieldType }) => {
  const config = IMAGE_FIELD_CONFIG[fieldType];

  if (!config) return null;

  return (
    <Typography
      variant="caption"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        color: '#9CA3AF',
        fontSize: '0.65rem',
        mt: 0.25,
      }}
    >
      <Icon icon="mdi:information-outline" style={{ fontSize: 12 }} />
      {config.helpText}
    </Typography>
  );
};

export default ImageUrlHelperText;
