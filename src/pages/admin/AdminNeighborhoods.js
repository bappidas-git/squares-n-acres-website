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
  IconButton,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { neighborhoodService } from '../../services/api';

const emptyNeighborhood = {
  name: '',
  image: '',
  propertyCount: 0,
  city: '',
  isActive: true,
};

const AdminNeighborhoods = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [neighborhoods, setNeighborhoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyNeighborhood);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchNeighborhoods = useCallback(async () => {
    setLoading(true);
    try {
      const data = await neighborhoodService.getAll();
      setNeighborhoods(Array.isArray(data) ? data : []);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load neighborhoods', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNeighborhoods();
  }, [fetchNeighborhoods]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({ ...emptyNeighborhood });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name || '',
      image: item.image || '',
      propertyCount: item.propertyCount ?? 0,
      city: item.city || '',
      isActive: item.isActive !== false,
    });
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setForm(emptyNeighborhood);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setSnackbar({ open: true, message: 'Neighborhood name is required', severity: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        image: form.image.trim(),
        propertyCount: Number(form.propertyCount) || 0,
        city: form.city.trim(),
        isActive: form.isActive,
      };

      if (editingItem) {
        await neighborhoodService.update(editingItem.id, payload);
        setSnackbar({ open: true, message: 'Neighborhood updated successfully', severity: 'success' });
      } else {
        await neighborhoodService.create(payload);
        setSnackbar({ open: true, message: 'Neighborhood created successfully', severity: 'success' });
      }

      handleClose();
      fetchNeighborhoods();
    } catch {
      setSnackbar({ open: true, message: 'Failed to save neighborhood', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const item = deleteDialog.item;
    if (!item) return;

    try {
      await neighborhoodService.delete(item.id);
      setSnackbar({ open: true, message: 'Neighborhood deleted', severity: 'success' });
      setDeleteDialog({ open: false, item: null });
      fetchNeighborhoods();
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete neighborhood', severity: 'error' });
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await neighborhoodService.update(item.id, { isActive: !item.isActive });
      fetchNeighborhoods();
    } catch {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    }
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Loading skeleton
  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Skeleton height={40} width={250} sx={{ mb: 3 }} />
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #F3F4F6' }}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} height={56} sx={{ mb: 1 }} />
          ))}
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B2A4A' }}>
            Neighborhoods
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', mt: 0.5 }}>
            Manage neighborhoods displayed on the homepage
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Icon icon="mdi:plus" />}
          onClick={handleOpenAdd}
          sx={{
            bgcolor: '#1B2A4A',
            textTransform: 'none',
            borderRadius: 2,
            px: 3,
            '&:hover': { bgcolor: '#2d3f63' },
          }}
        >
          Add Neighborhood
        </Button>
      </Box>

      {/* Table */}
      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
        {neighborhoods.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
            <Icon icon="mdi:map-marker-radius-outline" style={{ fontSize: 48, color: '#D1D5DB' }} />
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#6B7280', mt: 2 }}>
              No neighborhoods added yet
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: '#9CA3AF', mt: 0.5 }}>
              Add neighborhoods to display them on the homepage
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#6B7280' }}>Image</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#6B7280' }}>Name</TableCell>
                  {!isMobile && (
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#6B7280' }}>City</TableCell>
                  )}
                  {!isMobile && (
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#6B7280' }} align="center">
                      Properties
                    </TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#6B7280' }} align="center">
                    Active
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#6B7280' }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {neighborhoods.map((item) => (
                  <TableRow key={item.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ width: 64 }}>
                      <Box
                        component="img"
                        src={item.image || 'https://placehold.co/64x48/1B2A4A/white?text=N'}
                        alt={item.name}
                        sx={{
                          width: 64,
                          height: 48,
                          objectFit: 'cover',
                          borderRadius: 1,
                          bgcolor: '#F3F4F6',
                        }}
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/64x48/1B2A4A/white?text=N';
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1B2A4A' }}>
                        {item.name}
                      </Typography>
                      {isMobile && item.city && (
                        <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                          {item.city}
                        </Typography>
                      )}
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                          {item.city || '—'}
                        </Typography>
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell align="center">
                        <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                          {item.propertyCount ?? 0}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell align="center">
                      <Switch
                        checked={item.isActive !== false}
                        onChange={() => handleToggleActive(item)}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: '#10B981' },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#10B981' },
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEdit(item)}
                        sx={{ color: '#6B7280', mr: 0.5 }}
                      >
                        <Icon icon="mdi:pencil-outline" style={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setDeleteDialog({ open: true, item })}
                        sx={{ color: '#EF4444' }}
                      >
                        <Icon icon="mdi:delete-outline" style={{ fontSize: 18 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1B2A4A', fontSize: '1.125rem' }}>
          {editingItem ? 'Edit Neighborhood' : 'Add Neighborhood'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              label="Neighborhood Name"
              size="small"
              fullWidth
              required
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              placeholder="e.g., Whitefield"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              label="City"
              size="small"
              fullWidth
              value={form.city}
              onChange={(e) => updateForm('city', e.target.value)}
              placeholder="e.g., Bangalore"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              label="Background Image URL"
              size="small"
              fullWidth
              value={form.image}
              onChange={(e) => updateForm('image', e.target.value)}
              placeholder="https://example.com/neighborhood.jpg"
              helperText="Enter a direct image URL. Recommended size: 400x300"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            {form.image && (
              <Box
                component="img"
                src={form.image}
                alt="Preview"
                sx={{
                  width: '100%',
                  maxHeight: 200,
                  objectFit: 'cover',
                  borderRadius: 2,
                  border: '1px solid #E5E7EB',
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}

            <TextField
              label="Property Count"
              size="small"
              fullWidth
              type="number"
              value={form.propertyCount}
              onChange={(e) => updateForm('propertyCount', e.target.value)}
              inputProps={{ min: 0 }}
              helperText="Number of properties in this neighborhood"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Switch
                checked={form.isActive}
                onChange={(e) => updateForm('isActive', e.target.checked)}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#10B981' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#10B981' },
                }}
              />
              <Typography sx={{ fontSize: '0.875rem', color: '#374151' }}>
                Active (visible on homepage)
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={handleClose}
            sx={{ textTransform: 'none', color: '#6B7280', borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving}
            sx={{
              bgcolor: '#1B2A4A',
              textTransform: 'none',
              borderRadius: 2,
              px: 4,
              '&:hover': { bgcolor: '#2d3f63' },
            }}
          >
            {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, item: null })}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1B2A4A' }}>
          Delete Neighborhood
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
            Are you sure you want to delete <strong>{deleteDialog.item?.name}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, item: null })}
            sx={{ textTransform: 'none', color: '#6B7280', borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            sx={{
              bgcolor: '#EF4444',
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: '#DC2626' },
            }}
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

export default AdminNeighborhoods;
