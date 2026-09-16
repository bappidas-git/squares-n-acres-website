import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Switch,
  IconButton,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Skeleton,
  Alert,
  Card,
  CardContent,
  CardActions,
  InputAdornment,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Icon } from '@iconify/react';
import propertyService from '../../services/propertyService';
import { toLegacyProperties } from '../../utils/adapters/legacyProperty';
import { useToast } from '../../components/common/ToastProvider';

// Tag color config
const tagColors = {
  featured: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning-dark)' },
  trending: { bg: 'var(--color-info-bg)', color: 'var(--color-info-dark)' },
  premium: { bg: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' },
  'hot-deal': { bg: 'var(--color-error-bg)', color: 'var(--color-error-dark)' },
  'new-launch': { bg: 'var(--color-success-bg)', color: 'var(--color-success-dark)' },
  'ready-to-move': { bg: 'var(--color-success-bg)', color: 'var(--color-success-dark)' },
};

const statusLabels = {
  'ready-to-move': 'Ready to Move',
  'under-construction': 'Under Construction',
  'pre-launch': 'Pre-Launch',
};

const formatPrice = (price) => {
  if (!price) return '-';
  if (price >= 10000000) return `${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `${(price / 100000).toFixed(2)} L`;
  return price.toLocaleString('en-IN');
};

const AdminProperties = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Data state
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');

  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Selection state
  const [selected, setSelected] = useState([]);

  // Dialog state
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    id: null,
    title: '',
    bulk: false,
  });

  /**
   * The admin list, not the public one (ADD-21): it includes inactive records.
   * The rows still read the boilerplate's field names, so they go through
   * `toLegacyProperty` until prompt 22 rewrites this table.
   */
  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await propertyService.adminList({ perPage: 100 });
      setProperties(toLegacyProperties(data));
      setError(null);
    } catch (thrown) {
      setError(thrown?.message || 'Failed to load properties. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Apply filters
  useEffect(() => {
    let result = [...properties];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          (p.location?.area || p.location_area || '').toLowerCase().includes(q) ||
          (p.location?.city || p.location_city || '').toLowerCase().includes(q) ||
          p.developer?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (typeFilter !== 'all') {
      result = result.filter((p) => p.type === typeFilter);
    }
    if (propertyTypeFilter !== 'all') {
      result = result.filter((p) => (p.propertyType || p.property_type) === propertyTypeFilter);
    }
    if (activeFilter !== 'all') {
      const isActive = activeFilter === 'active';
      result = result.filter((p) => (p.isActive ?? p.is_active) === isActive);
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'location') {
        aVal = a.location?.area || a.location_area || '';
        bVal = b.location?.area || b.location_area || '';
      }
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
    });

    setFilteredProperties(result);
    setPage(0);
  }, [
    properties,
    searchQuery,
    statusFilter,
    typeFilter,
    propertyTypeFilter,
    activeFilter,
    sortField,
    sortOrder,
  ]);

  // Toggle active status
  const handleToggleActive = async (id, currentStatus) => {
    try {
      await propertyService.patch(id, { isActive: !currentStatus });
      setProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: !currentStatus } : p))
      );
      toast.success(`Property ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Delete property
  const handleDelete = async () => {
    try {
      if (deleteDialog.bulk) {
        await propertyService.bulk({ ids: selected, action: 'delete' });
        setProperties((prev) => prev.filter((p) => !selected.includes(p.id)));
        setSelected([]);
        toast.success(`${selected.length} properties deleted successfully`);
      } else {
        await propertyService.remove(deleteDialog.id);
        setProperties((prev) => prev.filter((p) => p.id !== deleteDialog.id));
        setSelected((prev) => prev.filter((id) => id !== deleteDialog.id));
        toast.success('Property deleted successfully');
      }
    } catch {
      toast.error('Failed to delete property');
    } finally {
      setDeleteDialog({ open: false, id: null, title: '', bulk: false });
    }
  };

  // Bulk actions
  const handleBulkActivate = async () => {
    try {
      await propertyService.bulk({ ids: selected, action: 'activate' });
      setProperties((prev) =>
        prev.map((p) => (selected.includes(p.id) ? { ...p, isActive: true } : p))
      );
      setSelected([]);
      toast.success('Selected properties activated');
    } catch {
      toast.error('Failed to activate properties');
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      await propertyService.bulk({ ids: selected, action: 'deactivate' });
      setProperties((prev) =>
        prev.map((p) => (selected.includes(p.id) ? { ...p, isActive: false } : p))
      );
      setSelected([]);
      toast.success('Selected properties deactivated');
    } catch {
      toast.error('Failed to deactivate properties');
    }
  };

  // Selection helpers
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const currentPageIds = filteredProperties
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        .map((p) => p.id);
      setSelected(currentPageIds);
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortableHeader = ({ field, children }) => (
    <TableCell
      sx={{
        fontWeight: 600,
        color: 'var(--color-text-muted)',
        fontSize: '0.75rem',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        '&:hover': { color: 'var(--color-charcoal)' },
      }}
      onClick={() => handleSort(field)}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {children}
        {sortField === field && (
          <Icon
            icon={sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'}
            style={{ fontSize: 14 }}
          />
        )}
      </Box>
    </TableCell>
  );

  const currentPageData = filteredProperties.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const currentPageIds = currentPageData.map((p) => p.id);
  const allOnPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selected.includes(id));
  const someOnPageSelected =
    currentPageIds.some((id) => selected.includes(id)) && !allOnPageSelected;

  // Get unique property types from data
  const propertyTypes = [
    ...new Set(properties.map((p) => p.propertyType || p.property_type).filter(Boolean)),
  ];

  return (
    <Box>
      {/* Header */}
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
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--color-charcoal)' }}>
            Property Management
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', mt: 0.5 }}>
            {filteredProperties.length} properties found
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Icon icon="mdi:plus" />}
          onClick={() => navigate('/admin/properties/add')}
          sx={{ borderRadius: 2 }}
        >
          Add New Property
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <TextField
            size="small"
            placeholder="Search by name, location, developer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: 260, flex: { xs: '1 1 100%', md: '0 1 auto' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Icon
                    icon="mdi:magnify"
                    style={{ fontSize: 20, color: 'var(--color-text-muted)' }}
                  />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={activeFilter}
              label="Status"
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Listing</InputLabel>
            <Select
              value={statusFilter}
              label="Listing"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Listings</MenuItem>
              <MenuItem value="ready-to-move">Ready to Move</MenuItem>
              <MenuItem value="under-construction">Under Construction</MenuItem>
              <MenuItem value="pre-launch">Pre-Launch</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)}>
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="sale">Sale</MenuItem>
              <MenuItem value="rent">Rent</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Property Type</InputLabel>
            <Select
              value={propertyTypeFilter}
              label="Property Type"
              onChange={(e) => setPropertyTypeFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              {propertyTypes.map((pt) => (
                <MenuItem key={pt} value={pt}>
                  {pt.charAt(0).toUpperCase() + pt.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {(searchQuery ||
            statusFilter !== 'all' ||
            typeFilter !== 'all' ||
            propertyTypeFilter !== 'all' ||
            activeFilter !== 'all') && (
            <Button
              size="small"
              variant="text"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setTypeFilter('all');
                setPropertyTypeFilter('all');
                setActiveFilter('all');
              }}
              startIcon={<Icon icon="mdi:filter-off-outline" />}
              sx={{ color: 'var(--color-text-muted)' }}
            >
              Clear
            </Button>
          )}
        </Box>
      </Paper>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <Paper
          sx={{
            p: 1.5,
            mb: 2,
            borderRadius: 2,
            bgcolor: 'var(--color-info-bg)',
            border: '1px solid var(--color-info-bg)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--color-info-dark)' }}>
            {selected.length} selected
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={handleBulkActivate}
            startIcon={<Icon icon="mdi:check-circle-outline" />}
            sx={{
              borderColor: 'var(--color-success)',
              color: 'var(--color-success-dark)',
              '&:hover': {
                borderColor: 'var(--color-success)',
                bgcolor: 'var(--color-success-bg)',
              },
            }}
          >
            Activate
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handleBulkDeactivate}
            startIcon={<Icon icon="mdi:close-circle-outline" />}
            sx={{
              borderColor: 'var(--color-warning)',
              color: 'var(--color-warning-dark)',
              '&:hover': {
                borderColor: 'var(--color-warning)',
                bgcolor: 'var(--color-warning-bg)',
              },
            }}
          >
            Deactivate
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setDeleteDialog({ open: true, id: null, title: '', bulk: true })}
            startIcon={<Icon icon="mdi:delete-outline" />}
            sx={{
              borderColor: 'var(--color-error)',
              color: 'var(--color-error-dark)',
              '&:hover': { borderColor: 'var(--color-error)', bgcolor: 'var(--color-error-bg)' },
            }}
          >
            Delete
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={() => setSelected([])}
            sx={{ ml: 'auto', color: 'var(--color-text-muted)' }}
          >
            Clear Selection
          </Button>
        </Paper>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Table (Desktop) / Cards (Mobile) */}
      {isMobile ? (
        /* === Mobile Card View === */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Skeleton width="60%" height={28} />
                  <Skeleton width="40%" height={20} sx={{ mt: 1 }} />
                  <Skeleton width="30%" height={20} sx={{ mt: 0.5 }} />
                </CardContent>
              </Card>
            ))
          ) : currentPageData.length === 0 ? (
            <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
              <Icon
                icon="mdi:home-search-outline"
                style={{ fontSize: 48, color: 'var(--color-text-muted)' }}
              />
              <Typography variant="body1" sx={{ color: 'var(--color-text-muted)', mt: 1 }}>
                No properties found
              </Typography>
            </Paper>
          ) : (
            currentPageData.map((property) => (
              <Card key={property.id} sx={{ borderRadius: 3, position: 'relative' }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Checkbox
                      size="small"
                      checked={selected.includes(property.id)}
                      onChange={() => handleSelectOne(property.id)}
                    />
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        bgcolor: 'var(--color-surface)',
                        backgroundImage: property.gallery?.[0]
                          ? `url(${property.gallery[0]})`
                          : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {!property.gallery?.[0] && (
                        <Icon
                          icon="mdi:image-outline"
                          style={{ fontSize: 24, color: 'var(--color-text-muted)' }}
                        />
                      )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 600,
                          color: 'var(--color-charcoal)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {property.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>
                        {property.location?.area || property.location_area},{' '}
                        {property.location?.city || property.location_city}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: 'var(--color-primary-dark)', mt: 0.5 }}
                      >
                        {formatPrice(property.price)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1.5, ml: 5 }}>
                    <Chip
                      size="small"
                      label={property.type === 'sale' ? 'Sale' : 'Rent'}
                      sx={{
                        height: 22,
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        bgcolor:
                          property.type === 'sale'
                            ? 'var(--color-info-bg)'
                            : 'var(--color-warning-bg)',
                        color:
                          property.type === 'sale'
                            ? 'var(--color-info-dark)'
                            : 'var(--color-warning-dark)',
                      }}
                    />
                    <Chip
                      size="small"
                      label={statusLabels[property.status] || property.status}
                      sx={{ height: 22, fontSize: '0.6875rem' }}
                    />
                    {(property.tags || []).map((tag) => {
                      const tc = tagColors[tag] || {
                        bg: 'var(--color-surface)',
                        color: 'var(--color-text-muted)',
                      };
                      return (
                        <Chip
                          key={tag}
                          size="small"
                          label={tag}
                          sx={{
                            height: 22,
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            bgcolor: tc.bg,
                            color: tc.color,
                          }}
                        />
                      );
                    })}
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>
                      Active
                    </Typography>
                    <Switch
                      size="small"
                      checked={property.isActive ?? property.is_active ?? false}
                      onChange={() =>
                        handleToggleActive(property.id, property.isActive ?? property.is_active)
                      }
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
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/admin/properties/edit/${property.id}`)}
                      sx={{ color: 'var(--color-text-muted)' }}
                    >
                      <Icon icon="mdi:pencil-outline" style={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() =>
                        setDeleteDialog({
                          open: true,
                          id: property.id,
                          title: property.title,
                          bulk: false,
                        })
                      }
                      sx={{ color: 'var(--color-error-dark)' }}
                    >
                      <Icon icon="mdi:delete-outline" style={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </CardActions>
              </Card>
            ))
          )}
        </Box>
      ) : (
        /* === Desktop Table View === */
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'var(--color-surface)' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={allOnPageSelected}
                      indeterminate={someOnPageSelected}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      fontSize: '0.75rem',
                      width: 60,
                    }}
                  >
                    Image
                  </TableCell>
                  <SortableHeader field="title">Name</SortableHeader>
                  <SortableHeader field="price">Price</SortableHeader>

                  <TableCell
                    sx={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem' }}
                  >
                    Type
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem' }}
                  >
                    Status
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                    }}
                  >
                    Active
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      fontSize: '0.75rem',
                      textAlign: 'right',
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell padding="checkbox">
                        <Skeleton width={20} />
                      </TableCell>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : currentPageData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <Icon
                        icon="mdi:home-search-outline"
                        style={{ fontSize: 48, color: 'var(--color-text-muted)' }}
                      />
                      <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', mt: 1 }}>
                        No properties found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentPageData.map((property) => (
                    <TableRow
                      key={property.id}
                      hover
                      sx={{
                        '&:last-child td': { border: 0 },
                        bgcolor: selected.includes(property.id)
                          ? 'rgba(59,130,246,0.04)'
                          : 'inherit',
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={selected.includes(property.id)}
                          onChange={() => handleSelectOne(property.id)}
                        />
                      </TableCell>

                      {/* Thumbnail */}
                      <TableCell>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 1.5,
                            bgcolor: 'var(--color-surface)',
                            backgroundImage: property.gallery?.[0]
                              ? `url(${property.gallery[0]})`
                              : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {!property.gallery?.[0] && (
                            <Icon
                              icon="mdi:image-outline"
                              style={{ fontSize: 20, color: 'var(--color-text-muted)' }}
                            />
                          )}
                        </Box>
                      </TableCell>

                      {/* Name */}
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: 'var(--color-charcoal)',
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            '&:hover': { color: 'var(--color-primary-dark)' },
                          }}
                          onClick={() => navigate(`/admin/properties/edit/${property.id}`)}
                        >
                          {property.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>
                          {property.developer}
                        </Typography>
                      </TableCell>

                      {/* Price */}
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: 'var(--color-charcoal)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatPrice(property.price)}
                        </Typography>
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <Chip
                          size="small"
                          label={property.type === 'sale' ? 'Sale' : 'Rent'}
                          sx={{
                            height: 22,
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            bgcolor:
                              property.type === 'sale'
                                ? 'var(--color-info-bg)'
                                : 'var(--color-warning-bg)',
                            color:
                              property.type === 'sale'
                                ? 'var(--color-info-dark)'
                                : 'var(--color-warning-dark)',
                          }}
                        />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Chip
                          size="small"
                          label={statusLabels[property.status] || property.status}
                          sx={{ height: 22, fontSize: '0.6875rem' }}
                        />
                      </TableCell>

                      {/* Active Toggle */}
                      <TableCell align="center">
                        <Switch
                          size="small"
                          checked={property.isActive ?? property.is_active ?? false}
                          onChange={() =>
                            handleToggleActive(property.id, property.isActive ?? property.is_active)
                          }
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

                      {/* Actions */}
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/admin/properties/edit/${property.id}`)}
                              sx={{
                                color: 'var(--color-text-muted)',
                                '&:hover': { color: 'var(--color-charcoal)' },
                              }}
                            >
                              <Icon icon="mdi:pencil-outline" style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip
                            title={
                              (property.isActive ?? property.is_active) ? 'Deactivate' : 'Activate'
                            }
                          >
                            <IconButton
                              size="small"
                              onClick={() => handleToggleActive(property.id, property.isActive)}
                              sx={{
                                color:
                                  (property.isActive ?? property.is_active)
                                    ? 'var(--color-warning)'
                                    : 'var(--color-success)',
                                '&:hover': {
                                  color:
                                    (property.isActive ?? property.is_active)
                                      ? 'var(--color-warning)'
                                      : 'var(--color-success-dark)',
                                },
                              }}
                            >
                              <Icon
                                icon={
                                  (property.isActive ?? property.is_active)
                                    ? 'mdi:eye-off-outline'
                                    : 'mdi:eye-outline'
                                }
                                style={{ fontSize: 18 }}
                              />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  id: property.id,
                                  title: property.title,
                                  bulk: false,
                                })
                              }
                              sx={{
                                color: 'var(--color-error-dark)',
                                '&:hover': { color: 'var(--color-error-dark)' },
                              }}
                            >
                              <Icon icon="mdi:delete-outline" style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Pagination */}
      {!loading && filteredProperties.length > 0 && (
        <TablePagination
          component="div"
          count={filteredProperties.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{ mt: 1 }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null, title: '', bulk: false })}
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'var(--color-text-muted)' }}>
            {deleteDialog.bulk
              ? `Are you sure you want to delete ${selected.length} selected properties? This action cannot be undone.`
              : `Are you sure you want to delete "${deleteDialog.title}"? This action cannot be undone.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, id: null, title: '', bulk: false })}
            sx={{ color: 'var(--color-text-muted)' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            sx={{
              bgcolor: 'var(--color-error)',
              '&:hover': { bgcolor: 'var(--color-error)' },
              borderRadius: 2,
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminProperties;
