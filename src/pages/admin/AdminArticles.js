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
  Skeleton,
  Switch,
  useMediaQuery,
  useTheme,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Icon } from '@iconify/react';
import articleService from '../../services/articleService';
import { toLegacyArticles } from '../../utils/adapters/legacyArticle';
import { useToast } from '../../components/common/ToastProvider';
import { toneStyles } from '../../components/ui/tones';
import {
  ARTICLE_CATEGORIES,
  ARTICLE_CATEGORY_TONES as categoryTones,
} from '../../config/adminConstants';

// Add 'All' option for filter view
const categories = [{ value: '', label: 'All Categories' }, ...ARTICLE_CATEGORIES];

const AdminArticles = () => {
  const toast = useToast();
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

  /**
   * The admin list includes drafts and scheduled pieces. The rows still read
   * the boilerplate's flat field names, so `toLegacyArticle` bridges them
   * until prompt 33 rewrites this screen.
   */
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await articleService.adminList({ perPage: 100 });
      setArticles(toLegacyArticles(data));
    } catch (thrown) {
      toast.error(thrown?.message || 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
      const status = article.isActive ? 'draft' : 'published';
      await articleService.patch(article.id, { status });
      setArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, status, isActive: !a.isActive } : a))
      );
      toast.success(`Article ${!article.isActive ? 'published' : 'unpublished'}`);
    } catch {
      toast.error('Failed to update article status');
    }
  };

  const handleToggleTrending = async (article) => {
    // Trending is `isFeatured` in the contract; the order is the API's (§6.8).
    const nowTrending = !article.isFeatured;
    try {
      await articleService.patch(article.id, { isFeatured: nowTrending });
      setArticles((prev) =>
        prev.map((a) =>
          a.id === article.id ? { ...a, isFeatured: nowTrending, isTrending: nowTrending } : a
        )
      );
      toast.success(nowTrending ? 'Article marked as trending' : 'Article removed from trending');
    } catch {
      toast.error('Failed to update trending status');
    }
  };

  const handleDelete = async () => {
    const { article } = deleteDialog;
    if (!article) return;
    try {
      await articleService.remove(article.id);
      setArticles((prev) => prev.filter((a) => a.id !== article.id));
      toast.success('Article deleted');
    } catch {
      toast.error('Failed to delete article');
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

  const stats = useMemo(
    () => ({
      total: articles.length,
      published: articles.filter((a) => a.isActive).length,
      draft: articles.filter((a) => !a.isActive).length,
    }),
    [articles]
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-charcoal)' }}>
            Articles
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', mt: 0.5 }}>
            {stats.total} articles ({stats.published} published, {stats.draft} drafts)
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Icon icon="mdi:plus" />}
          onClick={() => navigate('/admin/articles/add')}
          sx={{
            bgcolor: 'var(--color-charcoal)',
            textTransform: 'none',
            borderRadius: 2,
            px: 3,
            '&:hover': { bgcolor: 'var(--color-charcoal)' },
          }}
        >
          Add Article
        </Button>
      </Box>

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{ p: 2, borderRadius: 2, border: '1px solid var(--color-surface)', mb: 3 }}
      >
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Icon icon="mdi:magnify" style={{ color: 'var(--color-text-muted)' }} />
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
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
              sx={{ borderRadius: 2 }}
            >
              {categories.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
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
              sx={{ textTransform: 'none', color: 'var(--color-error-dark)' }}
            >
              Clear
            </Button>
          )}
        </Box>
      </Paper>

      {/* Table */}
      <Paper
        elevation={0}
        sx={{ borderRadius: 2, border: '1px solid var(--color-surface)', overflow: 'hidden' }}
      >
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
              const catStyle = toneStyles(categoryTones[article.category]);
              return (
                <Paper key={article.id} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--color-charcoal)',
                        flex: 1,
                      }}
                    >
                      {article.title}
                    </Typography>
                    <Chip
                      label={article.isActive ? 'Published' : 'Draft'}
                      size="small"
                      sx={{
                        fontSize: '0.6875rem',
                        height: 22,
                        bgcolor: article.isActive
                          ? 'var(--color-success-bg)'
                          : 'var(--color-error-bg)',
                        color: article.isActive
                          ? 'var(--color-success-dark)'
                          : 'var(--color-error-dark)',
                        ml: 1,
                      }}
                    />
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      mb: 1.5,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Chip
                      label={article.category?.replace(/-/g, ' ')}
                      size="small"
                      sx={{
                        fontSize: '0.625rem',
                        height: 20,
                        bgcolor: catStyle.background,
                        color: catStyle.color,
                        textTransform: 'capitalize',
                      }}
                    />
                    {article.isFeatured && (
                      <Chip
                        label="Trending"
                        size="small"
                        sx={{
                          fontSize: '0.625rem',
                          height: 20,
                          bgcolor: 'var(--color-warning-bg)',
                          color: 'var(--color-warning-dark)',
                        }}
                      />
                    )}
                    <Typography sx={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                      {article.author}
                    </Typography>
                    <Typography sx={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                      {new Date(article.publishedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
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
                      sx={{
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        color: article.isFeatured ? 'var(--color-warning-dark)' : undefined,
                      }}
                    >
                      {article.isFeatured ? 'Untrend' : 'Trend'}
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
                <TableRow sx={{ bgcolor: 'var(--color-surface)' }}>
                  <TableCell
                    sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                  >
                    Title
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                  >
                    Category
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                    align="center"
                  >
                    Status
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                    align="center"
                  >
                    Trending
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                  >
                    Author
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                  >
                    Date
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                    align="center"
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((article) => {
                  const catStyle = toneStyles(categoryTones[article.category]);
                  return (
                    <TableRow
                      key={article.id}
                      hover
                      sx={{ '&:hover': { bgcolor: 'rgba(201,168,108,0.04)' } }}
                    >
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: 'var(--color-charcoal)',
                          }}
                        >
                          {article.title}
                        </Typography>
                        <Typography
                          sx={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}
                        >
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
                            bgcolor: catStyle.background,
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
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: 'var(--color-success-dark)',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              bgcolor: 'var(--color-success)',
                            },
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: '0.625rem',
                            color: article.isActive
                              ? 'var(--color-success-dark)'
                              : 'var(--color-text-muted)',
                          }}
                        >
                          {article.isActive ? 'Published' : 'Draft'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={!!article.isFeatured}
                          onChange={() => handleToggleTrending(article)}
                          size="small"
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: 'var(--color-warning-dark)',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              bgcolor: 'var(--color-warning)',
                            },
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: '0.625rem',
                            color: article.isFeatured
                              ? 'var(--color-warning-dark)'
                              : 'var(--color-text-muted)',
                          }}
                        >
                          {article.isFeatured ? 'Yes' : 'No'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8125rem', color: 'var(--color-text)' }}>
                          {article.author}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8125rem', color: 'var(--color-text)' }}>
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
                            <Icon
                              icon="mdi:pencil-outline"
                              style={{ fontSize: 18, color: 'var(--color-text-muted)' }}
                            />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => setDeleteDialog({ open: true, article })}
                          >
                            <Icon
                              icon="mdi:delete-outline"
                              style={{ fontSize: 18, color: 'var(--color-error-dark)' }}
                            />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Icon
                        icon="mdi:newspaper-variant-outline"
                        style={{ fontSize: 40, color: 'var(--color-text-muted)' }}
                      />
                      <Typography sx={{ color: 'var(--color-text-muted)', mt: 1 }}>
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
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
          sx={{ borderTop: '1px solid var(--color-surface)' }}
        />
      </Paper>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, article: null })}
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-charcoal)' }}>
            Delete Article
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Are you sure you want to delete "{deleteDialog.article?.title}"? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, article: null })}
            sx={{ textTransform: 'none', color: 'var(--color-text-muted)' }}
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
    </Box>
  );
};

export default AdminArticles;
