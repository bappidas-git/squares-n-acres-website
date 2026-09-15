import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Skeleton,
  Divider,
  IconButton,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { siteSettingsService } from '../../services/api';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import UserManagement from '../../components/admin/UserManagement';

// Default settings structure — ensures every field exists so inputs are
// always controlled and no value is ever silently dropped.
const DEFAULT_SETTINGS = {
  companyName: '',
  tagline: '',
  companySubtitle: '',
  companyDescription: '',
  contactInfo: { email: '', phone: '', address: '' },
  heroText: { title: '', subtitle: '', backgroundMedia: '', backgroundImage: '' },
  socialLinks: { instagram: '', facebook: '', twitter: '', linkedin: '', youtube: '' },
  newsletterText: '',
  newsletterSubtitle: '',
  footerGallery: [],
  footerLinkGroups: [],
};

// Coerce a value to a string — prevents null / undefined from reaching
// MUI TextField `value` props, which would flip them to uncontrolled mode.
const str = (val) => (val != null ? String(val) : '');

// Build a complete settings object from (possibly partial / nullable) API data.
// Every field is explicitly mapped so that null values from the API never
// override the empty-string defaults and never reach TextField `value` props.
const mergeWithDefaults = (data) => {
  if (!data || typeof data !== 'object') return { ...DEFAULT_SETTINGS };
  return {
    companyName: str(data.companyName),
    tagline: str(data.tagline),
    companySubtitle: str(data.companySubtitle),
    companyDescription: str(data.companyDescription),
    contactInfo: {
      email: str(data.contactInfo?.email),
      phone: str(data.contactInfo?.phone),
      address: str(data.contactInfo?.address),
    },
    heroText: {
      title: str(data.heroText?.title),
      subtitle: str(data.heroText?.subtitle),
      backgroundMedia: str(data.heroText?.backgroundMedia),
      backgroundImage: str(data.heroText?.backgroundImage),
    },
    socialLinks: {
      instagram: str(data.socialLinks?.instagram),
      facebook: str(data.socialLinks?.facebook),
      twitter: str(data.socialLinks?.twitter),
      linkedin: str(data.socialLinks?.linkedin),
      youtube: str(data.socialLinks?.youtube),
    },
    newsletterText: str(data.newsletterText),
    newsletterSubtitle: str(data.newsletterSubtitle),
    footerGallery: Array.isArray(data.footerGallery)
      ? data.footerGallery.map((v) => str(v))
      : [],
    footerLinkGroups: Array.isArray(data.footerLinkGroups)
      ? data.footerLinkGroups
      : [],
  };
};

const TabPanel = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
    {value === index && children}
  </Box>
);

const FieldGroup = ({ label, children }) => (
  <Box sx={{ mb: 2.5 }}>
    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', mb: 0.75 }}>
      {label}
    </Typography>
    {children}
  </Box>
);

