import React, { useState, useEffect, useCallback } from 'react';
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
  IconButton,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { faqService } from '../../services/api';
import { useToast } from '../../components/common/ToastProvider';
import { toneStyles } from '../../components/ui/tones';
import {
  FAQ_CATEGORIES as faqCategories,
  FAQ_CATEGORY_TONES as categoryTones,
} from '../../config/adminConstants';

const emptyFaq = {
  question: '',
  answer: '',
  category: 'general',
  order: 1,
  isActive: true,
};

const FaqManager = () => {
  const toast = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [form, setForm] = useState(emptyFaq);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, faq: null });
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await faqService.getAll();
      const sorted = (Array.isArray(data) ? data : []).sort(
        (a, b) => (a.order || 0) - (b.order || 0)
      );
      setFaqs(sorted);
    } catch {
      toast.error('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const filteredFaqs = categoryFilter ? faqs.filter((f) => f.category === categoryFilter) : faqs;

  const handleOpenAdd = () => {
    setEditingFaq(null);
    setForm({ ...emptyFaq, order: faqs.length + 1 });
    setDialogOpen(true);
  };

  const handleOpenEdit = (faq) => {
    setEditingFaq(faq);
    setForm({
      question: faq.question || '',
      answer: faq.answer || '',
      category: faq.category || 'general',
      order: faq.order || 1,
      isActive: faq.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error('Question and answer are required');
      return;
    }

    setSaving(true);
    try {
      if (editingFaq) {
        const updated = await faqService.update(editingFaq.id, form);
        setFaqs((prev) =>
          prev
            .map((f) => (f.id === editingFaq.id ? { ...f, ...updated } : f))
            .sort((a, b) => (a.order || 0) - (b.order || 0))
        );
        toast.success('FAQ updated');
      } else {
        const created = await faqService.create(form);
        setFaqs((prev) => [...prev, created].sort((a, b) => (a.order || 0) - (b.order || 0)));
        toast.success('FAQ added');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Failed to save FAQ');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (faq) => {
    try {
      await faqService.update(faq.id, { isActive: !faq.isActive });
      setFaqs((prev) => prev.map((f) => (f.id === faq.id ? { ...f, isActive: !f.isActive } : f)));
      toast.success(`FAQ ${!faq.isActive ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to update FAQ');
    }
  };

  const handleDelete = async () => {
    const { faq } = deleteDialog;
    if (!faq) return;
    try {
      await faqService.delete(faq.id);
      setFaqs((prev) => prev.filter((f) => f.id !== faq.id));
      toast.success('FAQ deleted');
    } catch {
      toast.error('Failed to delete FAQ');
    } finally {
      setDeleteDialog({ open: false, faq: null });
    }
  };

  const handleMoveOrder = async (faq, direction) => {
    const currentIndex = faqs.findIndex((f) => f.id === faq.id);
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= faqs.length) return;

    const swapFaq = faqs[swapIndex];
    try {
      await faqService.update(faq.id, { order: swapFaq.order });
      await faqService.update(swapFaq.id, { order: faq.order });
      setFaqs((prev) => {
        const updated = [...prev];
        const tempOrder = updated[currentIndex].order;
        updated[currentIndex] = { ...updated[currentIndex], order: updated[swapIndex].order };
        updated[swapIndex] = { ...updated[swapIndex], order: tempOrder };
        return updated.sort((a, b) => (a.order || 0) - (b.order || 0));
      });
    } catch {
      toast.error('Failed to reorder');
    }
  };

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
            FAQ Manager
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', mt: 0.5 }}>
            {faqs.length} FAQs ({faqs.filter((f) => f.isActive).length} active)
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Icon icon="mdi:plus" />}
          onClick={handleOpenAdd}
          sx={{
            bgcolor: 'var(--color-charcoal)',
            textTransform: 'none',
            borderRadius: 2,
            px: 3,
            '&:hover': { bgcolor: 'var(--color-charcoal)' },
          }}
        >
          Add FAQ
        </Button>
      </Box>

      {/* Category Filter */}
      <Paper
        elevation={0}
        sx={{ p: 2, borderRadius: 2, border: '1px solid var(--color-surface)', mb: 3 }}
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="All"
            onClick={() => setCategoryFilter('')}
            sx={{
              bgcolor: !categoryFilter ? 'var(--color-charcoal)' : 'var(--color-surface)',
              color: !categoryFilter ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
              fontWeight: 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              '&:hover': { opacity: 0.85 },
            }}
          />
          {faqCategories.map((cat) => {
            const style = toneStyles(categoryTones[cat.value]);
            const isSelected = categoryFilter === cat.value;
            return (
              <Chip
                key={cat.value}
                label={cat.label}
                onClick={() => setCategoryFilter(isSelected ? '' : cat.value)}
                sx={{
                  bgcolor: isSelected ? style.border : style.background,
                  color: isSelected ? 'var(--color-text-inverse)' : style.color,
                  fontWeight: 500,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.85 },
                }}
              />
            );
          })}
        </Box>
      </Paper>

      {/* FAQ List */}
      <Paper
        elevation={0}
        sx={{ borderRadius: 2, border: '1px solid var(--color-surface)', overflow: 'hidden' }}
      >
        {loading ? (
          <Box sx={{ p: 3 }}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} height={64} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : isMobile ? (
          /* Mobile Card View */
          <Box sx={{ p: 2 }}>
            {filteredFaqs.map((faq) => {
              const catStyle = toneStyles(categoryTones[faq.category]);
              return (
                <Paper
                  key={faq.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    opacity: faq.isActive ? 1 : 0.6,
                  }}
                >
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
                      {faq.question}
                    </Typography>
                    <Chip
                      label={`#${faq.order}`}
                      size="small"
                      sx={{
                        fontSize: '0.625rem',
                        height: 20,
                        bgcolor: 'var(--color-surface)',
                        ml: 1,
                      }}
                    />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      mb: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {faq.answer}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        label={faq.category?.replace(/-/g, ' ')}
                        size="small"
                        sx={{
                          fontSize: '0.625rem',
                          height: 20,
                          bgcolor: catStyle.background,
                          color: catStyle.color,
                          textTransform: 'capitalize',
                        }}
                      />
                      <Switch
                        checked={faq.isActive}
                        onChange={() => handleToggleActive(faq)}
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
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleOpenEdit(faq)}>
                        <Icon
                          icon="mdi:pencil-outline"
                          style={{ fontSize: 16, color: 'var(--color-text-muted)' }}
                        />
                      </IconButton>
                      <IconButton size="small" onClick={() => setDeleteDialog({ open: true, faq })}>
                        <Icon
                          icon="mdi:delete-outline"
                          style={{ fontSize: 16, color: 'var(--color-error-dark)' }}
                        />
                      </IconButton>
                    </Box>
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
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      width: 60,
                    }}
                    align="center"
                  >
                    Order
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                  >
                    Question
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
                    Active
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                    align="center"
                  >
                    Reorder
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
                {filteredFaqs.map((faq, index) => {
                  const catStyle = toneStyles(categoryTones[faq.category]);
                  return (
                    <TableRow
                      key={faq.id}
                      hover
                      sx={{
                        opacity: faq.isActive ? 1 : 0.55,
                        '&:hover': { bgcolor: 'rgba(201,168,108,0.04)' },
                      }}
                    >
                      <TableCell align="center">
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {faq.order}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: 'var(--color-charcoal)',
                          }}
                        >
                          {faq.question}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.6875rem',
                            color: 'var(--color-text-muted)',
                            maxWidth: 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {faq.answer}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={faq.category?.replace(/-/g, ' ')}
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
                          checked={faq.isActive}
                          onChange={() => handleToggleActive(faq)}
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
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            disabled={index === 0}
                            onClick={() => handleMoveOrder(faq, 'up')}
                          >
                            <Icon
                              icon="mdi:arrow-up"
                              style={{
                                fontSize: 16,
                                color:
                                  index === 0
                                    ? 'var(--color-text-muted)'
                                    : 'var(--color-text-muted)',
                              }}
                            />
                          </IconButton>
                          <IconButton
                            size="small"
                            disabled={index === filteredFaqs.length - 1}
                            onClick={() => handleMoveOrder(faq, 'down')}
                          >
                            <Icon
                              icon="mdi:arrow-down"
                              style={{
                                fontSize: 16,
                                color:
                                  index === filteredFaqs.length - 1
                                    ? 'var(--color-text-muted)'
                                    : 'var(--color-text-muted)',
                              }}
                            />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <IconButton size="small" onClick={() => handleOpenEdit(faq)}>
                            <Icon
                              icon="mdi:pencil-outline"
                              style={{ fontSize: 18, color: 'var(--color-text-muted)' }}
                            />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => setDeleteDialog({ open: true, faq })}
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
                {filteredFaqs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Icon
                        icon="mdi:help-circle-outline"
                        style={{ fontSize: 40, color: 'var(--color-text-muted)' }}
                      />
                      <Typography sx={{ color: 'var(--color-text-muted)', mt: 1 }}>
                        No FAQs found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid var(--color-surface)', pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-charcoal)' }}
            >
              {editingFaq ? 'Edit FAQ' : 'Add FAQ'}
            </Typography>
            <IconButton size="small" onClick={() => setDialogOpen(false)}>
              <Icon icon="mdi:close" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ mb: 2.5 }}>
            <Typography
              sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)', mb: 0.75 }}
            >
              Question *
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={form.question}
              onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
              placeholder="Enter the FAQ question..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>

          <Box sx={{ mb: 2.5 }}>
            <Typography
              sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)', mb: 0.75 }}
            >
              Answer *
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={5}
              value={form.answer}
              onChange={(e) => setForm((prev) => ({ ...prev, answer: e.target.value }))}
              placeholder="Enter the answer..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ flex: 1, minWidth: 140 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={form.category}
                label="Category"
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                sx={{ borderRadius: 2 }}
              >
                {faqCategories.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Order"
              type="number"
              value={form.order}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, order: parseInt(e.target.value, 10) || 1 }))
              }
              sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              inputProps={{ min: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid var(--color-surface)' }}>
          <Button
            onClick={() => setDialogOpen(false)}
            sx={{ textTransform: 'none', color: 'var(--color-text-muted)' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{
              textTransform: 'none',
              bgcolor: 'var(--color-charcoal)',
              borderRadius: 2,
              px: 4,
              '&:hover': { bgcolor: 'var(--color-charcoal)' },
            }}
          >
            {saving ? 'Saving...' : editingFaq ? 'Update FAQ' : 'Add FAQ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, faq: null })}
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-charcoal)' }}>
            Delete FAQ
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Are you sure you want to delete this FAQ? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, faq: null })}
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

export default FaqManager;
