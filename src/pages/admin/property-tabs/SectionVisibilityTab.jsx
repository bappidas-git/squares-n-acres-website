import React from 'react';
import { Box, Typography, Switch } from '@mui/material';
import { Icon } from '@iconify/react';
import { SECTION_VISIBILITY_CONFIG } from './constants';

const SectionVisibilityTab = ({ formData, updateField }) => {
  const sections = formData.sections || {};

  const handleToggle = (key) => {
    updateField('sections', {
      ...sections,
      [key]: !sections[key],
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, color: 'var(--color-charcoal)', mb: 0.5 }}
        >
          Section Visibility
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', mb: 2 }}>
          Control which sections appear on the property details page. Sections will only render if
          the toggle is enabled AND the section has valid data.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1.5,
        }}
      >
        {SECTION_VISIBILITY_CONFIG.map((section) => {
          const enabled = sections[section.key] !== false;
          return (
            <Box
              key={section.key}
              onClick={() => handleToggle(section.key)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: enabled ? 'var(--color-primary)' : 'var(--color-border)',
                bgcolor: enabled ? 'rgba(201, 168, 108, 0.04)' : 'var(--color-surface)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: enabled ? 'var(--color-primary-dark)' : 'var(--color-border-strong)',
                  bgcolor: enabled ? 'rgba(201, 168, 108, 0.08)' : 'var(--color-surface)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: enabled ? 'var(--color-charcoal)' : 'var(--color-surface)',
                    color: enabled ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Icon icon={section.icon} style={{ fontSize: 18 }} />
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: enabled ? 'var(--color-charcoal)' : 'var(--color-text-muted)',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {section.label}
                </Typography>
              </Box>
              <Switch
                checked={enabled}
                onChange={() => handleToggle(section.key)}
                onClick={(e) => e.stopPropagation()}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-primary-dark)' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    bgcolor: 'var(--color-primary)',
                  },
                }}
              />
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          mt: 1,
          p: 1.5,
          borderRadius: 2,
          bgcolor: 'var(--color-warning-bg)',
          border: '1px solid var(--color-warning-bg)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'var(--color-warning-dark)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <Icon icon="mdi:information-outline" style={{ fontSize: 16 }} />
          Disabled sections will not appear on the website even if they contain data.
        </Typography>
      </Box>
    </Box>
  );
};

export default SectionVisibilityTab;
