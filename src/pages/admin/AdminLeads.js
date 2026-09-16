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
  Card,
  CardContent,
  InputAdornment,
  Tooltip,
  Menu,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Icon } from '@iconify/react';
import leadService from '../../services/leadService';
import useDebounce from '../../hooks/useDebounce';
import { useLeadNotifications } from '../../contexts/LeadNotificationsContext';
import { useToast } from '../../components/common/ToastProvider';
import { toneStyles } from '../../components/ui/tones';
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
  return d.toLocaleDateString(
    'en-IN',
    options || { day: 'numeric', month: 'short', year: 'numeric' }
  );
};

const AdminLeads = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Data state
  const [leads, setLeads] = useState([]);
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

  // Mobile expanded card
  const [expandedCard, setExpandedCard] = useState(null);

  // Export loading state
  const [exporting, setExporting] = useState(false);

  // The single poller (D45/D55) lives in `LeadNotificationsContext`; this
  // screen only reacts to it.
  const { lastUpdatedAt } = useLeadNotifications();
  const seenUpdateRef = useRef(lastUpdatedAt);

  // Build filter params object for API calls
  // The filter names the API reads (§5.14); `q`, not `search`.
  const buildFilterParams = useCallback(() => {
    const params = { perPage: 100, sort: 'createdAt', order: 'desc' };
    if (debouncedSearch) params.q = debouncedSearch;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (sourceFilter !== 'all') params.source = sourceFilter;
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;
    return params;
  }, [debouncedSearch, statusFilter, sourceFilter, dateFrom, dateTo]);

  // Fetch leads with API-driven filters; the API sorts and embeds `property`.
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await leadService.adminList(buildFilterParams());
      setLeads(Array.isArray(data) ? data : []);
      setError(null);
    } catch (thrown) {
      setError(thrown?.message || 'Failed to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams]);

  // Re-fetch leads when filters change
  useEffect(() => {
    fetchLeads();
    setPage(0);
  }, [fetchLeads]);

  // Every poll of `LeadNotificationsContext` moves `lastUpdatedAt`; that is the
  // signal to refresh the table. The toast for a genuinely new lead belongs to
  // the context, so it fires once per lead however many screens are open.
  useEffect(() => {
    if (lastUpdatedAt === seenUpdateRef.current) return;
    seenUpdateRef.current = lastUpdatedAt;
    fetchLeads();
  }, [lastUpdatedAt, fetchLeads]);

  // The API embeds `lead.property = { id, title, slug }` (§5.5).
  const getPropertyTitle = (lead) => lead?.property?.title ?? null;

  // Status change handler
  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await leadService.patch(leadId, { status: newStatus });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, status: newStatus, updatedAt: new Date().toISOString() } : l
        )
      );
      toast.success(`Status updated to ${statusConfig[newStatus].label}`);
    } catch {
      toast.error('Failed to update status');
    }
    setStatusAnchor(null);
    setStatusLeadId(null);
  };

  // Delete handler
  const handleDelete = async () => {
    try {
      await leadService.remove(deleteDialog.id);
      setLeads((prev) => prev.filter((l) => l.id !== deleteDialog.id));
      toast.success('Lead deleted successfully');
    } catch {
      toast.error('Failed to delete lead');
    } finally {
      setDeleteDialog({ open: false, id: null, name: '' });
    }
  };

  // Export to CSV — fetches fresh filtered data from API
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Fetch filtered leads from API (not from local state)
      const { data: exportData } = await leadService.adminList(buildFilterParams());

      const headers = ['Name', 'Email', 'Phone', 'Source', 'Property', 'Status', 'Message', 'Date'];
      const rows = exportData.map((l) => [
        l.name || '',
        l.email || '',
        l.phone || '',
        formatSource(l.source),
        getPropertyTitle(l) || '',
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
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  // Count new leads
  const newLeadCount = leads.filter((l) => l.status === 'new').length;

  const currentPageData = leads.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--color-charcoal)' }}>
              Lead Management
            </Typography>
            <Chip
              size="small"
              label={`${leads.length} total`}
              sx={{
                height: 24,
                fontSize: '0.75rem',
                fontWeight: 600,
                bgcolor: 'var(--color-surface)',
                color: 'var(--color-text-muted)',
              }}
            />
            {newLeadCount > 0 && (
              <Chip
                size="small"
                label={`${newLeadCount} new`}
                sx={{
                  height: 24,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  bgcolor: 'var(--color-info-bg)',
                  color: 'var(--color-info-dark)',
                }}
              />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', mt: 0.5 }}>
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
                        bgcolor: toneStyles(statusConfig[s].tone).border,
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
              sx={{ color: 'var(--color-text-muted)' }}
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
              <Icon
                icon="mdi:account-search-outline"
                style={{ fontSize: 48, color: 'var(--color-text-muted)' }}
              />
              <Typography variant="body1" sx={{ color: 'var(--color-text-muted)', mt: 1 }}>
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
                    borderLeft: `4px solid ${toneStyles(sCfg.tone).border}`,
                  }}
                  onClick={() => setExpandedCard(isExpanded ? null : lead.id)}
                >
                  <CardContent sx={{ pb: isExpanded ? 2 : '16px !important' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 600, color: 'var(--color-charcoal)' }}
                        >
                          {lead.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: 'var(--color-text-muted)', display: 'block' }}
                        >
                          {lead.email}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>
                          {formatSource(lead.source)} &middot;{' '}
                          {formatDate(lead.createdAt || lead.created_at, {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={sCfg.label}
                        sx={{
                          height: 22,
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          bgcolor: toneStyles(sCfg.tone).background,
                          color: toneStyles(sCfg.tone).color,
                        }}
                      />
                    </Box>

                    {isExpanded && (
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid var(--color-border)' }}>
                        <Typography
                          variant="caption"
                          sx={{ color: 'var(--color-text-muted)', display: 'block', mb: 0.5 }}
                        >
                          Phone: {lead.phone}
                        </Typography>
                        {lead.message && (
                          <Typography
                            variant="caption"
                            sx={{ color: 'var(--color-text-muted)', display: 'block', mb: 1 }}
                          >
                            "{lead.message}"
                          </Typography>
                        )}
                        {lead.propertyId && (
                          <Typography
                            variant="caption"
                            sx={{ color: 'var(--color-primary-dark)', display: 'block', mb: 1 }}
                          >
                            Property: {getPropertyTitle(lead) || `#${lead.propertyId}`}
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
                            sx={{
                              borderRadius: 2,
                              fontSize: '0.75rem',
                              bgcolor: 'var(--color-charcoal)',
                            }}
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
                            sx={{
                              borderRadius: 2,
                              fontSize: '0.75rem',
                              borderColor: 'var(--color-error)',
                              color: 'var(--color-error-dark)',
                            }}
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
                <TableRow sx={{ bgcolor: 'var(--color-surface)' }}>
                  <TableCell
                    sx={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem' }}
                  >
                    Name
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem' }}
                  >
                    Contact
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem' }}
                  >
                    Source
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem' }}
                  >
                    Property
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem' }}
                  >
                    Status
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem' }}
                  >
                    Date
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
                        style={{ fontSize: 48, color: 'var(--color-text-muted)' }}
                      />
                      <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', mt: 1 }}>
                        No leads found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentPageData.map((lead) => {
                    const sCfg = statusConfig[lead.status] || statusConfig.new;
                    const propTitle = getPropertyTitle(lead);
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
                            sx={{
                              fontWeight: 600,
                              color: 'var(--color-charcoal)',
                              fontSize: '0.8125rem',
                            }}
                          >
                            {lead.name}
                          </Typography>
                        </TableCell>

                        {/* Contact */}
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}
                          >
                            {lead.email}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>
                            {lead.phone}
                          </Typography>
                        </TableCell>

                        {/* Source */}
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}
                          >
                            {formatSource(lead.source)}
                          </Typography>
                        </TableCell>

                        {/* Property */}
                        <TableCell>
                          {propTitle ? (
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'var(--color-primary-dark)',
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
                            <Typography
                              variant="body2"
                              sx={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}
                            >
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
                              bgcolor: toneStyles(sCfg.tone).background,
                              color: toneStyles(sCfg.tone).color,
                              cursor: 'pointer',
                              '&:hover': { opacity: 0.85 },
                            }}
                          />
                        </TableCell>

                        {/* Date */}
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'var(--color-text-muted)',
                              fontSize: '0.75rem',
                              whiteSpace: 'nowrap',
                            }}
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
                                sx={{
                                  color: 'var(--color-text-muted)',
                                  '&:hover': { color: 'var(--color-charcoal)' },
                                }}
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
                                sx={{
                                  color: 'var(--color-text-muted)',
                                  '&:hover': { color: 'var(--color-warning-dark)' },
                                }}
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
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
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
                    bgcolor: toneStyles(cfg.tone).border,
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
        <DialogTitle sx={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>
          Delete Lead
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'var(--color-text-muted)' }}>
            Are you sure you want to delete the lead from <strong>{deleteDialog.name}</strong>? This
            action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, id: null, name: '' })}
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

export default AdminLeads;
