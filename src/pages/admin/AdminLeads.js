import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Skeleton,
  Alert,
  Snackbar,
  Card,
  CardContent,
  InputAdornment,
  Tooltip,
  Menu,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { leadService, propertyService } from '../../services/api';
import useDebounce from '../../hooks/useDebounce';
import {
  LEAD_STATUS_CONFIG as statusConfig,
  LEAD_STATUS_OPTIONS as statusOptions,
  LEAD_SOURCE_OPTIONS as sourceOptions,
  formatLeadSource as formatSource,
} from '../../config/adminConstants';

// Safe date formatting — never shows "Invalid Date"
const formatDate = (dateStr, options) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', options || { day: 'numeric', month: 'short', year: 'numeric' });
};

const AdminLeads = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Data state
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Debounce search input for API calls
  const debouncedSearch = useDebounce(searchQuery, 400);

  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Status change menu
  const [statusAnchor, setStatusAnchor] = useState(null);
  const [statusLeadId, setStatusLeadId] = useState(null);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, name: '' });

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Mobile expanded card
  const [expandedCard, setExpandedCard] = useState(null);

  // Export loading state
  const [exporting, setExporting] = useState(false);

  // Polling ref for new lead count
  const lastLeadCountRef = useRef(0);

  // Build filter params object for API calls
  const buildFilterParams = useCallback(() => {
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (sourceFilter !== 'all') params.source = sourceFilter;
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;
    return params;
  }, [debouncedSearch, statusFilter, sourceFilter, dateFrom, dateTo]);

  // Fetch properties once on mount (separate from leads)
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const propsData = await propertyService.getAll();
        setProperties(propsData);
      } catch {
        // Properties are optional for display — silent fail
      }
    };
    fetchProperties();
  }, []);

  // Fetch leads with API-driven filters
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = buildFilterParams();
      const leadsData = await leadService.getAll(params);
      const sorted = [...leadsData].sort(
        (a, b) => {
          const da = new Date(a.createdAt || a.created_at || 0);
          const db = new Date(b.createdAt || b.created_at || 0);
          return db - da;
        }
      );
      setLeads(sorted);
      lastLeadCountRef.current = sorted.length;
      setError(null);
    } catch (err) {
      setError('Failed to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams]);

  // Re-fetch leads when filters change
  useEffect(() => {
    fetchLeads();
    setPage(0);
  }, [fetchLeads]);

  // Polling for new leads every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Poll without filters to detect any new leads across the system
        const allLeads = await leadService.getAll();
        if (allLeads.length > lastLeadCountRef.current) {
          const newCount = allLeads.length - lastLeadCountRef.current;
          lastLeadCountRef.current = allLeads.length;
          // Re-fetch with current filters to update the display
          fetchLeads();
          setSnackbar({
            open: true,
            message: `${newCount} new lead${newCount > 1 ? 's' : ''} received`,
            severity: 'info',
          });
        }
      } catch {
        // silent fail for polling
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  // Get property title by id
  const getPropertyTitle = (propertyId) => {
    const prop = properties.find((p) => p.id === propertyId);
    return prop ? prop.title : null;
  };

  // Status change handler
  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await leadService.update(leadId, { status: newStatus });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, status: newStatus, updatedAt: new Date().toISOString() } : l
        )
      );
      setSnackbar({
        open: true,
        message: `Status updated to ${statusConfig[newStatus].label}`,
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    }
    setStatusAnchor(null);
    setStatusLeadId(null);
  };

  // Delete handler
  const handleDelete = async () => {
    try {
      await leadService.delete(deleteDialog.id);
      setLeads((prev) => prev.filter((l) => l.id !== deleteDialog.id));
      setSnackbar({ open: true, message: 'Lead deleted successfully', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete lead', severity: 'error' });
    } finally {
      setDeleteDialog({ open: false, id: null, name: '' });
    }
  };

  // Export to CSV — fetches fresh filtered data from API
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Fetch filtered leads from API (not from local state)
      const params = buildFilterParams();
      const exportData = await leadService.getAll(params);

      const headers = ['Name', 'Email', 'Phone', 'Source', 'Property', 'Status', 'Message', 'Date'];
      const rows = exportData.map((l) => [
        l.name || '',
        l.email || '',
        l.phone || '',
        formatSource(l.source),
        l.propertyId ? (getPropertyTitle(l.propertyId) || '') : '',
        statusConfig[l.status]?.label || l.status,
        (l.message || '').replace(/"/g, '""'),
        formatDate(l.createdAt || l.created_at),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setSnackbar({ open: true, message: 'Failed to export CSV', severity: 'error' });
    } finally {
      setExporting(false);
    }
  };

  // Count new leads
  const newLeadCount = leads.filter((l) => l.status === 'new').length;

  const currentPageData = leads.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const hasActiveFilters =
    searchQuery || statusFilter !== 'all' || sourceFilter !== 'all' || dateFrom || dateTo;

  return (
    <Box>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1B2A4A' }}>
              Lead Management
            </Typography>
            <Chip
              size="small"
              label={`${leads.length} total`}
              sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600, bgcolor: '#F3F4F6', color: '#6B7280' }}
            />
            {newLeadCount > 0 && (
              <Chip
                size="small"
                label={`${newLeadCount} new`}
                sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600, bgcolor: '#EFF6FF', color: '#3B82F6' }}
              />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
            Manage and track all incoming leads
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<Icon icon="mdi:download-outline" />}
          onClick={handleExportCSV}
          sx={{ borderRadius: 2 }}
          disabled={leads.length === 0 || exporting}
        >
          {exporting ? 'Exporting...' : 'Export to CSV'}
        </Button>
      </Box>

      {/* Filter Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: 240, flex: { xs: '1 1 100%', md: '0 1 auto' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Icon icon="mdi:magnify" style={{ fontSize: 20, color: '#9CA3AF' }} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              {statusOptions.map((s) => (
                <MenuItem key={s} value={s}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: statusConfig[s].color,
                      }}
                    />
                    {statusConfig[s].label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Source</InputLabel>
            <Select
              value={sourceFilter}
              label="Source"
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              {sourceOptions.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            type="date"
            label="From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />

          <TextField
            size="small"
            type="date"
            label="To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />

          {hasActiveFilters && (
            <Button
              size="small"
              variant="text"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setSourceFilter('all');
                setDateFrom('');
                setDateTo('');
              }}
              startIcon={<Icon icon="mdi:filter-off-outline" />}
              sx={{ color: '#6B7280' }}
            >
              Clear
            </Button>
          )}
        </Box>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Mobile Card View */}
      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Skeleton width="60%" height={24} />
                  <Skeleton width="80%" height={18} sx={{ mt: 1 }} />
                  <Skeleton width="40%" height={18} sx={{ mt: 0.5 }} />
                </CardContent>
              </Card>
            ))
          ) : currentPageData.length === 0 ? (
            <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
              <Icon icon="mdi:account-search-outline" style={{ fontSize: 48, color: '#D1D5DB' }} />
              <Typography variant="body1" sx={{ color: '#9CA3AF', mt: 1 }}>
                No leads found
              </Typography>
            </Paper>
          ) : (
            currentPageData.map((lead) => {
              const sCfg = statusConfig[lead.status] || statusConfig.new;
              const isExpanded = expandedCard === lead.id;
              return (
                <Card
                  key={lead.id}
                  sx={{
                    borderRadius: 3,
                    cursor: 'pointer',
                    borderLeft: `4px solid ${sCfg.color}`,
                  }}
                  onClick={() => setExpandedCard(isExpanded ? null : lead.id)}
                >
                  <CardContent sx={{ pb: isExpanded ? 2 : '16px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
                          {lead.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6B7280', display: 'block' }}>
                          {lead.email}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                          {formatSource(lead.source)} &middot;{' '}
                          {formatDate(lead.createdAt || lead.created_at, { day: 'numeric', month: 'short' })}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={sCfg.label}
                        sx={{
                          height: 22,
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          bgcolor: sCfg.bg,
                          color: sCfg.color,
                        }}
                      />
                    </Box>

                    {isExpanded && (
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #E5E7EB' }}>
                        <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 0.5 }}>
                          Phone: {lead.phone}
                        </Typography>
                        {lead.message && (
                          <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 1 }}>
                            "{lead.message}"
                          </Typography>
                        )}
                        {lead.propertyId && (
                          <Typography variant="caption" sx={{ color: '#C9A86C', display: 'block', mb: 1 }}>
                            Property: {getPropertyTitle(lead.propertyId) || `#${lead.propertyId}`}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/leads/${lead.id}`);
                            }}
                            sx={{ borderRadius: 2, fontSize: '0.75rem', bgcolor: '#1B2A4A' }}
                          >
                            View Details
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteDialog({ open: true, id: lead.id, name: lead.name });
                            }}
                            sx={{ borderRadius: 2, fontSize: '0.75rem', borderColor: '#EF4444', color: '#EF4444' }}
                          >
                            Delete
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </Box>
      ) : (
        /* Desktop Table View */
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>
                    Name
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>
                    Contact
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>
                    Source
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>
                    Property
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>
                    Date
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#6B7280', fontSize: '0.75rem', textAlign: 'right' }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : currentPageData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Icon
                        icon="mdi:account-search-outline"
                        style={{ fontSize: 48, color: '#D1D5DB' }}
                      />
                      <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 1 }}>
                        No leads found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentPageData.map((lead) => {
                    const sCfg = statusConfig[lead.status] || statusConfig.new;
                    const propTitle = lead.propertyId ? getPropertyTitle(lead.propertyId) : null;
                    return (
                      <TableRow
                        key={lead.id}
                        hover
                        sx={{
                          cursor: 'pointer',
                          '&:last-child td': { border: 0 },
                        }}
                        onClick={() => navigate(`/admin/leads/${lead.id}`)}
                      >
                        {/* Name */}
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: '#1B2A4A', fontSize: '0.8125rem' }}
                          >
                            {lead.name}
                          </Typography>
                        </TableCell>

                        {/* Contact */}
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.8125rem' }}>
                            {lead.email}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                            {lead.phone}
                          </Typography>
                        </TableCell>

                        {/* Source */}
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                            {formatSource(lead.source)}
                          </Typography>
                        </TableCell>

                        {/* Property */}
                        <TableCell>
                          {propTitle ? (
                            <Typography
                              variant="body2"
                              sx={{
                                color: '#C9A86C',
                                fontSize: '0.75rem',
                                maxWidth: 160,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {propTitle}
                            </Typography>
                          ) : (
                            <Typography variant="body2" sx={{ color: '#D1D5DB', fontSize: '0.75rem' }}>
                              --
                            </Typography>
                          )}
                        </TableCell>

                        {/* Status (clickable chip) */}
                        <TableCell>
                          <Chip
                            size="small"
                            label={sCfg.label}
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusAnchor(e.currentTarget);
                              setStatusLeadId(lead.id);
                            }}
                            sx={{
                              height: 24,
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              bgcolor: sCfg.bg,
                              color: sCfg.color,
                              cursor: 'pointer',
                              '&:hover': { opacity: 0.85 },
                            }}
                          />
                        </TableCell>

                        {/* Date */}
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ color: '#9CA3AF', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                          >
                            {formatDate(lead.createdAt || lead.created_at)}
                          </Typography>
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="right">
                          <Box
                            sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Tooltip title="View">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/admin/leads/${lead.id}`)}
                                sx={{ color: '#6B7280', '&:hover': { color: '#1B2A4A' } }}
                              >
                                <Icon icon="mdi:eye-outline" style={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Change Status">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  setStatusAnchor(e.currentTarget);
                                  setStatusLeadId(lead.id);
                                }}
                                sx={{ color: '#6B7280', '&:hover': { color: '#F59E0B' } }}
                              >
                                <Icon icon="mdi:swap-horizontal" style={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setDeleteDialog({ open: true, id: lead.id, name: lead.name })
                                }
                                sx={{ color: '#EF4444', '&:hover': { color: '#DC2626' } }}
                              >
                                <Icon icon="mdi:delete-outline" style={{ fontSize: 18 }} />
                              </IconButton>
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
        </Paper>
      )}

      {/* Pagination */}
      {!loading && leads.length > 0 && (
        <TablePagination
          component="div"
          count={leads.length}
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

      {/* Status Change Menu */}
      <Menu
        anchorEl={statusAnchor}
        open={Boolean(statusAnchor)}
        onClose={() => {
          setStatusAnchor(null);
          setStatusLeadId(null);
        }}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 160, mt: 0.5 } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Change Status
          </Typography>
        </Box>
        {statusOptions.map((s) => {
          const cfg = statusConfig[s];
          const currentLead = leads.find((l) => l.id === statusLeadId);
          const isActive = currentLead?.status === s;
          return (
            <MenuItem
              key={s}
              onClick={() => handleStatusChange(statusLeadId, s)}
              selected={isActive}
              sx={{ fontSize: '0.875rem' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: cfg.color,
                  }}
                />
                {cfg.label}
              </Box>
            </MenuItem>
          );
        })}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null, name: '' })}
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: '#1B2A4A' }}>Delete Lead</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#6B7280' }}>
            Are you sure you want to delete the lead from <strong>{deleteDialog.name}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, id: null, name: '' })}
            sx={{ color: '#6B7280' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            sx={{
              bgcolor: '#EF4444',
              '&:hover': { bgcolor: '#DC2626' },
              borderRadius: 2,
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

export default AdminLeads;
