import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Skeleton,
  Alert,
  Snackbar,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { leadService, propertyService } from '../../services/api';
import {
  LEAD_STATUS_CONFIG as statusConfig,
  LEAD_STATUS_OPTIONS as statusOptions,
  formatLeadSource as formatSource,
} from '../../config/adminConstants';

// Safe date formatting — never shows "Invalid Date"
const formatDate = (dateStr, options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', options);
};

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [lead, setLead] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Note input
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Status change
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Build activity timeline from lead data
  const buildTimeline = useCallback((leadData) => {
    if (!leadData) return [];
    const events = [];

    const createdDate = leadData.createdAt || leadData.created_at;
    const updatedDate = leadData.updatedAt || leadData.updated_at;

    // Lead created event
    events.push({
      type: 'created',
      text: 'Lead created',
      detail: `via ${formatSource(leadData.source)}`,
      date: createdDate,
      icon: 'mdi:account-plus-outline',
      color: '#3B82F6',
    });

    // Note events
    (leadData.notes || []).forEach((note) => {
      events.push({
        type: 'note',
        text: 'Note added',
        detail: note.text,
        date: note.addedAt || note.added_at || note.created_at,
        icon: 'mdi:note-edit-outline',
        color: '#8B5CF6',
      });
    });

    // Status change event (simulated from updatedAt if different from createdAt)
    if (leadData.status !== 'new' && updatedDate !== createdDate) {
      events.push({
        type: 'status',
        text: `Status changed to ${statusConfig[leadData.status]?.label || leadData.status}`,
        detail: '',
        date: updatedDate,
        icon: statusConfig[leadData.status]?.icon || 'mdi:swap-horizontal',
        color: statusConfig[leadData.status]?.color || '#6B7280',
      });
    }

    // Sort newest first, handle null/invalid dates gracefully
    events.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
    });
    return events;
  }, []);

  // Fetch lead data
  const fetchLead = useCallback(async () => {
    try {
      setLoading(true);
      const leadData = await leadService.getById(id);
      setLead(leadData);

      if (leadData.propertyId) {
        try {
          const propData = await propertyService.getById(leadData.propertyId);
          setProperty(propData);
        } catch {
          setProperty(null);
          setSnackbar({ open: true, message: 'Could not load linked property details', severity: 'warning' });
        }
      }
      setError(null);
    } catch (err) {
      setError('Failed to load lead details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    if (!lead || lead.status === newStatus) return;
    setUpdatingStatus(true);
    try {
      await leadService.update(lead.id, { status: newStatus });
      // Refetch full lead to get accurate updated data
      const freshLead = await leadService.getById(lead.id);
      setLead(freshLead);
      setSnackbar({
        open: true,
        message: `Status updated to ${statusConfig[newStatus].label}`,
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle add note
  const handleAddNote = async () => {
    if (!noteText.trim() || !lead) return;
    setAddingNote(true);
    try {
      await leadService.addNote(lead.id, noteText.trim());
      // Optimistically append the note so Notes + Timeline update instantly
      const optimisticNote = { text: noteText.trim(), addedAt: new Date().toISOString() };
      setLead((prev) => ({
        ...prev,
        notes: [...(prev.notes || []), optimisticNote],
        updatedAt: new Date().toISOString(),
      }));
      setNoteText('');
      setSnackbar({ open: true, message: 'Note added successfully', severity: 'success' });
      // Refetch in the background to reconcile with server data
      try {
        const freshLead = await leadService.getById(lead.id);
        setLead(freshLead);
      } catch {
        // Keep optimistic update if background refetch fails
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to add note', severity: 'error' });
    } finally {
      setAddingNote(false);
    }
  };

  // Generate WhatsApp link
  const getWhatsAppLink = (phone) => {
    if (!phone) return '#';
    const cleaned = phone.replace(/[^\d+]/g, '');
    return `https://wa.me/${cleaned}`;
  };

  const timeline = buildTimeline(lead);
  const sCfg = lead ? (statusConfig[lead.status] || statusConfig.new) : statusConfig.new;

  if (loading) {
    return (
      <Box>
        <Skeleton width={200} height={40} />
        <Skeleton width="100%" height={200} sx={{ mt: 2, borderRadius: 3 }} />
        <Skeleton width="100%" height={300} sx={{ mt: 2, borderRadius: 3 }} />
      </Box>
    );
  }

  if (error || !lead) {
    return (
      <Box>
        <Button
          startIcon={<Icon icon="mdi:arrow-left" />}
          onClick={() => navigate('/admin/leads')}
          sx={{ mb: 2, color: '#6B7280' }}
        >
          Back to Leads
        </Button>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error || 'Lead not found'}
        </Alert>
      </Box>
    );
  }

  const detailContent = (
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            startIcon={<Icon icon="mdi:arrow-left" />}
            onClick={() => navigate('/admin/leads')}
            sx={{ color: '#6B7280', minWidth: 'auto', '&:hover': { color: '#1B2A4A' } }}
          >
            Back
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1B2A4A' }}>
            {lead.name}
          </Typography>
          <Chip
            size="small"
            label={sCfg.label}
            sx={{
              height: 24,
              fontSize: '0.75rem',
              fontWeight: 600,
              bgcolor: sCfg.bg,
              color: sCfg.color,
            }}
          />
        </Box>

        {/* Quick Actions */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Icon icon="mdi:phone-outline" />}
            href={`tel:${lead.phone}`}
            sx={{ borderRadius: 2, borderColor: '#10B981', color: '#10B981', '&:hover': { borderColor: '#059669', bgcolor: '#ECFDF5' } }}
          >
            Call
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Icon icon="mdi:email-outline" />}
            href={`mailto:${lead.email}`}
            sx={{ borderRadius: 2, borderColor: '#3B82F6', color: '#3B82F6', '&:hover': { borderColor: '#2563EB', bgcolor: '#EFF6FF' } }}
          >
            Email
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Icon icon="mdi:whatsapp" />}
            href={getWhatsAppLink(lead.phone)}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ borderRadius: 2, borderColor: '#25D366', color: '#25D366', '&:hover': { borderColor: '#128C7E', bgcolor: 'rgba(37,211,102,0.05)' } }}
          >
            WhatsApp
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
        }}
      >
        {/* Left Column: Lead Info + Status */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Lead Information Card */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1B2A4A', mb: 2 }}>
              Lead Information
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Name */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Icon icon="mdi:account-outline" style={{ fontSize: 20, color: '#9CA3AF', marginTop: 2 }} />
                <Box>
                  <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block' }}>
                    Full Name
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#1B2A4A' }}>
                    {lead.name}
                  </Typography>
                </Box>
              </Box>

              {/* Email */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Icon icon="mdi:email-outline" style={{ fontSize: 20, color: '#9CA3AF', marginTop: 2 }} />
                <Box>
                  <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block' }}>
                    Email
                  </Typography>
                  <Typography
                    variant="body2"
                    component="a"
                    href={`mailto:${lead.email}`}
                    sx={{ fontWeight: 500, color: '#3B82F6', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    {lead.email}
                  </Typography>
                </Box>
              </Box>

              {/* Phone */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Icon icon="mdi:phone-outline" style={{ fontSize: 20, color: '#9CA3AF', marginTop: 2 }} />
                <Box>
                  <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block' }}>
                    Phone
                  </Typography>
                  <Typography
                    variant="body2"
                    component="a"
                    href={`tel:${lead.phone}`}
                    sx={{ fontWeight: 500, color: '#3B82F6', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    {lead.phone}
                  </Typography>
                </Box>
              </Box>

              {/* Source */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Icon icon="mdi:source-branch" style={{ fontSize: 20, color: '#9CA3AF', marginTop: 2 }} />
                <Box>
                  <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block' }}>
                    Source
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#1B2A4A' }}>
                    {formatSource(lead.source)}
                  </Typography>
                </Box>
              </Box>

              {/* Property Link */}
              {property && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Icon icon="mdi:home-city-outline" style={{ fontSize: 20, color: '#9CA3AF', marginTop: 2 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block' }}>
                      Linked Property
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        color: '#C9A86C',
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                      onClick={() => navigate(`/admin/properties/edit/${property.id}`)}
                    >
                      {property.title}
                    </Typography>
                    {property.location && (
                      <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                        {property.location.area}, {property.location.city}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}

              {/* Message */}
              {lead.message && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Icon icon="mdi:message-text-outline" style={{ fontSize: 20, color: '#9CA3AF', marginTop: 2 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block' }}>
                      Message
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#4B5563', lineHeight: 1.6 }}>
                      {lead.message}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Dates */}
              <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block' }}>
                    Created
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 500, color: '#6B7280' }}>
                    {formatDate(lead.createdAt || lead.created_at)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block' }}>
                    Last Updated
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 500, color: '#6B7280' }}>
                    {formatDate(lead.updatedAt || lead.updated_at)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* Status Change Card */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1B2A4A', mb: 2 }}>
              Status
            </Typography>
            <FormControl fullWidth size="small" disabled={updatingStatus}>
              <InputLabel>Lead Status</InputLabel>
              <Select
                value={lead.status}
                label="Lead Status"
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                {statusOptions.map((s) => {
                  const cfg = statusConfig[s];
                  return (
                    <MenuItem key={s} value={s}>
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
              </Select>
            </FormControl>

            {/* Status Pipeline Visual */}
            <Box sx={{ display: 'flex', gap: 0.5, mt: 2, overflowX: 'auto' }}>
              {statusOptions.map((s, i) => {
                const cfg = statusConfig[s];
                const isActive = lead.status === s;
                const isPast = statusOptions.indexOf(lead.status) > i;
                return (
                  <Box
                    key={s}
                    sx={{
                      flex: 1,
                      minWidth: 60,
                      py: 0.75,
                      px: 1,
                      borderRadius: 1,
                      textAlign: 'center',
                      bgcolor: isActive ? cfg.bg : isPast ? `${cfg.color}15` : '#F9FAFB',
                      border: isActive ? `2px solid ${cfg.color}` : '2px solid transparent',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? cfg.color : isPast ? cfg.color : '#9CA3AF',
                        fontSize: '0.625rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cfg.label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Box>

        {/* Right Column: Notes + Activity Timeline */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Notes Section */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1B2A4A', mb: 2 }}>
              Notes
              {lead.notes?.length > 0 && (
                <Chip
                  size="small"
                  label={lead.notes.length}
                  sx={{ ml: 1, height: 20, fontSize: '0.6875rem', fontWeight: 600, bgcolor: '#F3F4F6', color: '#6B7280' }}
                />
              )}
            </Typography>

            {/* Add Note Input */}
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                placeholder="Add a note about this lead..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                disabled={addingNote}
                sx={{ mb: 1 }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleAddNote}
                disabled={!noteText.trim() || addingNote}
                startIcon={<Icon icon="mdi:plus" />}
                sx={{ borderRadius: 2, bgcolor: '#1B2A4A', '&:hover': { bgcolor: '#2D4470' } }}
              >
                {addingNote ? 'Adding...' : 'Add Note'}
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Notes List */}
            {(!lead.notes || lead.notes.length === 0) ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Icon icon="mdi:note-text-outline" style={{ fontSize: 36, color: '#D1D5DB' }} />
                <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 1 }}>
                  No notes yet
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[...lead.notes]
                  .sort((a, b) => {
                    const da = new Date(a.addedAt || a.added_at || a.created_at || 0);
                    const db = new Date(b.addedAt || b.added_at || b.created_at || 0);
                    return db - da;
                  })
                  .map((note, i) => (
                    <Box
                      key={i}
                      sx={{
                        p: 2,
                        bgcolor: '#F9FAFB',
                        borderRadius: 2,
                        borderLeft: '3px solid #C9A86C',
                      }}
                    >
                      <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6 }}>
                        {note.text}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#9CA3AF', mt: 0.5, display: 'block' }}>
                        {formatDate(note.addedAt || note.added_at || note.created_at)}
                      </Typography>
                    </Box>
                  ))}
              </Box>
            )}
          </Paper>

          {/* Activity Timeline */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1B2A4A', mb: 2 }}>
              Activity Timeline
            </Typography>

            {timeline.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Icon icon="mdi:timeline-outline" style={{ fontSize: 36, color: '#D1D5DB' }} />
                <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 1 }}>
                  No activity yet
                </Typography>
              </Box>
            ) : (
              <Box sx={{ position: 'relative' }}>
                {timeline.map((event, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      gap: 2,
                      pb: i < timeline.length - 1 ? 2.5 : 0,
                      position: 'relative',
                    }}
                  >
                    {/* Timeline line */}
                    {i < timeline.length - 1 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 15,
                          top: 32,
                          bottom: 0,
                          width: 2,
                          bgcolor: '#E5E7EB',
                        }}
                      />
                    )}

                    {/* Timeline dot */}
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: `${event.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        zIndex: 1,
                      }}
                    >
                      <Icon icon={event.icon} style={{ fontSize: 16, color: event.color }} />
                    </Box>

                    {/* Timeline content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1B2A4A', fontSize: '0.8125rem' }}>
                        {event.text}
                      </Typography>
                      {event.detail && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#6B7280',
                            display: 'block',
                            mt: 0.25,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            ...(event.type === 'note' ? {} : { whiteSpace: 'nowrap' }),
                          }}
                        >
                          {event.detail}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ color: '#9CA3AF', mt: 0.25, display: 'block' }}>
                        {formatDate(event.date)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );

  // On mobile, render as full page; on desktop, render inline
  return (
    <>
      {detailContent}

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
    </>
  );
};

export default LeadDetail;
