import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  LinearProgress,
  Skeleton,
  useMediaQuery,
  useTheme,
  InputAdornment,
  IconButton,
  Tooltip,
  Collapse,
} from '@mui/material';
import { Icon } from '@iconify/react';
import seoService from '../../services/seoService';
import { calculateSeoScore, getQuickScore, SEO_LIMITS } from '../../utils/seoScoring';
import { generateSeoData } from '../../utils/seoGenerator';
import SeoGuidelines from '../../components/admin/SeoGuidelines';

// ─── Score Bar Component ──────────────────────────────────────
const SeoScoreBar = ({ score, grade }) => {
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
      <LinearProgress
        variant="determinate"
        value={score}
        sx={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          bgcolor: '#F3F4F6',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
        }}
      />
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color, minWidth: 40 }}>
        {score}%{grade ? ` ${grade}` : ''}
      </Typography>
    </Box>
  );
};

// ─── Status Dot Component ─────────────────────────────────────
const StatusDot = ({ hasValue, label }) => (
  <Tooltip title={hasValue ? `${label} set` : `${label} missing`} arrow>
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: hasValue ? '#10B981' : '#EF4444',
        display: 'inline-block',
      }}
    />
  </Tooltip>
);

// ─── Google Preview Component ─────────────────────────────────
const GooglePreview = ({ title, description, slug }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      borderRadius: 2,
      bgcolor: '#FAFAFA',
      border: '1px solid #E5E7EB',
    }}
  >
    <Typography sx={{ fontSize: '0.6875rem', color: '#9CA3AF', mb: 0.5 }}>
      Google Search Preview
    </Typography>
    <Typography
      sx={{
        fontSize: '1.125rem',
        color: '#1a0dab',
        fontFamily: 'arial, sans-serif',
        lineHeight: 1.3,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {title || 'Page Title — Site Name'}
    </Typography>
    <Typography
      sx={{
        fontSize: '0.8125rem',
        color: '#006621',
        fontFamily: 'arial, sans-serif',
        mt: 0.25,
      }}
    >
      homadvisory.com/properties/{slug || 'property-slug'}
    </Typography>
    <Typography
      sx={{
        fontSize: '0.8125rem',
        color: '#545454',
        fontFamily: 'arial, sans-serif',
        mt: 0.25,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {description || 'Meta description will appear here. Add a compelling description to improve click-through rates.'}
    </Typography>
  </Paper>
);

// ─── SEO Score Breakdown Component ────────────────────────────
const SeoScoreBreakdown = ({ scoreData }) => {
  if (!scoreData) return null;

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, borderRadius: 2, border: '1px solid #E5E7EB' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
          SEO Score Breakdown
        </Typography>
        <Chip
          label={`${scoreData.totalScore}/100 — Grade ${scoreData.grade}`}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: '0.6875rem',
            bgcolor: scoreData.totalScore >= 80 ? '#ECFDF5' : scoreData.totalScore >= 60 ? '#FFFBEB' : '#FEF2F2',
            color: scoreData.totalScore >= 80 ? '#059669' : scoreData.totalScore >= 60 ? '#D97706' : '#DC2626',
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {scoreData.checks.map((check, idx) => (
          <Box key={idx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
              <Typography sx={{ fontSize: '0.75rem', color: '#4B5563' }}>
                {check.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: check.score === check.maxScore ? '#10B981' : check.score > 0 ? '#F59E0B' : '#EF4444',
                }}
              >
                {check.score}/{check.maxScore}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={check.maxScore > 0 ? (check.score / check.maxScore) * 100 : 0}
              sx={{
                height: 4,
                borderRadius: 2,
                bgcolor: '#F3F4F6',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2,
                  bgcolor: check.score === check.maxScore ? '#10B981' : check.score > 0 ? '#F59E0B' : '#EF4444',
                },
              }}
            />
            {check.issues.length > 0 && (
              <Box sx={{ mt: 0.5 }}>
                {check.issues.map((issue, issueIdx) => (
                  <Typography key={issueIdx} sx={{ fontSize: '0.6875rem', color: '#9CA3AF', pl: 1 }}>
                    — {issue}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

// ─── Main AdminSeo Component ──────────────────────────────────
const AdminSeo = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editProperty, setEditProperty] = useState(null);
  const [editForm, setEditForm] = useState({
    seoTitle: '',
    seoDescription: '',
    seoKeywords: [],
    canonicalUrl: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    twitterCard: 'summary_large_image',
    schemaMarkup: '',
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);

  // ─── Fetch Properties via SEO Service ─────────────────────
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const data = await seoService.getAllProperties();
      setProperties(Array.isArray(data) ? data : []);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load properties', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // ─── Filtered & Paginated Data ────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return properties;
    const q = search.toLowerCase();
    return properties.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.seoTitle?.toLowerCase().includes(q) ||
        p.location?.area?.toLowerCase().includes(q) ||
        p.location?.city?.toLowerCase().includes(q)
    );
  }, [properties, search]);

  const paginated = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage]
  );

  // ─── Stats Calculation ────────────────────────────────────
  const stats = useMemo(() => {
    const total = properties.length;
    const scores = properties.map((p) => getQuickScore(p));
    const complete = scores.filter((s) => s >= 90).length;
    const partial = scores.filter((s) => s > 0 && s < 90).length;
    const missing = scores.filter((s) => s === 0).length;
    const avgScore = total > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / total) : 0;
    return { total, complete, partial, missing, avgScore };
  }, [properties]);

  // ─── Live Score for Edit Form ─────────────────────────────
  const editScoreData = useMemo(() => {
    if (!editProperty) return null;
    const merged = { ...editProperty, ...editForm };
    return calculateSeoScore(merged);
  }, [editProperty, editForm]);

  // ─── Edit Dialog Handlers ─────────────────────────────────
  const handleOpenEdit = (property) => {
    setEditProperty(property);
    setEditForm({
      seoTitle: property.seoTitle || '',
      seoDescription: property.seoDescription || '',
      seoKeywords: property.seoKeywords || [],
      canonicalUrl: property.canonicalUrl || '',
      ogTitle: property.ogTitle || '',
      ogDescription: property.ogDescription || '',
      ogImage: property.ogImage || '',
      twitterCard: property.twitterCard || 'summary_large_image',
      schemaMarkup: property.schemaMarkup || '',
    });
    setKeywordInput('');
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editProperty) return;
    setSaving(true);
    try {
      const propertyId = editProperty.propertyId || editProperty.id;
      await seoService.updatePropertySeo(propertyId, editForm);
      setProperties((prev) =>
        prev.map((p) =>
          (p.propertyId || p.id) === propertyId ? { ...p, ...editForm } : p
        )
      );
      setSnackbar({ open: true, message: 'SEO data saved successfully', severity: 'success' });
      setEditDialogOpen(false);
    } catch {
      setSnackbar({ open: true, message: 'Failed to save SEO data', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAutoGenerate = () => {
    if (!editProperty) return;
    const generated = generateSeoData(editProperty);
    setEditForm(generated);
  };

  const handleAddKeyword = () => {
    const kw = keywordInput.trim().toLowerCase();
    if (kw && !editForm.seoKeywords.includes(kw)) {
      setEditForm((prev) => ({
        ...prev,
        seoKeywords: [...prev.seoKeywords, kw],
      }));
    }
    setKeywordInput('');
  };

  const handleRemoveKeyword = (kw) => {
    setEditForm((prev) => ({
      ...prev,
      seoKeywords: prev.seoKeywords.filter((k) => k !== kw),
    }));
  };

  // ─── Bulk Auto-Generate ───────────────────────────────────
  const handleBulkAutoGenerate = async () => {
    setBulkGenerating(true);
    try {
      const updates = await seoService.bulkAutoGenerate(properties, calculateSeoScore);
      if (updates.length === 0) {
        setSnackbar({ open: true, message: 'All properties already have complete SEO data', severity: 'info' });
      } else {
        setProperties((prev) =>
          prev.map((p) => {
            const u = updates.find((upd) => upd.id === p.id);
            return u ? { ...p, ...u } : p;
          })
        );
        setSnackbar({
          open: true,
          message: `Auto-generated SEO for ${updates.length} properties`,
          severity: 'success',
        });
      }
    } catch {
      setSnackbar({ open: true, message: 'Failed to auto-generate SEO data', severity: 'error' });
    } finally {
      setBulkGenerating(false);
    }
  };

  // ─── Title / Description length color helpers ─────────────
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

  // ─── Stat Cards ───────────────────────────────────────────
  const statCards = [
    { label: 'Total Properties', value: stats.total, icon: 'mdi:home-city-outline', color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'SEO Complete', value: stats.complete, icon: 'mdi:check-circle-outline', color: '#10B981', bg: '#ECFDF5' },
    { label: 'Partial SEO', value: stats.partial, icon: 'mdi:alert-circle-outline', color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Avg SEO Score', value: `${stats.avgScore}%`, icon: 'mdi:chart-line', color: '#8B5CF6', bg: '#F5F3FF' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B2A4A' }}>
            SEO Manager
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', mt: 0.5 }}>
            Manage SEO metadata for all property listings
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Icon icon="mdi:school-outline" />}
            onClick={() => setShowGuidelines((prev) => !prev)}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              borderColor: '#D1D5DB',
              color: '#374151',
              '&:hover': { borderColor: '#C9A86C', color: '#C9A86C' },
            }}
          >
            {showGuidelines ? 'Hide Guide' : 'SEO Guide'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Icon icon="mdi:auto-fix" />}
            onClick={handleBulkAutoGenerate}
            disabled={bulkGenerating || loading}
            sx={{
              bgcolor: '#1B2A4A',
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              '&:hover': { bgcolor: '#2d3f63' },
            }}
          >
            {bulkGenerating ? 'Generating...' : 'Auto-Generate Missing SEO'}
          </Button>
        </Box>
      </Box>

      {/* SEO Guidelines Panel (Collapsible) */}
      <Collapse in={showGuidelines}>
        <Box sx={{ mb: 3 }}>
          <SeoGuidelines />
        </Box>
      </Collapse>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {statCards.map((stat) => (
          <Paper
            key={stat.label}
            elevation={0}
            sx={{ p: 2.5, borderRadius: 2, border: '1px solid #F3F4F6' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: stat.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon icon={stat.icon} style={{ fontSize: 20, color: stat.color }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#1B2A4A' }}>
                  {loading ? <Skeleton width={40} /> : stat.value}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{stat.label}</Typography>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Search */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #F3F4F6', mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search properties by name, location, or city..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Icon icon="mdi:magnify" style={{ color: '#9CA3AF' }} />
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Paper>

      {/* Table */}
      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 3 }}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} height={56} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : isMobile ? (
          /* Mobile Card View */
          <Box sx={{ p: 2 }}>
            {paginated.map((property) => {
              const scoreData = calculateSeoScore(property);
              return (
                <Paper
                  key={property.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': { borderColor: '#C9A86C' },
                  }}
                  onClick={() => handleOpenEdit(property)}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1B2A4A', flex: 1 }}>
                      {property.title}
                    </Typography>
                    <Chip
                      label={scoreData.grade}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.625rem',
                        height: 20,
                        bgcolor: scoreData.totalScore >= 80 ? '#ECFDF5' : scoreData.totalScore >= 60 ? '#FFFBEB' : '#FEF2F2',
                        color: scoreData.totalScore >= 80 ? '#059669' : scoreData.totalScore >= 60 ? '#D97706' : '#DC2626',
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <StatusDot hasValue={!!property.seoTitle?.trim()} label="Title" />
                      <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>Title</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <StatusDot hasValue={!!property.seoDescription?.trim()} label="Description" />
                      <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>Desc</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <StatusDot hasValue={property.seoKeywords?.length > 0} label="Keywords" />
                      <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        Keywords ({property.seoKeywords?.length || 0})
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <StatusDot hasValue={!!property.schemaMarkup?.trim()} label="Schema" />
                      <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>Schema</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <StatusDot hasValue={!!property.canonicalUrl?.trim()} label="Canonical" />
                      <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>Canonical</Typography>
                    </Box>
                  </Box>
                  <SeoScoreBar score={scoreData.totalScore} grade={scoreData.grade} />
                </Paper>
              );
            })}
          </Box>
        ) : (
          /* Desktop Table View */
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }}>Property</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }}>SEO Title</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }} align="center">Desc</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }} align="center">Keywords</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }} align="center">Schema</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }} align="center">Canonical</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }}>SEO Score</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((property) => {
                  const scoreData = calculateSeoScore(property);
                  return (
                    <TableRow
                      key={property.id}
                      hover
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(201,168,108,0.04)' } }}
                      onClick={() => handleOpenEdit(property)}
                    >
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1B2A4A' }}>
                          {property.title}
                        </Typography>
                        <Typography sx={{ fontSize: '0.6875rem', color: '#9CA3AF' }}>
                          {property.location?.area}, {property.location?.city}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <StatusDot hasValue={!!property.seoTitle?.trim()} label="Title" />
                          <Typography
                            sx={{
                              fontSize: '0.75rem',
                              color: property.seoTitle?.trim() ? '#374151' : '#EF4444',
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {property.seoTitle?.trim() || 'Not set'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <StatusDot hasValue={!!property.seoDescription?.trim()} label="Description" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={property.seoKeywords?.length || 0}
                          size="small"
                          sx={{
                            fontSize: '0.6875rem',
                            height: 22,
                            bgcolor: property.seoKeywords?.length > 0 ? '#ECFDF5' : '#FEF2F2',
                            color: property.seoKeywords?.length > 0 ? '#10B981' : '#EF4444',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <StatusDot hasValue={!!property.schemaMarkup?.trim()} label="Schema" />
                      </TableCell>
                      <TableCell align="center">
                        <StatusDot hasValue={!!property.canonicalUrl?.trim()} label="Canonical" />
                      </TableCell>
                      <TableCell>
                        <SeoScoreBar score={scoreData.totalScore} grade={scoreData.grade} />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(property); }}
                        >
                          <Icon icon="mdi:pencil-outline" style={{ fontSize: 18, color: '#6B7280' }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <Icon icon="mdi:magnify" style={{ fontSize: 40, color: '#D1D5DB' }} />
                      <Typography sx={{ color: '#9CA3AF', mt: 1 }}>No properties found</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
          sx={{ borderTop: '1px solid #F3F4F6' }}
        />
      </Paper>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #F3F4F6',
            pb: 2,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#1B2A4A' }}>
              Edit SEO — {editProperty?.title}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mt: 0.25 }}>
              {editProperty?.location?.area}, {editProperty?.location?.city}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<Icon icon="mdi:auto-fix" />}
              onClick={handleAutoGenerate}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              Auto-Generate
            </Button>
            <IconButton size="small" onClick={() => setEditDialogOpen(false)}>
              <Icon icon="mdi:close" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          {/* Google Preview */}
          <Box sx={{ mb: 3 }}>
            <GooglePreview
              title={editForm.seoTitle}
              description={editForm.seoDescription}
              slug={editProperty?.slug}
            />
          </Box>

          {/* Live Score Breakdown */}
          <Box sx={{ mb: 3 }}>
            <SeoScoreBreakdown scoreData={editScoreData} />
          </Box>

          {/* SEO Title */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', mb: 1 }}>
              SEO Title
              <Typography
                component="span"
                sx={{ fontSize: '0.6875rem', color: getTitleLenColor(editForm.seoTitle.length), ml: 1 }}
              >
                {editForm.seoTitle.length}/{SEO_LIMITS.TITLE_OPTIMAL_MAX} characters
                {editForm.seoTitle.length > 0 && editForm.seoTitle.length < SEO_LIMITS.TITLE_OPTIMAL_MIN && ' (too short)'}
                {editForm.seoTitle.length > SEO_LIMITS.TITLE_MAX_LENGTH && ' (too long)'}
                {editForm.seoTitle.length >= SEO_LIMITS.TITLE_OPTIMAL_MIN && editForm.seoTitle.length <= SEO_LIMITS.TITLE_OPTIMAL_MAX && ' (optimal)'}
              </Typography>
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={editForm.seoTitle}
              onChange={(e) => setEditForm((prev) => ({ ...prev, seoTitle: e.target.value }))}
              placeholder="Enter SEO title for this property..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>

          {/* SEO Description */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', mb: 1 }}>
              SEO Description
              <Typography
                component="span"
                sx={{ fontSize: '0.6875rem', color: getDescLenColor(editForm.seoDescription.length), ml: 1 }}
              >
                {editForm.seoDescription.length}/{SEO_LIMITS.DESC_OPTIMAL_MAX} characters
                {editForm.seoDescription.length > 0 && editForm.seoDescription.length < SEO_LIMITS.DESC_OPTIMAL_MIN && ' (too short)'}
                {editForm.seoDescription.length > SEO_LIMITS.DESC_MAX_LENGTH && ' (too long)'}
                {editForm.seoDescription.length >= SEO_LIMITS.DESC_OPTIMAL_MIN && editForm.seoDescription.length <= SEO_LIMITS.DESC_OPTIMAL_MAX && ' (optimal)'}
              </Typography>
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={3}
              value={editForm.seoDescription}
              onChange={(e) => setEditForm((prev) => ({ ...prev, seoDescription: e.target.value }))}
              placeholder="Enter SEO description..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>

          {/* Canonical URL */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', mb: 1 }}>
              Canonical URL
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={editForm.canonicalUrl}
              onChange={(e) => setEditForm((prev) => ({ ...prev, canonicalUrl: e.target.value }))}
              placeholder="https://homadvisory.com/properties/property-slug"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>

          {/* Keywords */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', mb: 1 }}>
              Keywords ({editForm.seoKeywords.length})
              <Typography component="span" sx={{ fontSize: '0.6875rem', color: '#9CA3AF', ml: 1 }}>
                Recommended: {SEO_LIMITS.MIN_KEYWORDS}-{SEO_LIMITS.MAX_KEYWORDS} keywords
              </Typography>
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
              <TextField
                size="small"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Add a keyword..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
                sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <Button
                variant="outlined"
                onClick={handleAddKeyword}
                sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#D1D5DB', color: '#374151' }}
              >
                Add
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {editForm.seoKeywords.map((kw) => (
                <Chip
                  key={kw}
                  label={kw}
                  size="small"
                  onDelete={() => handleRemoveKeyword(kw)}
                  sx={{
                    fontSize: '0.75rem',
                    bgcolor: '#F3F4F6',
                    '& .MuiChip-deleteIcon': { fontSize: 16 },
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Open Graph Section */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3, border: '1px solid #E5E7EB' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Icon icon="mdi:share-variant" style={{ fontSize: 18, color: '#C9A86C' }} />
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
                Open Graph Tags
              </Typography>
              <Typography sx={{ fontSize: '0.6875rem', color: '#9CA3AF' }}>
                (For social media sharing)
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                size="small"
                label="OG Title"
                fullWidth
                value={editForm.ogTitle}
                onChange={(e) => setEditForm((prev) => ({ ...prev, ogTitle: e.target.value }))}
                placeholder="Defaults to SEO Title if empty"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                size="small"
                label="OG Description"
                fullWidth
                multiline
                rows={2}
                value={editForm.ogDescription}
                onChange={(e) => setEditForm((prev) => ({ ...prev, ogDescription: e.target.value }))}
                placeholder="Defaults to SEO Description if empty"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                size="small"
                label="OG Image URL"
                fullWidth
                value={editForm.ogImage}
                onChange={(e) => setEditForm((prev) => ({ ...prev, ogImage: e.target.value }))}
                placeholder="Defaults to first gallery image if empty"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Box>
          </Paper>

          {/* Twitter Card Section */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3, border: '1px solid #E5E7EB' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Icon icon="mdi:twitter" style={{ fontSize: 18, color: '#C9A86C' }} />
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
                Twitter Card
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['summary', 'summary_large_image'].map((type) => (
                <Chip
                  key={type}
                  label={type}
                  clickable
                  onClick={() => setEditForm((prev) => ({ ...prev, twitterCard: type }))}
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    bgcolor: editForm.twitterCard === type ? '#1B2A4A' : '#F3F4F6',
                    color: editForm.twitterCard === type ? '#fff' : '#6B7280',
                  }}
                />
              ))}
            </Box>
          </Paper>

          {/* Schema Markup */}
          <Box>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', mb: 1 }}>
              Schema Markup (JSON-LD)
              {editForm.schemaMarkup && (() => {
                try { JSON.parse(editForm.schemaMarkup); return <Chip label="Valid JSON" size="small" sx={{ ml: 1, height: 18, fontSize: '0.625rem', bgcolor: '#ECFDF5', color: '#059669' }} />; }
                catch { return <Chip label="Invalid JSON" size="small" sx={{ ml: 1, height: 18, fontSize: '0.625rem', bgcolor: '#FEF2F2', color: '#DC2626' }} />; }
              })()}
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={8}
              value={editForm.schemaMarkup}
              onChange={(e) => setEditForm((prev) => ({ ...prev, schemaMarkup: e.target.value }))}
              placeholder='{"@context":"https://schema.org","@type":"RealEstateListing",...}'
              InputProps={{
                sx: { fontFamily: 'monospace', fontSize: '0.8125rem' },
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #F3F4F6' }}>
          <Button
            onClick={() => setEditDialogOpen(false)}
            sx={{ textTransform: 'none', color: '#6B7280' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{
              textTransform: 'none',
              bgcolor: '#1B2A4A',
              borderRadius: 2,
              px: 4,
              '&:hover': { bgcolor: '#2d3f63' },
            }}
          >
            {saving ? 'Saving...' : 'Save SEO Data'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminSeo;