const AdminSettings = () => {
  const { role } = useAdminAuth();
  const isAdmin = role === 'admin';

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [hasChanges, setHasChanges] = useState(false);

  // Tab index for User Management (last tab, admin-only)
  const USER_MGMT_TAB = 5;

  useEffect(() => {
    let cancelled = false;
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const data = await siteSettingsService.get();
        if (!cancelled) setSettings(mergeWithDefaults(data));
      } catch {
        if (!cancelled) setSnackbar({ open: true, message: 'Failed to load settings', severity: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSettings();
    return () => { cancelled = true; };
  }, []);

  // Immutable field updater — uses spread operators instead of
  // JSON.parse(JSON.stringify()) to avoid dropping undefined values
  // and to follow the standard React immutable-update pattern.
  //
  // Supports both direct values and updater callbacks:
  //   updateField('companyName', 'New Name')
  //   updateField('footerGallery', prev => [...prev, ''])
  const updateField = useCallback((path, valueOrFn) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const keys = path.split('.');

      if (keys.length === 1) {
        const key = keys[0];
        const newValue = typeof valueOrFn === 'function' ? valueOrFn(prev[key]) : valueOrFn;
        return { ...prev, [key]: newValue };
      }

      if (keys.length === 2) {
        const [parent, child] = keys;
        const parentObj = prev[parent] || {};
        const newValue = typeof valueOrFn === 'function' ? valueOrFn(parentObj[child]) : valueOrFn;
        return { ...prev, [parent]: { ...parentObj, [child]: newValue } };
      }

      // Fallback for 3+ levels (not used in current UI, but kept for safety)
      const updated = JSON.parse(JSON.stringify(prev));
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]] || typeof obj[keys[i]] !== 'object') obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      const lastKey = keys[keys.length - 1];
      obj[lastKey] = typeof valueOrFn === 'function' ? valueOrFn(obj[lastKey]) : valueOrFn;
      return updated;
    });
    setHasChanges(true);
  }, []);

  // Keep a ref that always points at the latest settings so the save
  // handler can read the most-recent value even across async boundaries.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await siteSettingsService.update(settingsRef.current);
      // Do NOT overwrite local state with the API response — the local
      // state is the source of truth.  Replacing it would discard any
      // keystrokes the user made while the save request was in-flight and
      // could re-introduce null values from the server.
      setSnackbar({ open: true, message: 'Settings saved successfully', severity: 'success' });
      setHasChanges(false);
    } catch {
      setSnackbar({ open: true, message: 'Failed to save settings', severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Skeleton height={40} width={200} sx={{ mb: 3 }} />
        <Skeleton height={48} sx={{ mb: 2 }} />
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #F3F4F6' }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} height={56} sx={{ mb: 2 }} />
          ))}
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B2A4A' }}>
            Site Settings
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', mt: 0.5 }}>
            Manage global website configuration
          </Typography>
        </Box>
        {activeTab !== USER_MGMT_TAB && (
          <Button
            variant="contained"
            startIcon={<Icon icon="mdi:content-save-outline" />}
            onClick={handleSave}
            disabled={saving || !hasChanges}
            sx={{
              bgcolor: '#1B2A4A',
              textTransform: 'none',
              borderRadius: 2,
              px: 4,
              '&:hover': { bgcolor: '#2d3f63' },
              '&.Mui-disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF' },
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: '1px solid #F3F4F6',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: '#6B7280',
              minHeight: 48,
            },
            '& .Mui-selected': { color: '#1B2A4A', fontWeight: 600 },
            '& .MuiTabs-indicator': { bgcolor: '#C9A86C' },
          }}
        >
          <Tab icon={<Icon icon="mdi:domain" style={{ fontSize: 18 }} />} iconPosition="start" label="General" />
          <Tab icon={<Icon icon="mdi:image-outline" style={{ fontSize: 18 }} />} iconPosition="start" label="Hero Section" />
          <Tab icon={<Icon icon="mdi:share-variant-outline" style={{ fontSize: 18 }} />} iconPosition="start" label="Social Links" />
          <Tab icon={<Icon icon="mdi:email-newsletter" style={{ fontSize: 18 }} />} iconPosition="start" label="Newsletter" />
          <Tab icon={<Icon icon="mdi:page-layout-footer" style={{ fontSize: 18 }} />} iconPosition="start" label="Footer" />
          {isAdmin && (
            <Tab icon={<Icon icon="mdi:account-group-outline" style={{ fontSize: 18 }} />} iconPosition="start" label="User Management" />
          )}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* General Tab */}
          <TabPanel value={activeTab} index={0}>
            <FieldGroup label="Company Name">
              <TextField
                fullWidth
                size="small"
                value={settings.companyName || ''}
                onChange={(e) => updateField('companyName', e.target.value)}
                placeholder="Company name..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            <FieldGroup label="Tagline">
              <TextField
                fullWidth
                size="small"
                value={settings.tagline || ''}
                onChange={(e) => updateField('tagline', e.target.value)}
                placeholder="Company tagline..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            <FieldGroup label="Company Subtitle">
              <TextField
                fullWidth
                size="small"
                value={settings.companySubtitle || ''}
                onChange={(e) => updateField('companySubtitle', e.target.value)}
                placeholder="Company subtitle..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            <Divider sx={{ my: 3 }} />

            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1B2A4A', mb: 2 }}>
              Contact Information
            </Typography>

            <FieldGroup label="Contact Email">
              <TextField
                fullWidth
                size="small"
                type="email"
                value={settings.contactInfo?.email || ''}
                onChange={(e) => updateField('contactInfo.email', e.target.value)}
                placeholder="info@company.com"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            <FieldGroup label="Contact Phone">
              <TextField
                fullWidth
                size="small"
                value={settings.contactInfo?.phone || ''}
                onChange={(e) => updateField('contactInfo.phone', e.target.value)}
                placeholder="(555) 123-4567"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            <FieldGroup label="Address">
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                value={settings.contactInfo?.address || ''}
                onChange={(e) => updateField('contactInfo.address', e.target.value)}
                placeholder="Full business address..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>
          </TabPanel>

          {/* Hero Section Tab */}
          <TabPanel value={activeTab} index={1}>
            <FieldGroup label="Hero Title">
              <TextField
                fullWidth
                size="small"
                value={settings.heroText?.title || ''}
                onChange={(e) => updateField('heroText.title', e.target.value)}
                placeholder="Main hero heading text..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            <FieldGroup label="Hero Subtitle">
              <TextField
                fullWidth
                size="small"
                value={settings.heroText?.subtitle || ''}
                onChange={(e) => updateField('heroText.subtitle', e.target.value)}
                placeholder="Hero subtitle text..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            <Divider sx={{ my: 3 }} />

            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1B2A4A', mb: 2 }}>
              Background Media
            </Typography>

            <FieldGroup label="Background Media URL (Image or Video)">
              <TextField
                fullWidth
                size="small"
                value={settings.heroText?.backgroundMedia || ''}
                onChange={(e) => updateField('heroText.backgroundMedia', e.target.value)}
                placeholder="https://example.com/hero-bg.jpg or .mp4"
                helperText="Supports images (.jpg, .png, .webp) and videos (.mp4, .webm). Type is auto-detected from URL."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            {(() => {
              const mediaUrl = settings.heroText?.backgroundMedia || settings.heroText?.backgroundImage || '';
              const isVideo = mediaUrl && ['.mp4', '.webm', '.ogg', '.mov'].some((ext) => mediaUrl.toLowerCase().includes(ext));
              if (!mediaUrl) return null;
              return (
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Icon icon={isVideo ? 'mdi:video-outline' : 'mdi:image-outline'} style={{ fontSize: 16 }} />
                    Detected: {isVideo ? 'Video' : 'Image'}
                  </Typography>
                </Box>
              );
            })()}

            <FieldGroup label="Fallback Background Image URL (optional)">
              <TextField
                fullWidth
                size="small"
                value={settings.heroText?.backgroundImage || ''}
                onChange={(e) => updateField('heroText.backgroundImage', e.target.value)}
                placeholder="https://example.com/hero-fallback.jpg"
                helperText="Used as fallback if the primary media URL fails to load."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            {/* Preview */}
            {(() => {
              const mediaUrl = settings.heroText?.backgroundMedia || settings.heroText?.backgroundImage || '';
              const isVideo = mediaUrl && ['.mp4', '.webm', '.ogg', '.mov'].some((ext) => mediaUrl.toLowerCase().includes(ext));
              return (
                <Paper
                  variant="outlined"
                  sx={{
                    mt: 3,
                    p: 4,
                    borderRadius: 2,
                    bgcolor: '#1B2A4A',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: 160,
                    ...(!isVideo && mediaUrl ? {
                      backgroundImage: `linear-gradient(rgba(27,42,74,0.7), rgba(27,42,74,0.85)), url(${mediaUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    } : {}),
                  }}
                >
                  {isVideo && mediaUrl && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 0,
                        '& video': {
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        },
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(27,42,74,0.7)',
                        },
                      }}
                    >
                      <video src={mediaUrl} autoPlay muted loop playsInline />
                    </Box>
                  )}
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography sx={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', mb: 1 }}>
                      Hero Preview
                    </Typography>
                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', mb: 0.5 }}>
                      {settings.heroText?.title || 'Hero Title'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                      {settings.heroText?.subtitle || 'Hero subtitle text'}
                    </Typography>
                  </Box>
                </Paper>
              );
            })()}
          </TabPanel>

          {/* Social Links Tab */}
          <TabPanel value={activeTab} index={2}>
            <FieldGroup label="Instagram URL">
              <TextField
                fullWidth
                size="small"
                value={settings.socialLinks?.instagram || ''}
                onChange={(e) => updateField('socialLinks.instagram', e.target.value)}
                placeholder="https://instagram.com/..."
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, display: 'flex' }}>
                      <Icon icon="mdi:instagram" style={{ fontSize: 20, color: '#E4405F' }} />
                    </Box>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            <FieldGroup label="Facebook URL">
              <TextField
                fullWidth
                size="small"
                value={settings.socialLinks?.facebook || ''}
                onChange={(e) => updateField('socialLinks.facebook', e.target.value)}
                placeholder="https://facebook.com/..."
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, display: 'flex' }}>
                      <Icon icon="mdi:facebook" style={{ fontSize: 20, color: '#1877F2' }} />
                    </Box>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            <FieldGroup label="Twitter URL">
              <TextField
                fullWidth
                size="small"
                value={settings.socialLinks?.twitter || ''}
                onChange={(e) => updateField('socialLinks.twitter', e.target.value)}
                placeholder="https://twitter.com/..."
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, display: 'flex' }}>
                      <Icon icon="mdi:twitter" style={{ fontSize: 20, color: '#1DA1F2' }} />
                    </Box>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            <FieldGroup label="LinkedIn URL">
              <TextField
                fullWidth
                size="small"
                value={settings.socialLinks?.linkedin || ''}
                onChange={(e) => updateField('socialLinks.linkedin', e.target.value)}
                placeholder="https://linkedin.com/company/..."
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, display: 'flex' }}>
                      <Icon icon="mdi:linkedin" style={{ fontSize: 20, color: '#0A66C2' }} />
                    </Box>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            <FieldGroup label="YouTube URL">
              <TextField
                fullWidth
                size="small"
                value={settings.socialLinks?.youtube || ''}
                onChange={(e) => updateField('socialLinks.youtube', e.target.value)}
                placeholder="https://youtube.com/..."
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, display: 'flex' }}>
                      <Icon icon="mdi:youtube" style={{ fontSize: 20, color: '#FF0000' }} />
                    </Box>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>
          </TabPanel>

          {/* Newsletter Tab */}
          <TabPanel value={activeTab} index={3}>
            <FieldGroup label="Newsletter Heading">
              <TextField
                fullWidth
                size="small"
                value={settings.newsletterText || ''}
                onChange={(e) => updateField('newsletterText', e.target.value)}
                placeholder="Newsletter heading text..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            <FieldGroup label="Newsletter Subtitle">
              <TextField
                fullWidth
                size="small"
                value={settings.newsletterSubtitle || ''}
                onChange={(e) => updateField('newsletterSubtitle', e.target.value)}
                placeholder="Newsletter subtitle text..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            {/* Preview */}
            <Paper
              variant="outlined"
              sx={{ mt: 3, p: 3, borderRadius: 2, bgcolor: '#FAFAFA', textAlign: 'center' }}
            >
              <Typography sx={{ fontSize: '0.6875rem', color: '#9CA3AF', mb: 1 }}>
                Newsletter Section Preview
              </Typography>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: '#1B2A4A', mb: 0.5 }}>
                {settings.newsletterText || 'Newsletter Heading'}
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                {settings.newsletterSubtitle || 'Subscribe to stay updated'}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center', maxWidth: 400, mx: 'auto' }}>
                <Box
                  sx={{
                    flex: 1,
                    height: 36,
                    borderRadius: 2,
                    border: '1px solid #D1D5DB',
                    bgcolor: '#fff',
                  }}
                />
                <Box
                  sx={{
                    width: 90,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: '#C9A86C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography sx={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>Subscribe</Typography>
                </Box>
              </Box>
            </Paper>
          </TabPanel>

          {/* User Management Tab (Admin only) */}
          {isAdmin && (
            <TabPanel value={activeTab} index={USER_MGMT_TAB}>
              <UserManagement />
            </TabPanel>
          )}

          {/* Footer Tab */}
          <TabPanel value={activeTab} index={4}>
            <FieldGroup label="Footer Description">
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                value={settings.companyDescription || ''}
                onChange={(e) => updateField('companyDescription', e.target.value)}
                placeholder="Company description for footer..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            <FieldGroup label="Footer Tagline">
              <TextField
                fullWidth
                size="small"
                value={settings.tagline || ''}
                onChange={(e) => updateField('tagline', e.target.value)}
                placeholder="Footer tagline text..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </FieldGroup>

            <Divider sx={{ my: 3 }} />

            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1B2A4A', mb: 2 }}>
              Footer Gallery Images
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', mb: 2 }}>
              Add image URLs for the footer image collage. Recommended: 6 images for best layout.
            </Typography>

            {(settings.footerGallery || []).map((url, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  size="small"
                  value={url || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateField('footerGallery', (gallery) => {
                      const updated = [...(gallery || [])];
                      updated[idx] = val;
                      return updated;
                    });
                  }}
                  placeholder={`Image URL ${idx + 1}`}
                  helperText="Aspect ratio: 4:3 (e.g. 400×300px). Min resolution: 400×300px."
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <IconButton
                  size="small"
                  onClick={() => {
                    updateField('footerGallery', (gallery) => (gallery || []).filter((_, i) => i !== idx));
                  }}
                  sx={{ color: '#EF4444', mt: 0.5 }}
                >
                  <Icon icon="mdi:close" style={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            ))}
            {(settings.footerGallery || []).length < 6 && (
              <Button
                size="small"
                startIcon={<Icon icon="mdi:plus" />}
                onClick={() => {
                  updateField('footerGallery', (gallery) => [...(gallery || []), '']);
                }}
                sx={{ textTransform: 'none', mt: 1, color: '#1B2A4A' }}
              >
                Add Image ({6 - (settings.footerGallery || []).length} remaining)
              </Button>
            )}

            <Divider sx={{ my: 3 }} />

            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1B2A4A', mb: 2 }}>
              Footer Link Groups
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', mb: 2 }}>
              Manage the link columns shown in the footer. Each group has a title and a set of links.
            </Typography>

            {(settings.footerLinkGroups || []).map((group, gIdx) => (
              <Paper key={gIdx} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    label="Group Title"
                    value={group.title || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateField('footerLinkGroups', (groups) => {
                        const updated = JSON.parse(JSON.stringify(groups || []));
                        updated[gIdx].title = val;
                        return updated;
                      });
                    }}
                    sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => {
                      updateField('footerLinkGroups', (groups) => (groups || []).filter((_, i) => i !== gIdx));
                    }}
                    sx={{ color: '#EF4444' }}
                  >
                    <Icon icon="mdi:delete-outline" style={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
                {(group.links || []).map((link, lIdx) => (
                  <Box key={lIdx} sx={{ display: 'flex', gap: 1, mb: 1, pl: 2 }}>
                    <TextField
                      size="small"
                      label="Label"
                      value={link.label || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateField('footerLinkGroups', (groups) => {
                          const updated = JSON.parse(JSON.stringify(groups || []));
                          updated[gIdx].links[lIdx].label = val;
                          return updated;
                        });
                      }}
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                      size="small"
                      label="Path"
                      value={link.path || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateField('footerLinkGroups', (groups) => {
                          const updated = JSON.parse(JSON.stringify(groups || []));
                          updated[gIdx].links[lIdx].path = val;
                          return updated;
                        });
                      }}
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => {
                        updateField('footerLinkGroups', (groups) => {
                          const updated = JSON.parse(JSON.stringify(groups || []));
                          updated[gIdx].links = updated[gIdx].links.filter((_, i) => i !== lIdx);
                          return updated;
                        });
                      }}
                      sx={{ color: '#EF4444' }}
                    >
                      <Icon icon="mdi:close" style={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  size="small"
                  startIcon={<Icon icon="mdi:plus" />}
                  onClick={() => {
                    updateField('footerLinkGroups', (groups) => {
                      const updated = JSON.parse(JSON.stringify(groups || []));
                      updated[gIdx].links = [...(updated[gIdx].links || []), { label: '', path: '/' }];
                      return updated;
                    });
                  }}
                  sx={{ textTransform: 'none', ml: 2, mt: 0.5, fontSize: '0.75rem' }}
                >
                  Add Link
                </Button>
              </Paper>
            ))}
            <Button
              size="small"
              startIcon={<Icon icon="mdi:plus" />}
              onClick={() => {
                updateField('footerLinkGroups', (groups) => [...(groups || []), { title: '', links: [] }]);
              }}
              sx={{ textTransform: 'none', color: '#1B2A4A' }}
            >
              Add Link Group
            </Button>

            <Divider sx={{ my: 3 }} />

            {/* Preview */}
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: '#1B2A4A',
              }}
            >
              <Typography sx={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', mb: 1 }}>
                Footer Preview
              </Typography>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#C9A86C', mb: 0.5 }}>
                {settings.companyName || 'Company Name'}
              </Typography>
              <Typography sx={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', mb: 1.5, letterSpacing: 1 }}>
                {settings.tagline || 'TAGLINE'}
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', maxWidth: 300 }}>
                {settings.companyDescription || 'Company description text goes here'}
              </Typography>
            </Paper>
          </TabPanel>
        </Box>
      </Paper>

      {/* Floating Save Button (if changes exist, hidden on User Management tab) */}
      {hasChanges && activeTab !== USER_MGMT_TAB && (
        <Paper
          elevation={4}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            p: 2,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            bgcolor: '#fff',
            border: '1px solid #F3F4F6',
            zIndex: 100,
          }}
        >
          <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
            Unsaved changes
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={handleSave}
            disabled={saving}
            sx={{
              bgcolor: '#1B2A4A',
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: '#2d3f63' },
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Paper>
      )}

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

export default AdminSettings;
