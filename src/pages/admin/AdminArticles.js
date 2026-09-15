import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Skeleton,
  Switch,
  useMediaQuery,
  useTheme,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { articleService } from '../../services/api';
import {
  ARTICLE_CATEGORIES,
  ARTICLE_CATEGORY_COLORS as categoryColors,
} from '../../config/adminConstants';

// Add 'All' option for filter view
const categories = [{ value: '', label: 'All Categories' }, ...ARTICLE_CATEGORIES];

const AdminArticles = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, article: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await articleService.getAll();
      setArticles(Array.isArray(data) ? data : []);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load articles', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const filtered = useMemo(() => {
    let result = articles;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title?.toLowerCase().includes(q) ||
          a.author?.toLowerCase().includes(q) ||
          a.category?.toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      result = result.filter((a) => a.category === categoryFilter);
    }
    if (statusFilter === 'published') {
      result = result.filter((a) => a.isActive);
    } else if (statusFilter === 'draft') {
      result = result.filter((a) => !a.isActive);
    }
    return result;
  }, [articles, search, categoryFilter, statusFilter]);

  const paginated = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage]
  );

  const handleTogglePublish = async (article) => {
    try {
      await articleService.update(article.id, { isActive: !article.isActive });
      setArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, isActive: !a.isActive } : a))
      );
      setSnackbar({
        open: true,
        message: `Article ${!article.isActive ? 'published' : 'unpublished'}`,
        severity: 'success',
      });
    } catch {
      setSnackbar({ open: true, message: 'Failed to update article status', severity: 'error' });
    }
  };

  const handleToggleTrending = async (article) => {
    const nowTrending = !article.isTrending;
    // When marking as trending, assign next order; when unmarking, clear order
    const trendingOrder = nowTrending
      ? (Math.max(0, ...articles.filter((a) => a.isTrending).map((a) => a.trendingOrder ?? 0)) + 1)
      : null;
    try {
      await articleService.update(article.id, { isTrending: nowTrending, trendingOrder });
      setArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, isTrending: nowTrending, trendingOrder } : a))
      );
      setSnackbar({
        open: true,
        message: nowTrending ? 'Article marked as trending' : 'Article removed from trending',
        severity: 'success',
      });
    } catch {
      setSnackbar({ open: true, message: 'Failed to update trending status', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    const { article } = deleteDialog;
    if (!article) return;
    try {
      await articleService.delete(article.id);
      setArticles((prev) => prev.filter((a) => a.id !== article.id));
      setSnackbar({ open: true, message: 'Article deleted', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete article', severity: 'error' });
    } finally {
      setDeleteDialog({ open: false, article: null });
    }
  };

  const hasFilters = search || categoryFilter || statusFilter;

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('');
    setPage(0);
  };

  const stats = useMemo(() => ({
    total: articles.length,
    published: articles.filter((a) => a.isActive).length,
    draft: articles.filter((a) => !a.isActive).length,
  }), [articles]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B2A4A' }}>
            Articles
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', mt: 0.5 }}>
            {stats.total} articles ({stats.published} published, {stats.draft} drafts)
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Icon icon="mdi:plus" />}
          onClick={() => navigate('/admin/articles/add')}
          sx={{
            bgcolor: '#1B2A4A',
            textTransform: 'none',
            borderRadius: 2,
            px: 3,
            '&:hover': { bgcolor: '#2d3f63' },
          }}
        >
          Add Article
        </Button>
      </Box>

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #F3F4F6', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Icon icon="mdi:magnify" style={{ color: '#9CA3AF' }} />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
              sx={{ borderRadius: 2 }}
            >
              {categories.map((c) => (
                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
            </Select>
          </FormControl>
          {hasFilters && (
            <Button
              size="small"
              onClick={clearFilters}
              startIcon={<Icon icon="mdi:close" />}
              sx={{ textTransform: 'none', color: '#EF4444' }}
            >
              Clear
            </Button>
          )}
        </Box>
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
            {paginated.map((article) => {
              const catStyle = categoryColors[article.category] || { bg: '#F3F4F6', color: '#6B7280' };
              return (
                <Paper
                  key={article.id}
                  variant="outlined"
                  sx={{ p: 2, mb: 2, borderRadius: 2 }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1B2A4A', flex: 1 }}>
                      {article.title}
                    </Typography>
                    <Chip
                      label={article.isActive ? 'Published' : 'Draft'}
                      size="small"
                      sx={{
                        fontSize: '0.6875rem',
                        height: 22,
                        bgcolor: article.isActive ? '#ECFDF5' : '#FEF2F2',
                        color: article.isActive ? '#10B981' : '#EF4444',
                        ml: 1,
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip
                      label={article.category?.replace(/-/g, ' ')}
                      size="small"
                      sx={{ fontSize: '0.625rem', height: 20, bgcolor: catStyle.bg, color: catStyle.color, textTransform: 'capitalize' }}
                    />
                    {article.isTrending && (
                      <Chip
                        label={`Trending #${article.trendingOrder ?? ''}`}
                        size="small"
                        sx={{ fontSize: '0.625rem', height: 20, bgcolor: '#FFFBEB', color: '#F59E0B' }}
                      />
                    )}
                    <Typography sx={{ fontSize: '0.6875rem', color: '#9CA3AF' }}>
                      {article.author}
                    </Typography>
                    <Typography sx={{ fontSize: '0.6875rem', color: '#9CA3AF' }}>
                      {new Date(article.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      startIcon={<Icon icon="mdi:pencil-outline" />}
                      onClick={() => navigate(`/admin/articles/edit/${article.id}`)}
                      sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleTogglePublish(article)}
                      sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                    >
                      {article.isActive ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleToggleTrending(article)}
                      sx={{ textTransform: 'none', fontSize: '0.75rem', color: article.isTrending ? '#F59E0B' : undefined }}
                    >
                      {article.isTrending ? 'Untrend' : 'Trend'}
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => setDeleteDialog({ open: true, article })}
                      sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                    >
                      Delete
                    </Button>
                  </Box>
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
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }} align="center">Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }} align="center">Trending</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }}>Author</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((article) => {
                  const catStyle = categoryColors[article.category] || { bg: '#F3F4F6', color: '#6B7280' };
                  return (
                    <TableRow
                      key={article.id}
                      hover
                      sx={{ '&:hover': { bgcolor: 'rgba(201,168,108,0.04)' } }}
                    >
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1B2A4A' }}>
                          {article.title}
                        </Typography>
                        <Typography sx={{ fontSize: '0.6875rem', color: '#9CA3AF' }}>
                          /{article.slug}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={article.category?.replace(/-/g, ' ')}
                          size="small"
                          sx={{
                            fontSize: '0.6875rem',
                            height: 22,
                            bgcolor: catStyle.bg,
                            color: catStyle.color,
                            textTransform: 'capitalize',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={article.isActive}
                          onChange={() => handleTogglePublish(article)}
                          size="small"
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': { color: '#10B981' },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#10B981' },
                          }}
                        />
                        <Typography sx={{ fontSize: '0.625rem', color: article.isActive ? '#10B981' : '#9CA3AF' }}>
                          {article.isActive ? 'Published' : 'Draft'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={!!article.isTrending}
                          onChange={() => handleToggleTrending(article)}
                          size="small"
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': { color: '#F59E0B' },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#F59E0B' },
                          }}
                        />
                        <Typography sx={{ fontSize: '0.625rem', color: article.isTrending ? '#F59E0B' : '#9CA3AF' }}>
                          {article.isTrending ? `#${article.trendingOrder ?? ''}` : 'No'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8125rem', color: '#374151' }}>
                          {article.author}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8125rem', color: '#374151' }}>
                          {new Date(article.publishedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/admin/articles/edit/${article.id}`)}
                          >
                            <Icon icon="mdi:pencil-outline" style={{ fontSize: 18, color: '#6B7280' }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => setDeleteDialog({ open: true, article })}
                          >
                            <Icon icon="mdi:delete-outline" style={{ fontSize: 18, color: '#EF4444' }} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Icon icon="mdi:newspaper-variant-outline" style={{ fontSize: 40, color: '#D1D5DB' }} />
                      <Typography sx={{ color: '#9CA3AF', mt: 1 }}>
                        {hasFilters ? 'No articles match your filters' : 'No articles yet'}
                      </Typography>
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

      {/* Delete Confirmation */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, article: null })}
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1B2A4A' }}>
            Delete Article
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
            Are you sure you want to delete "{deleteDialog.article?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, article: null })}
            sx={{ textTransform: 'none', color: '#6B7280' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Delete
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

export default AdminArticles;
