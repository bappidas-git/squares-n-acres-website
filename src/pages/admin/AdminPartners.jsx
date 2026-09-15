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
import { partnerService } from '../../services/api';

const emptyPartner = {
  name: '',
  logo: '',
  website: '',
  order: 1,
  isActive: true,
};

const AdminPartners = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [form, setForm] = useState(emptyPartner);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, partner: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await partnerService.getAll();
      setPartners(Array.isArray(data) ? data : []);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load partners', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleOpenAdd = () => {
    setEditingPartner(null);
    setForm({ ...emptyPartner, order: partners.length + 1 });
    setDialogOpen(true);
  };

  const handleOpenEdit = (partner) => {
    setEditingPartner(partner);
    setForm({
      name: partner.name || '',
      logo: partner.logo || '',
      website: partner.website || '',
      order: partner.order || 1,
      isActive: partner.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setSnackbar({ open: true, message: 'Partner name is required', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      if (editingPartner) {
        const updated = await partnerService.update(editingPartner.id, form);
        setPartners((prev) =>
          prev
            .map((p) => (p.id === editingPartner.id ? { ...p, ...updated } : p))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        );
        setSnackbar({ open: true, message: 'Partner updated', severity: 'success' });
      } else {
        const created = await partnerService.create(form);
        setPartners((prev) =>
          [...prev, created].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        );
        setSnackbar({ open: true, message: 'Partner added', severity: 'success' });
      }
      setDialogOpen(false);
    } catch {
      setSnackbar({ open: true, message: 'Failed to save partner', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (partner) => {
    try {
      await partnerService.update(partner.id, { isActive: !partner.isActive });
      setPartners((prev) =>
        prev.map((p) => (p.id === partner.id ? { ...p, isActive: !p.isActive } : p))
      );
      setSnackbar({
        open: true,
        message: `Partner ${!partner.isActive ? 'activated' : 'deactivated'}`,
        severity: 'success',
      });
    } catch {
      setSnackbar({ open: true, message: 'Failed to update partner', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    const { partner } = deleteDialog;
    if (!partner) return;
    try {
      await partnerService.delete(partner.id);
      setPartners((prev) => prev.filter((p) => p.id !== partner.id));
      setSnackbar({ open: true, message: 'Partner deleted', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete partner', severity: 'error' });
    } finally {
      setDeleteDialog({ open: false, partner: null });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B2A4A' }}>
            Partners
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', mt: 0.5 }}>
            {partners.length} partners ({partners.filter((p) => p.isActive).length} active)
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
          Add Partner
        </Button>
      </Box>

      {/* Partner List */}
      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 3 }}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height={64} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : isMobile ? (
          <Box sx={{ p: 2 }}>
            {partners.map((partner) => (
              <Paper
                key={partner.id}
                variant="outlined"
                sx={{ p: 2, mb: 2, borderRadius: 2, opacity: partner.isActive ? 1 : 0.6 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  {partner.logo && (
                    <img
                      src={partner.logo}
                      alt={partner.name}
                      style={{ maxHeight: 32, maxWidth: 80, objectFit: 'contain' }}
                    />
                  )}
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1B2A4A', flex: 1 }}>
                    {partner.name}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                  <Switch
                    checked={partner.isActive}
                    onChange={() => handleToggleActive(partner)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#10B981' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#10B981' },
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => handleOpenEdit(partner)}>
                      <Icon icon="mdi:pencil-outline" style={{ fontSize: 16, color: '#6B7280' }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeleteDialog({ open: true, partner })}>
                      <Icon icon="mdi:delete-outline" style={{ fontSize: 16, color: '#EF4444' }} />
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', width: 60 }} align="center">Order</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }}>Logo</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }}>Website</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }} align="center">Active</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {partners.map((partner) => (
                  <TableRow key={partner.id} hover sx={{ opacity: partner.isActive ? 1 : 0.55 }}>
                    <TableCell align="center">
                      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#9CA3AF' }}>
                        {partner.order}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {partner.logo ? (
                        <img
                          src={partner.logo}
                          alt={partner.name}
                          style={{ maxHeight: 32, maxWidth: 100, objectFit: 'contain' }}
                        />
                      ) : (
                        <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>No logo</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1B2A4A' }}>
                        {partner.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        sx={{ fontSize: '0.75rem', color: '#6B7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {partner.website || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={partner.isActive}
                        onChange={() => handleToggleActive(partner)}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: '#10B981' },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#10B981' },
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <IconButton size="small" onClick={() => handleOpenEdit(partner)}>
                          <Icon icon="mdi:pencil-outline" style={{ fontSize: 18, color: '#6B7280' }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => setDeleteDialog({ open: true, partner })}>
                          <Icon icon="mdi:delete-outline" style={{ fontSize: 18, color: '#EF4444' }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {partners.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Icon icon="mdi:handshake-outline" style={{ fontSize: 40, color: '#D1D5DB' }} />
                      <Typography sx={{ color: '#9CA3AF', mt: 1 }}>No partners yet</Typography>
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
        <DialogTitle sx={{ borderBottom: '1px solid #F3F4F6', pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#1B2A4A' }}>
              {editingPartner ? 'Edit Partner' : 'Add Partner'}
            </Typography>
            <IconButton size="small" onClick={() => setDialogOpen(false)}>
              <Icon icon="mdi:close" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', mb: 0.75 }}>
              Partner Name *
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter partner name..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>

          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', mb: 0.75 }}>
              Logo URL
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={form.logo}
              onChange={(e) => setForm((prev) => ({ ...prev, logo: e.target.value }))}
              placeholder="https://example.com/logo.png"
              helperText="Recommended: 200x80px, transparent PNG"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>

          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', mb: 0.75 }}>
              Website URL (optional)
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={form.website}
              onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="https://example.com"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              label="Display Order"
              type="number"
              value={form.order}
              onChange={(e) => setForm((prev) => ({ ...prev, order: parseInt(e.target.value, 10) || 1 }))}
              sx={{ width: 120, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              inputProps={{ min: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #F3F4F6' }}>
          <Button
            onClick={() => setDialogOpen(false)}
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
            {saving ? 'Saving...' : editingPartner ? 'Update Partner' : 'Add Partner'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, partner: null })}
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1B2A4A' }}>
            Delete Partner
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
            Are you sure you want to delete this partner? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, partner: null })}
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

export default AdminPartners;
