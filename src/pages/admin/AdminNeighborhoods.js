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
  Skeleton,
  Switch,
  useMediaQuery,
  useTheme,
  IconButton,
} from '@mui/material';
import { Icon } from '@iconify/react';
import masterDataService from '../../services/masterDataService';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useToast } from '../../components/common/ToastProvider';

/**
 * Neighbourhoods are `localities` in the contract (D13). This screen reads and
 * writes the real collection through a small field mapping; prompt 14 replaces
 * it with the full locality editor (zone, description, guide content, SEO).
 */
const localityService = masterDataService.localities;

const emptyNeighborhood = {
  name: '',
  image: '',
  city: '',
  isActive: true,
};

const AdminNeighborhoods = () => {
  const toast = useToast();
  const { cities } = useMasterData();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [neighborhoods, setNeighborhoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyNeighborhood);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  const fetchNeighborhoods = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await localityService.adminList({ perPage: 100, sort: 'name' });
      setNeighborhoods(
        (Array.isArray(data) ? data : []).map((locality) => ({
          ...locality,
          image: locality.heroImageUrl || '',
          city: locality.city?.name || '',
        }))
      );
    } catch (thrown) {
      toast.error(thrown?.message || 'Failed to load localities');
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
      toast.warning('Neighborhood name is required');
      return;
    }

    setSaving(true);
    try {
      // `propertyCount` is computed by the API and never sent (§5.5).
      const cityName = form.city.trim().toLowerCase();
      const city = cities.find((row) => row.name.toLowerCase() === cityName) ?? cities[0] ?? null;

      const payload = {
        name: form.name.trim(),
        heroImageUrl: form.image.trim(),
        isActive: form.isActive,
        ...(city ? { cityId: city.id } : {}),
      };

      if (editingItem) {
        // PATCH, so the locality's guide copy and SEO branch survive the save.
        await localityService.patch(editingItem.id, payload);
        toast.success('Locality updated');
      } else {
        await localityService.create(payload);
        toast.success('Locality created');
      }

      handleClose();
      fetchNeighborhoods();
    } catch (thrown) {
      toast.error(thrown?.message || 'Failed to save locality');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const item = deleteDialog.item;
    if (!item) return;

    try {
      await localityService.remove(item.id);
      toast.success('Locality deleted');
      setDeleteDialog({ open: false, item: null });
      fetchNeighborhoods();
    } catch (thrown) {
      // A locality still used by a property answers 409 with the usages (D88).
      toast.error(thrown?.message || 'Failed to delete locality');
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await localityService.patch(item.id, { isActive: !item.isActive });
      fetchNeighborhoods();
    } catch (thrown) {
      toast.error(thrown?.message || 'Failed to update status');
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
        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 2, border: '1px solid var(--color-surface)' }}
        >
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
            Neighborhoods
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', mt: 0.5 }}>
            Manage neighborhoods displayed on the homepage
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
          Add Neighborhood
        </Button>
      </Box>

      {/* Table */}
      <Paper
        elevation={0}
        sx={{ borderRadius: 2, border: '1px solid var(--color-surface)', overflow: 'hidden' }}
      >
        {neighborhoods.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
            <Icon
              icon="mdi:map-marker-radius-outline"
              style={{ fontSize: 48, color: 'var(--color-text-muted)' }}
            />
            <Typography
              sx={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)', mt: 2 }}
            >
              No neighborhoods added yet
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', mt: 0.5 }}>
              Add neighborhoods to display them on the homepage
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'var(--color-surface)' }}>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Image
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Name
                  </TableCell>
                  {!isMobile && (
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      City
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        color: 'var(--color-text-muted)',
                      }}
                      align="center"
                    >
                      Properties
                    </TableCell>
                  )}
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-muted)',
                    }}
                    align="center"
                  >
                    Active
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-muted)',
                    }}
                    align="right"
                  >
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
                        src={item.image || 'https://picsum.photos/seed/locality/64/48'}
                        alt={item.name}
                        sx={{
                          width: 64,
                          height: 48,
                          objectFit: 'cover',
                          borderRadius: 1,
                          bgcolor: 'var(--color-surface)',
                        }}
                        onError={(e) => {
                          e.target.src = 'https://picsum.photos/seed/locality/64/48';
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'var(--color-charcoal)',
                        }}
                      >
                        {item.name}
                      </Typography>
                      {isMobile && item.city && (
                        <Typography sx={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {item.city}
                        </Typography>
                      )}
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        <Typography
                          sx={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}
                        >
                          {item.city || '—'}
                        </Typography>
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell align="center">
                        <Typography
                          sx={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}
                        >
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
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: 'var(--color-success-dark)',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            bgcolor: 'var(--color-success)',
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEdit(item)}
                        sx={{ color: 'var(--color-text-muted)', mr: 0.5 }}
                      >
                        <Icon icon="mdi:pencil-outline" style={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setDeleteDialog({ open: true, item })}
                        sx={{ color: 'var(--color-error-dark)' }}
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
        <DialogTitle sx={{ fontWeight: 700, color: 'var(--color-charcoal)', fontSize: '1.125rem' }}>
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
                  border: '1px solid var(--color-border)',
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Switch
                checked={form.isActive}
                onChange={(e) => updateForm('isActive', e.target.checked)}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-success-dark)' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    bgcolor: 'var(--color-success)',
                  },
                }}
              />
              <Typography sx={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>
                Active (visible on homepage)
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={handleClose}
            sx={{ textTransform: 'none', color: 'var(--color-text-muted)', borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving}
            sx={{
              bgcolor: 'var(--color-charcoal)',
              textTransform: 'none',
              borderRadius: 2,
              px: 4,
              '&:hover': { bgcolor: 'var(--color-charcoal)' },
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
        <DialogTitle sx={{ fontWeight: 700, color: 'var(--color-charcoal)' }}>
          Delete Neighborhood
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Are you sure you want to delete <strong>{deleteDialog.item?.name}</strong>? This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, item: null })}
            sx={{ textTransform: 'none', color: 'var(--color-text-muted)', borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            sx={{
              bgcolor: 'var(--color-error)',
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: 'var(--color-error)' },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminNeighborhoods;
