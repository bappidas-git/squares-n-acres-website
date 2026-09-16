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
  Divider,
} from '@mui/material';
import { Icon } from '@iconify/react';
import leadService from '../../services/leadService';
import { useToast } from '../../components/common/ToastProvider';
import { toneStyles } from '../../components/ui/tones';
import { LEAD_SOURCES, LEAD_STATUS } from '../../config/enums';

/**
 * The lead vocabulary, from the one place that owns it (§6.17).
 *
 * This screen is rewritten in prompt 29; until then it reads `LEAD_STATUS` and
 * `LEAD_SOURCES` in the shape it already speaks — a map by value, an ordered
 * list of values, and a label for any source a record carries.
 */
const statusConfig = Object.fromEntries(
  LEAD_STATUS.entries.map(({ value, ...rest }) => [value, rest])
);
const statusOptions = LEAD_STATUS.values;
const formatSource = LEAD_SOURCES.labelOfAny;

// Safe date formatting — never shows "Invalid Date"
const formatDate = (
  dateStr,
  options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', options);
};

const LeadDetail = () => {
  const toast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Note input
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Status change
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Build activity timeline from lead data
  const buildTimeline = useCallback((leadData) => {
    if (!leadData) return [];
    const events = [];

    const createdDate = leadData.createdAt;
    const updatedDate = leadData.updatedAt || leadData.updated_at;

    // Lead created event
    events.push({
      type: 'created',
      text: 'Lead created',
      detail: `via ${formatSource(leadData.source)}`,
      date: createdDate,
      icon: 'mdi:account-plus-outline',
      color: 'var(--color-info-dark)',
    });

    // Note events
    (leadData.notes || []).forEach((note) => {
      events.push({
        type: 'note',
        text: 'Note added',
        detail: note.text,
        date: note.createdAt,
        icon: 'mdi:note-edit-outline',
        color: 'var(--color-primary-dark)',
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
        tone: statusConfig[leadData.status]?.tone || 'neutral',
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

  // One call: the API embeds `property` and `assignedUser` on the lead (§5.5).
  const fetchLead = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await leadService.adminGet(id);
      setLead(data);
      setProperty(data?.property ?? null);
      setError(null);
    } catch (thrown) {
      setError(thrown?.message || 'Failed to load lead details. Please try again.');
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
      const { data } = await leadService.patch(lead.id, { status: newStatus });
      setLead(data);
      toast.success(`Status updated to ${statusConfig[newStatus].label}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle add note
  const handleAddNote = async () => {
    if (!noteText.trim() || !lead) return;
    setAddingNote(true);
    try {
      // The endpoint answers with the whole lead, notes included (§5.14).
      const { data } = await leadService.addNote(lead.id, noteText.trim());
      setLead(data);
      setNoteText('');
      toast.success('Note added successfully');
    } catch {
      toast.error('Failed to add note');
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
  const sCfg = lead ? statusConfig[lead.status] || statusConfig.new : statusConfig.new;

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
          sx={{ mb: 2, color: 'var(--color-text-muted)' }}
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
            sx={{
              color: 'var(--color-text-muted)',
              minWidth: 'auto',
              '&:hover': { color: 'var(--color-charcoal)' },
            }}
          >
            Back
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--color-charcoal)' }}>
            {lead.name}
          </Typography>
          <Chip
            size="small"
            label={sCfg.label}
            sx={{
              height: 24,
              fontSize: '0.75rem',
              fontWeight: 600,
              bgcolor: toneStyles(sCfg.tone).background,
              color: toneStyles(sCfg.tone).color,
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
            sx={{
              borderRadius: 2,
              borderColor: 'var(--color-success)',
              color: 'var(--color-success-dark)',
              '&:hover': {
                borderColor: 'var(--color-success)',
                bgcolor: 'var(--color-success-bg)',
              },
            }}
          >
            Call
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Icon icon="mdi:email-outline" />}
            href={`mailto:${lead.email}`}
            sx={{
              borderRadius: 2,
              borderColor: 'var(--color-info)',
              color: 'var(--color-info-dark)',
              '&:hover': { borderColor: 'var(--color-info)', bgcolor: 'var(--color-info-bg)' },
            }}
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
            sx={{
              borderRadius: 2,
              borderColor: 'var(--color-whatsapp)',
              color: 'var(--color-whatsapp)',
              '&:hover': { borderColor: 'var(--color-whatsapp)', bgcolor: 'rgba(37,211,102,0.05)' },
            }}
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
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: 'var(--color-charcoal)', mb: 2 }}
            >
              Lead Information
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Name */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Icon
                  icon="mdi:account-outline"
                  style={{ fontSize: 20, color: 'var(--color-text-muted)', marginTop: 2 }}
                />
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: 'var(--color-text-muted)', display: 'block' }}
                  >
                    Full Name
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, color: 'var(--color-charcoal)' }}
                  >
                    {lead.name}
                  </Typography>
                </Box>
              </Box>

              {/* Email */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Icon
                  icon="mdi:email-outline"
                  style={{ fontSize: 20, color: 'var(--color-text-muted)', marginTop: 2 }}
                />
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: 'var(--color-text-muted)', display: 'block' }}
                  >
                    Email
                  </Typography>
                  <Typography
                    variant="body2"
                    component="a"
                    href={`mailto:${lead.email}`}
                    sx={{
                      fontWeight: 500,
                      color: 'var(--color-info-dark)',
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {lead.email}
                  </Typography>
                </Box>
              </Box>

              {/* Phone */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Icon
                  icon="mdi:phone-outline"
                  style={{ fontSize: 20, color: 'var(--color-text-muted)', marginTop: 2 }}
                />
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: 'var(--color-text-muted)', display: 'block' }}
                  >
                    Phone
                  </Typography>
                  <Typography
                    variant="body2"
                    component="a"
                    href={`tel:${lead.phone}`}
                    sx={{
                      fontWeight: 500,
                      color: 'var(--color-info-dark)',
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {lead.phone}
                  </Typography>
                </Box>
              </Box>

              {/* Source */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Icon
                  icon="mdi:source-branch"
                  style={{ fontSize: 20, color: 'var(--color-text-muted)', marginTop: 2 }}
                />
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: 'var(--color-text-muted)', display: 'block' }}
                  >
                    Source
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, color: 'var(--color-charcoal)' }}
                  >
                    {formatSource(lead.source)}
                  </Typography>
                </Box>
              </Box>

              {/* Property Link */}
              {property && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Icon
                    icon="mdi:home-city-outline"
                    style={{ fontSize: 20, color: 'var(--color-text-muted)', marginTop: 2 }}
                  />
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: 'var(--color-text-muted)', display: 'block' }}
                    >
                      Linked Property
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        color: 'var(--color-primary-dark)',
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                      onClick={() => navigate(`/admin/properties/edit/${property.id}`)}
                    >
                      {property.title}
                    </Typography>
                    {property.location && (
                      <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>
                        {property.location.area}, {property.location.city}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}

              {/* Message */}
              {lead.message && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Icon
                    icon="mdi:message-text-outline"
                    style={{ fontSize: 20, color: 'var(--color-text-muted)', marginTop: 2 }}
                  />
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: 'var(--color-text-muted)', display: 'block' }}
                    >
                      Message
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}
                    >
                      {lead.message}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Dates */}
              <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: 'var(--color-text-muted)', display: 'block' }}
                  >
                    Created
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 500, color: 'var(--color-text-muted)' }}
                  >
                    {formatDate(lead.createdAt)}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: 'var(--color-text-muted)', display: 'block' }}
                  >
                    Last Updated
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 500, color: 'var(--color-text-muted)' }}
                  >
                    {formatDate(lead.updatedAt || lead.updated_at)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* Status Change Card */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: 'var(--color-charcoal)', mb: 2 }}
            >
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
                            bgcolor: toneStyles(cfg.tone).border,
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
                      bgcolor:
                        isActive || isPast
                          ? toneStyles(cfg.tone).background
                          : 'var(--color-surface)',
                      border: isActive
                        ? `2px solid ${toneStyles(cfg.tone).border}`
                        : '2px solid transparent',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: isActive ? 700 : 500,
                        color:
                          isActive || isPast
                            ? toneStyles(cfg.tone).color
                            : 'var(--color-text-muted)',
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
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: 'var(--color-charcoal)', mb: 2 }}
            >
              Notes
              {lead.notes?.length > 0 && (
                <Chip
                  size="small"
                  label={lead.notes.length}
                  sx={{
                    ml: 1,
                    height: 20,
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    bgcolor: 'var(--color-surface)',
                    color: 'var(--color-text-muted)',
                  }}
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
                sx={{
                  borderRadius: 2,
                  bgcolor: 'var(--color-charcoal)',
                  '&:hover': { bgcolor: 'var(--color-charcoal)' },
                }}
              >
                {addingNote ? 'Adding...' : 'Add Note'}
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Notes List */}
            {!lead.notes || lead.notes.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Icon
                  icon="mdi:note-text-outline"
                  style={{ fontSize: 36, color: 'var(--color-text-muted)' }}
                />
                <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', mt: 1 }}>
                  No notes yet
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[...lead.notes]
                  .sort((a, b) => {
                    const da = new Date(a.createdAt || 0);
                    const db = new Date(b.createdAt || 0);
                    return db - da;
                  })
                  .map((note, i) => (
                    <Box
                      key={i}
                      sx={{
                        p: 2,
                        bgcolor: 'var(--color-surface)',
                        borderRadius: 2,
                        borderLeft: '3px solid var(--color-primary)',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ color: 'var(--color-text)', lineHeight: 1.6 }}
                      >
                        {note.text}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: 'var(--color-text-muted)', mt: 0.5, display: 'block' }}
                      >
                        {formatDate(note.createdAt)}
                      </Typography>
                    </Box>
                  ))}
              </Box>
            )}
          </Paper>

          {/* Activity Timeline */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: 'var(--color-charcoal)', mb: 2 }}
            >
              Activity Timeline
            </Typography>

            {timeline.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Icon
                  icon="mdi:timeline-outline"
                  style={{ fontSize: 36, color: 'var(--color-text-muted)' }}
                />
                <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', mt: 1 }}>
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
                          bgcolor: 'var(--color-surface-2)',
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
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: 'var(--color-charcoal)',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {event.text}
                      </Typography>
                      {event.detail && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'var(--color-text-muted)',
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
                      <Typography
                        variant="caption"
                        sx={{ color: 'var(--color-text-muted)', mt: 0.25, display: 'block' }}
                      >
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
  return <>{detailContent}</>;
};

export default LeadDetail;
