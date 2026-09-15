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
import { useToast } from '../common/ToastProvider';
import { toneStyles } from '../ui/tones';

const ROLES = [
  { value: 'admin', label: 'Admin', tone: 'primary' },
  { value: 'manager', label: 'Manager', tone: 'info' },
  { value: 'sales', label: 'Sales', tone: 'success' },
];

const roleStyle = (role) => toneStyles(ROLES.find((r) => r.value === role)?.tone);

const EMPTY_FORM = { name: '', email: '', password: '', role: 'sales' };

const UserManagement = () => {
  const toast = useToast();
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getAll();
      setUsers(data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Computed values for security checks
  const adminCount = useMemo(
    () => users.filter((u) => u.role === 'admin' && u.isActive !== false).length,
    [users]
  );

  const isSelf = useCallback((userId) => String(userId) === String(currentUser?.id), [currentUser]);

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
        toast.success('User updated successfully');
      } else {
        await userService.create({ ...payload, isActive: true });
        toast.success('User created successfully');
      }
      setModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch {
      toast.error('Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (targetUser) => {
    if (isSelf(targetUser.id)) {
      toast.warning('You cannot disable your own account');
      return;
    }
    if (isLastActiveAdmin(targetUser.id) && targetUser.isActive) {
      toast.warning('Cannot disable the last remaining admin');
      return;
    }
    try {
      await userService.update(targetUser.id, { isActive: !targetUser.isActive });
      toast.success(`User ${targetUser.isActive ? 'disabled' : 'enabled'} successfully`);
      fetchUsers();
    } catch {
      toast.error('Failed to update user status');
    }
  };

  // Delete user
  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      await userService.delete(deletingUser.id);
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch {
      toast.error('Failed to delete user');
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
    setFormData({
      name: targetUser.name,
      email: targetUser.email,
      password: '',
      role: targetUser.role,
    });
    setErrors({});
    setShowPassword(false);
    setModalOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (targetUser) => {
    if (isSelf(targetUser.id)) {
      toast.warning('You cannot delete your own account');
      return;
    }
    if (isLastActiveAdmin(targetUser.id)) {
      toast.warning('Cannot delete the last remaining admin');
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
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}
        >
          <Skeleton width={200} height={40} />
          <Skeleton width={140} height={40} sx={{ borderRadius: 2 }} />
        </Box>
        <Paper
          elevation={0}
          sx={{ borderRadius: 2, border: '1px solid var(--color-surface)', overflow: 'hidden' }}
        >
          {[...Array(4)].map((_, i) => (
            <Box key={i} sx={{ px: 3, py: 2, borderBottom: '1px solid var(--color-surface)' }}>
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
          <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-charcoal)' }}>
            Users ({users.length})
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Manage admin panel users and their roles
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Icon icon="mdi:account-plus-outline" />}
          onClick={openAddModal}
          sx={{
            bgcolor: 'var(--color-charcoal)',
            textTransform: 'none',
            borderRadius: 2,
            px: 3,
            fontSize: '0.8125rem',
            '&:hover': { bgcolor: 'var(--color-charcoal)' },
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
              <Icon icon="mdi:magnify" style={{ fontSize: 20, color: 'var(--color-text-muted)' }} />
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
        sx={{ borderRadius: 2, border: '1px solid var(--color-surface)' }}
      >
        <Table size={isMobile ? 'small' : 'medium'}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'var(--color-surface)' }}>
              <TableCell
                sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
              >
                Name
              </TableCell>
              {!isMobile && (
                <TableCell
                  sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                >
                  Email
                </TableCell>
              )}
              <TableCell
                sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
              >
                Role
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
              >
                Status
              </TableCell>
              {!isMobile && (
                <TableCell
                  sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                >
                  Created
                </TableCell>
              )}
              <TableCell
                sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                align="right"
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isMobile ? 4 : 6} align="center" sx={{ py: 6 }}>
                  <Icon
                    icon="mdi:account-search-outline"
                    style={{ fontSize: 40, color: 'var(--color-text-muted)' }}
                  />
                  <Typography
                    sx={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', mt: 1 }}
                  >
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
                      '&:hover': { bgcolor: 'var(--color-surface)' },
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
                            bgcolor: roleStyle(u.role).background,
                            color: roleStyle(u.role).color,
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
                          <Typography
                            sx={{
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              color: 'var(--color-charcoal)',
                            }}
                          >
                            {u.name}
                            {self && (
                              <Typography
                                component="span"
                                sx={{
                                  fontSize: '0.625rem',
                                  color: 'var(--color-text-muted)',
                                  ml: 0.75,
                                  fontWeight: 400,
                                }}
                              >
                                (You)
                              </Typography>
                            )}
                          </Typography>
                          {isMobile && (
                            <Typography
                              sx={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}
                            >
                              {u.email}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Email (desktop) */}
                    {!isMobile && (
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8125rem', color: 'var(--color-text)' }}>
                          {u.email}
                        </Typography>
                      </TableCell>
                    )}

                    {/* Role */}
                    <TableCell>
                      <Chip
                        label={u.role?.charAt(0).toUpperCase() + u.role?.slice(1)}
                        size="small"
                        sx={{
                          bgcolor: roleStyle(u.role).background,
                          color: roleStyle(u.role).color,
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
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: 'var(--color-success-dark)',
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                bgcolor: 'var(--color-success)',
                              },
                            }}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>

                    {/* Created Date (desktop) */}
                    {!isMobile && (
                      <TableCell>
                        <Typography sx={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
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
                          <IconButton
                            size="small"
                            onClick={() => openEditModal(u)}
                            sx={{ color: 'var(--color-info-dark)' }}
                          >
                            <Icon icon="mdi:pencil-outline" style={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={
                            self
                              ? 'Cannot delete yourself'
                              : isLastActiveAdmin(u.id)
                                ? 'Last admin'
                                : 'Delete user'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => openDeleteDialog(u)}
                              disabled={self || isLastActiveAdmin(u.id)}
                              sx={{
                                color: 'var(--color-error-dark)',
                                '&.Mui-disabled': { color: 'var(--color-text-muted)' },
                              }}
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
            color: 'var(--color-charcoal)',
            pb: 1,
          }}
        >
          <Icon
            icon={editingUser ? 'mdi:account-edit-outline' : 'mdi:account-plus-outline'}
            style={{ fontSize: 22, color: 'var(--color-primary-dark)' }}
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
                    <Icon
                      icon={showPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}
                      style={{ fontSize: 20 }}
                    />
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
              <FormHelperText sx={{ color: 'var(--color-text-muted)' }}>
                You cannot change your own role
              </FormHelperText>
            )}
          </FormControl>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setModalOpen(false)}
            disabled={saving}
            sx={{ textTransform: 'none', color: 'var(--color-text-muted)', borderRadius: 2 }}
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
              px: 3,
              '&:hover': { bgcolor: 'var(--color-charcoal)' },
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
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-charcoal)' }}>
          Delete User
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Are you sure you want to delete{' '}
            <Typography component="span" sx={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>
              {deletingUser?.name}
            </Typography>
            ? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ textTransform: 'none', color: 'var(--color-text-muted)', borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDelete}
            sx={{
              textTransform: 'none',
              bgcolor: 'var(--color-error)',
              borderRadius: 2,
              px: 3,
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

export default UserManagement;
