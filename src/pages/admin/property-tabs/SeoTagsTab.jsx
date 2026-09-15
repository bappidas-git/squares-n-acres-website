import React, { useState, useMemo } from 'react';
import { Box, Typography, TextField, Chip, InputAdornment, Paper, LinearProgress } from '@mui/material';
import { Icon } from '@iconify/react';
import { TAG_OPTIONS } from './constants';
import ImageUrlHelperText from '../../../components/admin/ImageUrlHelperText';
import { calculateSeoScore, SEO_LIMITS } from '../../../utils/seoScoring';
import { generateSeoData } from '../../../utils/seoGenerator';

// Note: Tags are also available in Basic Info tab for quick access

const SeoTagsTab = ({ formData, updateField }) => {
  const [keywordInput, setKeywordInput] = useState('');

  // Live SEO score calculation
  const scoreData = useMemo(() => calculateSeoScore(formData), [formData]);

  const addKeyword = (keyword) => {
    const trimmed = keyword.trim().toLowerCase();
    if (trimmed && !formData.seoKeywords.includes(trimmed)) {
      updateField('seoKeywords', [...formData.seoKeywords, trimmed]);
    }
    setKeywordInput('');
  };

  const removeKeyword = (keyword) => {
    updateField('seoKeywords', formData.seoKeywords.filter((k) => k !== keyword));
  };

  const toggleTag = (tag) => {
    updateField(
      'tags',
      formData.tags.includes(tag)
        ? formData.tags.filter((t) => t !== tag)
        : [...formData.tags, tag]
    );
  };

  const validateSchema = (value) => {
    if (!value.trim()) return true;
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  };

  const handleAutoGenerate = () => {
    const generated = generateSeoData(formData);
    Object.entries(generated).forEach(([key, value]) => {
      updateField(key, value);
    });
  };

  // Color helpers for character count
  const getTitleLenColor = (len) => {
    if (len >= SEO_LIMITS.TITLE_OPTIMAL_MIN && len <= SEO_LIMITS.TITLE_OPTIMAL_MAX) return '#10B981';
    if (len > 0 && len <= SEO_LIMITS.TITLE_MAX_LENGTH) return '#F59E0B';
    if (len > SEO_LIMITS.TITLE_MAX_LENGTH) return '#EF4444';
    return '#9CA3AF';
  };

  const getDescLenColor = (len) => {
    if (len >= SEO_LIMITS.DESC_OPTIMAL_MIN && len <= SEO_LIMITS.DESC_OPTIMAL_MAX) return '#10B981';
    if (len > 0 && len <= SEO_LIMITS.DESC_MAX_LENGTH) return '#F59E0B';
    if (len > SEO_LIMITS.DESC_MAX_LENGTH) return '#EF4444';
    return '#9CA3AF';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* SEO Score + Auto-Generate */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
            SEO Settings
          </Typography>
          <Chip
            label={`Score: ${scoreData.totalScore}/100 (${scoreData.grade})`}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: '0.6875rem',
              bgcolor: scoreData.totalScore >= 80 ? '#ECFDF5' : scoreData.totalScore >= 60 ? '#FFFBEB' : '#FEF2F2',
              color: scoreData.totalScore >= 80 ? '#059669' : scoreData.totalScore >= 60 ? '#D97706' : '#DC2626',
            }}
          />
        </Box>
        <Chip
          icon={<Icon icon="mdi:auto-fix" style={{ fontSize: 16 }} />}
          label="Auto-Generate SEO"
          clickable
          onClick={handleAutoGenerate}
          sx={{ fontWeight: 500, bgcolor: '#F3F4F6', color: '#374151', '&:hover': { bgcolor: '#E5E7EB' } }}
        />
      </Box>

      {/* Score Breakdown (compact) */}
      {scoreData.issues.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, border: '1px solid #FEF3C7', bgcolor: '#FFFBEB' }}>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#D97706', mb: 0.5 }}>
            SEO Improvement Tips ({scoreData.issues.length})
          </Typography>
          {scoreData.issues.slice(0, 5).map((issue, idx) => (
            <Typography key={idx} sx={{ fontSize: '0.6875rem', color: '#92400E', pl: 1 }}>
              — {issue}
            </Typography>
          ))}
          {scoreData.issues.length > 5 && (
            <Typography sx={{ fontSize: '0.6875rem', color: '#92400E', pl: 1, fontStyle: 'italic' }}>
              + {scoreData.issues.length - 5} more suggestions
            </Typography>
          )}
        </Paper>
      )}

      {/* SEO Title with enhanced validation */}
      <TextField
        label="SEO Title"
        value={formData.seoTitle}
        onChange={(e) => updateField('seoTitle', e.target.value)}
        fullWidth
        helperText={
          <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography component="span" sx={{ fontSize: '0.6875rem', color: getTitleLenColor(formData.seoTitle.length) }}>
              {formData.seoTitle.length}/{SEO_LIMITS.TITLE_OPTIMAL_MAX} characters
              {formData.seoTitle.length >= SEO_LIMITS.TITLE_OPTIMAL_MIN && formData.seoTitle.length <= SEO_LIMITS.TITLE_OPTIMAL_MAX && ' — Optimal'}
              {formData.seoTitle.length > 0 && formData.seoTitle.length < SEO_LIMITS.TITLE_OPTIMAL_MIN && ` — Add ${SEO_LIMITS.TITLE_OPTIMAL_MIN - formData.seoTitle.length} more chars`}
              {formData.seoTitle.length > SEO_LIMITS.TITLE_MAX_LENGTH && ' — Too long, Google will truncate'}
            </Typography>
          </Box>
        }
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Typography
                variant="caption"
                sx={{ color: getTitleLenColor(formData.seoTitle.length) }}
              >
                {SEO_LIMITS.TITLE_MAX_LENGTH - formData.seoTitle.length}
              </Typography>
            </InputAdornment>
          ),
        }}
      />

      {/* SEO Description with enhanced validation */}
      <TextField
        label="SEO Description"
        value={formData.seoDescription}
        onChange={(e) => updateField('seoDescription', e.target.value)}
        multiline
        rows={3}
        fullWidth
        helperText={
          <Typography component="span" sx={{ fontSize: '0.6875rem', color: getDescLenColor(formData.seoDescription.length) }}>
            {formData.seoDescription.length}/{SEO_LIMITS.DESC_OPTIMAL_MAX} characters
            {formData.seoDescription.length >= SEO_LIMITS.DESC_OPTIMAL_MIN && formData.seoDescription.length <= SEO_LIMITS.DESC_OPTIMAL_MAX && ' — Optimal'}
            {formData.seoDescription.length > 0 && formData.seoDescription.length < SEO_LIMITS.DESC_OPTIMAL_MIN && ` — Add ${SEO_LIMITS.DESC_OPTIMAL_MIN - formData.seoDescription.length} more chars`}
            {formData.seoDescription.length > SEO_LIMITS.DESC_MAX_LENGTH && ' — Too long, Google will truncate'}
          </Typography>
        }
      />

      {/* SEO Keywords */}
      <Box>
        <TextField
          label="SEO Keywords"
          size="small"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addKeyword(keywordInput);
            }
          }}
          fullWidth
          placeholder="Type a keyword and press Enter"
          helperText={`${formData.seoKeywords.length} keywords — recommended ${SEO_LIMITS.MIN_KEYWORDS}-${SEO_LIMITS.MAX_KEYWORDS}`}
        />
        {formData.seoKeywords.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
            {formData.seoKeywords.map((kw) => (
              <Chip key={kw} label={kw} size="small" onDelete={() => removeKeyword(kw)} sx={{ bgcolor: '#F3F4F6' }} />
            ))}
          </Box>
        )}
      </Box>

      <TextField
        label="Canonical URL"
        value={formData.canonicalUrl || ''}
        onChange={(e) => updateField('canonicalUrl', e.target.value)}
        fullWidth
        size="small"
        placeholder="https://homadvisory.com/properties/property-slug"
        helperText="If empty, current URL is auto-used. Set explicitly to prevent duplicate content."
      />

      {/* Open Graph */}
      <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #E5E7EB' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Icon icon="mdi:share-variant" style={{ fontSize: 20, color: '#C9A86C' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
            Open Graph Tags
          </Typography>
          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
            (For social media sharing)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="OG Title"
            size="small"
            value={formData.ogTitle || ''}
            onChange={(e) => updateField('ogTitle', e.target.value)}
            fullWidth
            placeholder="Defaults to SEO Title if empty"
          />
          <TextField
            label="OG Description"
            size="small"
            value={formData.ogDescription || ''}
            onChange={(e) => updateField('ogDescription', e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="Defaults to SEO Description if empty"
          />
          <Box>
            <TextField
              label="OG Image URL"
              size="small"
              value={formData.ogImage || ''}
              onChange={(e) => updateField('ogImage', e.target.value)}
              fullWidth
              placeholder="Defaults to first gallery image if empty"
              helperText="Recommended size: 1200x630px for optimal social sharing"
            />
            <ImageUrlHelperText fieldType="ogImage" />
          </Box>
        </Box>
      </Paper>

      {/* Twitter Card */}
      <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #E5E7EB' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Icon icon="mdi:twitter" style={{ fontSize: 20, color: '#C9A86C' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
            Twitter Card
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {['summary', 'summary_large_image'].map((type) => (
            <Chip
              key={type}
              label={type}
              clickable
              onClick={() => updateField('twitterCard', type)}
              sx={{
                fontWeight: 500,
                bgcolor: formData.twitterCard === type ? '#1B2A4A' : '#F3F4F6',
                color: formData.twitterCard === type ? '#fff' : '#6B7280',
              }}
            />
          ))}
        </Box>
      </Paper>

      {/* Schema Markup */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
            JSON-LD Schema Markup
          </Typography>
          {formData.schemaMarkup && (
            validateSchema(formData.schemaMarkup)
              ? <Chip label="Valid JSON" size="small" sx={{ height: 18, fontSize: '0.625rem', bgcolor: '#ECFDF5', color: '#059669' }} />
              : <Chip label="Invalid JSON" size="small" sx={{ height: 18, fontSize: '0.625rem', bgcolor: '#FEF2F2', color: '#DC2626' }} />
          )}
        </Box>
        <TextField
          value={formData.schemaMarkup}
          onChange={(e) => updateField('schemaMarkup', e.target.value)}
          multiline
          rows={6}
          fullWidth
          error={!!formData.schemaMarkup && !validateSchema(formData.schemaMarkup)}
          helperText={
            formData.schemaMarkup && !validateSchema(formData.schemaMarkup)
              ? 'Invalid JSON format (will still be saved)'
              : 'Use RealEstateListing type with @context, address, and pricing for best rich results'
          }
          InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8125rem' } }}
        />
      </Box>

      {/* Property Tags */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A', mb: 1.5 }}>
          Property Tags
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {TAG_OPTIONS.map((tag) => {
            const selected = formData.tags.includes(tag.value);
            return (
              <Chip
                key={tag.value}
                icon={<Icon icon={tag.icon} style={{ fontSize: 16, color: selected ? tag.color : '#9CA3AF' }} />}
                label={tag.label}
                clickable
                onClick={() => toggleTag(tag.value)}
                sx={{
                  fontWeight: 600,
                  bgcolor: selected ? tag.bg : '#F3F4F6',
                  color: selected ? tag.color : '#9CA3AF',
                  border: selected ? `1px solid ${tag.color}` : '1px solid transparent',
                  '&:hover': { opacity: 0.85 },
                }}
              />
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default SeoTagsTab;
