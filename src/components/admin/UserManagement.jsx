import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  Snackbar,
  Alert,
  Skeleton,
  InputAdornment,
  FormHelperText,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { userService } from '../../services/api';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const ROLES = [
  { value: 'admin', label: 'Admin', color: '#7C3AED' },
  { value: 'manager', label: 'Manager', color: '#2563EB' },
  { value: 'sales', label: 'Sales', color: '#059669' },
];

const getRoleColor = (role) => ROLES.find((r) => r.value === role)?.color || '#6B7280';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'sales' };

const UserManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user: currentUser } = useAdminAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getAll();
      setUsers(data);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load users', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Computed values for security checks
  const adminCount = useMemo(
    () => users.filter((u) => u.role === 'admin' && u.isActive !== false).length,
    [users]
  );

  const isSelf = useCallback(
    (userId) => String(userId) === String(currentUser?.id),
    [currentUser]
  );

  const isLastActiveAdmin = useCallback(
    (userId) => {
      const u = users.find((usr) => String(usr.id) === String(userId));
      return u?.role === 'admin' && adminCount <= 1;
    },
    [users, adminCount]
  );

  // Validate form
  const validate = useCallback(() => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    } else {
      const duplicate = users.find(
        (u) => u.email.toLowerCase() === formData.email.toLowerCase() && u.id !== editingUser?.id
      );
      if (duplicate) newErrors.email = 'Email already exists';
    }

    if (!editingUser && !formData.password) {
      newErrors.password = 'Password is required for new users';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Minimum 6 characters';
    }

    if (!formData.role) newErrors.role = 'Role is required';

    // Prevent admin from changing their own role
    if (editingUser && isSelf(editingUser.id) && formData.role !== currentUser?.role) {
      newErrors.role = 'You cannot change your own role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, users, editingUser, isSelf, currentUser]);

  // Save (create or update)
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...formData };
      // Don't send empty password on update
      if (editingUser && !payload.password) delete payload.password;

      if (editingUser) {
        await userService.update(editingUser.id, payload);
        setSnackbar({ open: true, message: 'User updated successfully', severity: 'success' });
      } else {
        await userService.create({ ...payload, isActive: true });
        setSnackbar({ open: true, message: 'User created successfully', severity: 'success' });
      }
      setModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch {
      setSnackbar({ open: true, message: 'Failed to save user', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (targetUser) => {
    if (isSelf(targetUser.id)) {
      setSnackbar({ open: true, message: 'You cannot disable your own account', severity: 'warning' });
      return;
    }
    if (isLastActiveAdmin(targetUser.id) && targetUser.isActive) {
      setSnackbar({ open: true, message: 'Cannot disable the last remaining admin', severity: 'warning' });
      return;
    }
    try {
      await userService.update(targetUser.id, { isActive: !targetUser.isActive });
      setSnackbar({
        open: true,
        message: `User ${targetUser.isActive ? 'disabled' : 'enabled'} successfully`,
        severity: 'success',
      });
      fetchUsers();
    } catch {
      setSnackbar({ open: true, message: 'Failed to update user status', severity: 'error' });
    }
  };

  // Delete user
  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      await userService.delete(deletingUser.id);
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      setSnackbar({ open: true, message: 'User deleted successfully', severity: 'success' });
      fetchUsers();
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete user', severity: 'error' });
    }
  };

  // Open add modal
  const openAddModal = () => {
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setErrors({});
    setShowPassword(false);
    setModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (targetUser) => {
    setEditingUser(targetUser);
    setFormData({ name: targetUser.name, email: targetUser.email, password: '', role: targetUser.role });
    setErrors({});
    setShowPassword(false);
    setModalOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (targetUser) => {
    if (isSelf(targetUser.id)) {
      setSnackbar({ open: true, message: 'You cannot delete your own account', severity: 'warning' });
      return;
    }
    if (isLastActiveAdmin(targetUser.id)) {
      setSnackbar({ open: true, message: 'Cannot delete the last remaining admin', severity: 'warning' });
      return;
    }
    setDeletingUser(targetUser);
    setDeleteDialogOpen(true);
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  // Shared input sx
  const inputSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } };

  // Loading skeleton
  if (loading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Skeleton width={200} height={40} />
          <Skeleton width={140} height={40} sx={{ borderRadius: 2 }} />
        </Box>
        <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
          {[...Array(4)].map((_, i) => (
            <Box key={i} sx={{ px: 3, py: 2, borderBottom: '1px solid #F3F4F6' }}>
              <Skeleton height={40} />
            </Box>
          ))}
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header Row */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#1B2A4A' }}>
            Users ({users.length})
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
            Manage admin panel users and their roles
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Icon icon="mdi:account-plus-outline" />}
          onClick={openAddModal}
          sx={{
            bgcolor: '#1B2A4A',
            textTransform: 'none',
            borderRadius: 2,
            px: 3,
            fontSize: '0.8125rem',
            '&:hover': { bgcolor: '#2d3f63' },
          }}
        >
          Add User
        </Button>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search by name, email, or role..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Icon icon="mdi:magnify" style={{ fontSize: 20, color: '#9CA3AF' }} />
            </InputAdornment>
          ),
          ...(searchQuery && {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <Icon icon="mdi:close" style={{ fontSize: 18 }} />
                </IconButton>
              </InputAdornment>
            ),
          }),
        }}
        sx={{ mb: 2, ...inputSx }}
      />

      {/* Users Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ borderRadius: 2, border: '1px solid #F3F4F6' }}
      >
        <Table size={isMobile ? 'small' : 'medium'}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F9FAFB' }}>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }}>Name</TableCell>
              {!isMobile && (
                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }}>Email</TableCell>
              )}
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }}>Status</TableCell>
              {!isMobile && (
                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }}>Created</TableCell>
              )}
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isMobile ? 4 : 6} align="center" sx={{ py: 6 }}>
                  <Icon icon="mdi:account-search-outline" style={{ fontSize: 40, color: '#D1D5DB' }} />
                  <Typography sx={{ fontSize: '0.875rem', color: '#9CA3AF', mt: 1 }}>
                    {searchQuery ? 'No users match your search' : 'No users found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => {
                const self = isSelf(u.id);
                return (
                  <TableRow
                    key={u.id}
                    sx={{
                      '&:hover': { bgcolor: '#F9FAFB' },
                      opacity: u.isActive === false ? 0.6 : 1,
                    }}
                  >
                    {/* Name + Email on mobile */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            bgcolor: getRoleColor(u.role) + '14',
                            color: getRoleColor(u.role),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {(u.name || '')
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1B2A4A' }}>
                            {u.name}
                            {self && (
                              <Typography
                                component="span"
                                sx={{ fontSize: '0.625rem', color: '#9CA3AF', ml: 0.75, fontWeight: 400 }}
                              >
                                (You)
                              </Typography>
                            )}
                          </Typography>
                          {isMobile && (
                            <Typography sx={{ fontSize: '0.6875rem', color: '#9CA3AF' }}>{u.email}</Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Email (desktop) */}
                    {!isMobile && (
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8125rem', color: '#374151' }}>{u.email}</Typography>
                      </TableCell>
                    )}

                    {/* Role */}
                    <TableCell>
                      <Chip
                        label={u.role?.charAt(0).toUpperCase() + u.role?.slice(1)}
                        size="small"
                        sx={{
                          bgcolor: getRoleColor(u.role) + '14',
                          color: getRoleColor(u.role),
                          fontWeight: 600,
                          fontSize: '0.6875rem',
                          height: 24,
                          borderRadius: 1.5,
                        }}
                      />
                    </TableCell>

                    {/* Status Toggle */}
                    <TableCell>
                      <Tooltip
                        title={
                          self
                            ? 'Cannot disable yourself'
                            : isLastActiveAdmin(u.id) && u.isActive
                            ? 'Last admin'
                            : u.isActive
                            ? 'Click to disable'
                            : 'Click to enable'
                        }
                      >
                        <span>
                          <Switch
                            checked={u.isActive !== false}
                            onChange={() => handleToggleActive(u)}
                            disabled={self || (isLastActiveAdmin(u.id) && u.isActive)}
                            size="small"
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': { color: '#059669' },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#059669' },
                            }}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>

                    {/* Created Date (desktop) */}
                    {!isMobile && (
                      <TableCell>
                        <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </Typography>
                      </TableCell>
                    )}

                    {/* Actions */}
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="Edit user">
                          <IconButton size="small" onClick={() => openEditModal(u)} sx={{ color: '#3B82F6' }}>
                            <Icon icon="mdi:pencil-outline" style={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={
                            self ? 'Cannot delete yourself' : isLastActiveAdmin(u.id) ? 'Last admin' : 'Delete user'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => openDeleteDialog(u)}
                              disabled={self || isLastActiveAdmin(u.id)}
                              sx={{ color: '#EF4444', '&.Mui-disabled': { color: '#E5E7EB' } }}
                            >
                              <Icon icon="mdi:delete-outline" style={{ fontSize: 18 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit User Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1B2A4A',
            pb: 1,
          }}
        >
          <Icon
            icon={editingUser ? 'mdi:account-edit-outline' : 'mdi:account-plus-outline'}
            style={{ fontSize: 22, color: '#C9A86C' }}
          />
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>

        <DialogContent sx={{ pt: '8px !important' }}>
          {/* Name */}
          <TextField
            fullWidth
            size="small"
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            error={!!errors.name}
            helperText={errors.name}
            sx={{ mb: 2.5, ...inputSx }}
          />

          {/* Email */}
          <TextField
            fullWidth
            size="small"
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            error={!!errors.email}
            helperText={errors.email}
            sx={{ mb: 2.5, ...inputSx }}
          />

          {/* Password */}
          <TextField
            fullWidth
            size="small"
            label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
            error={!!errors.password}
            helperText={errors.password}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPassword((p) => !p)} edge="end">
                    <Icon icon={showPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} style={{ fontSize: 20 }} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2.5, ...inputSx }}
          />

          {/* Role */}
          <FormControl fullWidth size="small" error={!!errors.role} sx={inputSx}>
            <InputLabel>Role</InputLabel>
            <Select
              value={formData.role}
              label="Role"
              onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
              disabled={editingUser && isSelf(editingUser.id)}
            >
              {ROLES.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: r.color }} />
                    {r.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {errors.role && <FormHelperText>{errors.role}</FormHelperText>}
            {editingUser && isSelf(editingUser.id) && (
              <FormHelperText sx={{ color: '#9CA3AF' }}>You cannot change your own role</FormHelperText>
            )}
          </FormControl>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setModalOpen(false)}
            disabled={saving}
            sx={{ textTransform: 'none', color: '#6B7280', borderRadius: 2 }}
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
              px: 3,
              '&:hover': { bgcolor: '#2d3f63' },
            }}
          >
            {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600, color: '#1B2A4A' }}>
          Delete User
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
            Are you sure you want to delete{' '}
            <Typography component="span" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
              {deletingUser?.name}
            </Typography>
            ? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ textTransform: 'none', color: '#6B7280', borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDelete}
            sx={{
              textTransform: 'none',
              bgcolor: '#EF4444',
              borderRadius: 2,
              px: 3,
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

export default UserManagement;
