import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useMediaQuery,
  useTheme,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Icon } from '@iconify/react';
import propertyService from '../../services/propertyService';
import toLegacyProperty from '../../utils/adapters/legacyProperty';
import { Alert } from '../../components/ui';
import { useToast } from '../../components/common/ToastProvider';
import {
  TAB_CONFIG,
  DRAFT_STORAGE_KEY,
  generateSlug,
  getDefaultFormData,
  getDefaultSections,
} from './property-tabs/constants';
import {
  GalleryTab,
  BasicInfoTab,
  OverviewTab,
  DetailsTab,
  HighlightsTab,
  AmenitiesTab,
  FloorPlansTab,
  NearbyPlacesTab,
  DocumentsTab,
  ConstructionSpecsTab,
  ConstructionStatusTab,
  DeveloperTab,
  FaqsTab,
  SimilarPropertiesTab,
  SeoTagsTab,
  SectionVisibilityTab,
} from './property-tabs';

const PropertyForm = ({ propertyId = null }) => {
  const toast = useToast();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isEdit = Boolean(propertyId);

  const [formData, setFormData] = useState(getDefaultFormData());
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [errors, setErrors] = useState({});
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const autoSaveTimerRef = useRef(null);

  // ---- Load property data for edit ----
  useEffect(() => {
    if (!isEdit) return;
    const loadProperty = async () => {
      try {
        setLoading(true);
        // One call; the SEO branch lives on the record itself now (§9.6).
        // `toLegacyProperty` maps it onto the flat names these tabs read,
        // until prompts 18–21 rebuild the form against the contract.
        const { data } = await propertyService.adminGet(propertyId);
        const property = toLegacyProperty(data);
        if (!property) {
          toast.error('Property not found');
          navigate('/admin/properties');
          return;
        }

        // normalizePropertyResponse already handles specifications normalization
        // (array/object formats, field name variants). Ensure at least one empty entry for UI.
        const specs =
          Array.isArray(property.specifications) && property.specifications.length
            ? property.specifications.map((s) => ({
                key: s.key || '',
                value: s.value != null ? String(s.value) : '',
                icon: s.icon || '',
              }))
            : [{ key: '', value: '', icon: '' }];

        // normalizePropertyResponse already normalizes floor plan items.
        // Ensure at least one empty entry for UI.
        const floorPlansData = Array.isArray(property.floorPlans) ? property.floorPlans : [];
        const nearbyPlacesData = Array.isArray(property.nearbyPlaces) ? property.nearbyPlaces : [];
        const cSpecs = property.constructionSpecs || {};
        const cTimeline = Array.isArray(property.constructionTimeline)
          ? property.constructionTimeline
          : [];
        const devInfo = property.developerInfo || null;
        const simIds = Array.isArray(property.similarPropertyIds)
          ? property.similarPropertyIds
          : [];
        const specialitiesData = Array.isArray(property.specialities) ? property.specialities : [];

        // Gallery is already normalized to string[] by normalizePropertyResponse
        const galleryData = Array.isArray(property.gallery)
          ? property.gallery.map((item) =>
              typeof item === 'object' && item !== null ? item.url || item.image || '' : item || ''
            )
          : [];

        // Set slugManuallyEdited BEFORE formData to prevent the auto-slug
        // effect from overwriting the loaded slug (avoids race condition
        // in React 17 where async state updates aren't batched).
        setSlugManuallyEdited(true);

        // Build form data from normalized API response.
        // Start with defaults to ensure every field has a value, then overlay
        // loaded data. This prevents undefined fields if the API response
        // is missing any keys.
        const defaults = getDefaultFormData();
        setFormData({
          ...defaults,
          title: property.title || '',
          slug: property.slug || '',
          type: property.type || 'sale',
          propertyType: property.propertyType || 'apartment',
          category: property.category || property.propertyType || 'apartment',
          status: property.status || 'pre-launch',
          sections: { ...getDefaultSections(), ...(property.sections || {}) },
          publishStatus: property.publishStatus || (property.isActive ? 'published' : 'draft'),
          price: property.price || '',
          priceUnit: property.priceUnit || 'onwards',
          developer: property.developer || '',
          description: property.description || '',
          highlights: property.highlights?.length ? property.highlights : [''],
          location: {
            area: property.location?.area || '',
            city: property.location?.city || '',
            state: property.location?.state || '',
            lat: property.location?.lat || '',
            lng: property.location?.lng || '',
            address: property.location?.address || property.address || '',
          },
          configuration: property.configuration || [],
          dimensionRange: {
            min: property.dimensionRange?.min || '',
            max: property.dimensionRange?.max || '',
            unit: property.dimensionRange?.unit || 'sqft',
          },
          possession: property.possession || '',
          specifications: specs,
          amenities: property.amenities || [],
          floorPlans: floorPlansData.length
            ? floorPlansData.map((fp) => ({
                config: fp.config || '',
                area: fp.area != null ? String(fp.area) : '',
                price: fp.price != null ? String(fp.price) : '',
                image: fp.image || '',
                bedrooms: fp.bedrooms != null ? String(fp.bedrooms) : '',
                bathrooms: fp.bathrooms != null ? String(fp.bathrooms) : '',
              }))
            : [
                {
                  config: '',
                  area: '',
                  price: '',
                  image: '',
                  bedrooms: '',
                  bathrooms: '',
                },
              ],
          gallery: galleryData.length ? galleryData : [''],
          nearbyPlaces: nearbyPlacesData.length
            ? nearbyPlacesData.map((np) => ({
                name: np.name || '',
                distance: np.distance || '',
                type: np.type || 'school',
              }))
            : [{ name: '', distance: '', type: 'school' }],
          brochureUrl: property.brochureUrl || '',
          floorPlanPdfUrl: property.floorPlanPdfUrl || '',
          specialities: specialitiesData.length
            ? specialitiesData.map((s) => ({
                icon: s.icon || '',
                name: s.name || '',
                description: s.description || '',
              }))
            : [{ icon: '', name: '', description: '' }],
          documents: (property.documents || []).length
            ? property.documents.map((d) => ({
                name: d.name || '',
                icon: d.icon || 'mdi:file-document',
                url: d.url || '',
              }))
            : [{ name: '', icon: 'mdi:file-document', url: '' }],
          constructionSpecs: {
            flooring: cSpecs.flooring?.length ? cSpecs.flooring : [{ area: '', spec: '' }],
            doors: cSpecs.doors?.length ? cSpecs.doors : [{ area: '', spec: '' }],
            structure: cSpecs.structure?.length ? cSpecs.structure : [{ area: '', spec: '' }],
            electrical: cSpecs.electrical?.length ? cSpecs.electrical : [{ area: '', spec: '' }],
            ...(cSpecs.plumbing?.length ? { plumbing: cSpecs.plumbing } : {}),
            ...(cSpecs.others?.length ? { others: cSpecs.others } : {}),
          },
          constructionTimeline: cTimeline.length
            ? cTimeline.map((t) => ({
                label: t.label || '',
                status: t.status || 'pending',
                icon: t.icon || 'mdi:progress-clock',
              }))
            : [
                { label: 'Foundation', status: 'pending', icon: 'mdi:shovel' },
                { label: 'Structure', status: 'pending', icon: 'mdi:crane' },
                {
                  label: 'Finishing',
                  status: 'pending',
                  icon: 'mdi:format-paint',
                },
                {
                  label: 'Handover',
                  status: 'pending',
                  icon: 'mdi:key-variant',
                },
              ],
          developerInfo:
            devInfo && (devInfo.name || devInfo.description || devInfo.logo)
              ? {
                  name: devInfo.name || property.developer || '',
                  description: devInfo.description || '',
                  logo: devInfo.logo || '',
                  stats:
                    Array.isArray(devInfo.stats) && devInfo.stats.length
                      ? devInfo.stats.map((s) => ({
                          value: s.value ?? '',
                          suffix: s.suffix || '+',
                          label: s.label || '',
                          icon: s.icon || 'mdi:chart-line',
                        }))
                      : [
                          {
                            value: '',
                            suffix: '+',
                            label: 'Years Experience',
                            icon: 'mdi:calendar-star',
                          },
                          {
                            value: '',
                            suffix: '+',
                            label: 'Projects Completed',
                            icon: 'mdi:office-building',
                          },
                        ],
                }
              : {
                  name: property.developer || '',
                  description: '',
                  logo: '',
                  stats: [
                    {
                      value: '',
                      suffix: '+',
                      label: 'Years Experience',
                      icon: 'mdi:calendar-star',
                    },
                    {
                      value: '',
                      suffix: '+',
                      label: 'Projects Completed',
                      icon: 'mdi:office-building',
                    },
                  ],
                },
          faqs: (property.faqs || []).length
            ? property.faqs.map((f) => ({
                question: f.question || '',
                answer: f.answer || '',
              }))
            : [{ question: '', answer: '' }],
          similarPropertyIds: simIds,
          seoTitle: property.seoTitle || '',
          seoDescription: property.seoDescription || '',
          seoKeywords: Array.isArray(property.seoKeywords) ? property.seoKeywords : [],
          ogTitle: property.ogTitle || '',
          ogDescription: property.ogDescription || '',
          ogImage: property.ogImage || '',
          twitterCard: property.twitterCard || 'summary_large_image',
          canonicalUrl: property.canonicalUrl || '',
          schemaMarkup: property.schemaMarkup || '',
          tags: Array.isArray(property.tags) ? property.tags : [],
          isActive: property.isActive !== undefined ? property.isActive : true,
        });
      } catch {
        toast.error('Failed to load property data');
      } finally {
        setLoading(false);
      }
    };
    loadProperty();
  }, [isEdit, propertyId, navigate, toast]);

  // ---- Load draft for new properties ----
  useEffect(() => {
    if (isEdit) return;
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
        toast.info('Draft restored from local storage');
      }
    } catch {
      // ignore parse errors
    }
  }, [isEdit, toast]);

  // ---- Auto-save draft every 30s for new properties ----
  useEffect(() => {
    if (isEdit) return;
    autoSaveTimerRef.current = setInterval(() => {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
    }, 30000);
    return () => clearInterval(autoSaveTimerRef.current);
  }, [formData, isEdit]);

  // ---- Field updaters ----
  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const addListItem = useCallback((field, defaultItem) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], defaultItem],
    }));
  }, []);

  const removeListItem = useCallback((field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  }, []);

  const updateListItem = useCallback((field, index, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  }, []);

  // ---- Auto-generate slug from title ----
  useEffect(() => {
    if (!slugManuallyEdited && formData.title) {
      setFormData((prev) => ({ ...prev, slug: generateSlug(prev.title) }));
    }
  }, [formData.title, slugManuallyEdited]);

  /**
   * Saving is switched off while this form still speaks the boilerplate's
   * shape. A property now carries `pricing{}`, `area{}`, `location{localityId}`,
   * `unitConfigurations[]`, `amenityIds[]`, `badgeIds[]`, `sectionVisibility{}`
   * and a nested `seo{}` (§6.1); the payload this form used to build wrote
   * snake_case columns that no longer exist, so sending it would quietly lose
   * most of a listing.
   * Prompts 18–21 rebuild the sixteen tabs and the payload together.
   */
  const savingDisabled = true;

  // ---- Tab renderers ----
  const sharedProps = {
    formData,
    updateField,
    updateListItem,
    addListItem,
    removeListItem,
    errors,
  };

  const tabRenderers = [
    () => <GalleryTab {...sharedProps} />,
    () => (
      <BasicInfoTab
        {...sharedProps}
        slugManuallyEdited={slugManuallyEdited}
        setSlugManuallyEdited={setSlugManuallyEdited}
      />
    ),
    () => <OverviewTab {...sharedProps} />,
    () => <DetailsTab {...sharedProps} />,
    () => <HighlightsTab {...sharedProps} />,
    () => <AmenitiesTab {...sharedProps} />,
    () => <FloorPlansTab {...sharedProps} />,
    () => <NearbyPlacesTab {...sharedProps} />,
    () => <DocumentsTab {...sharedProps} />,
    () => <ConstructionSpecsTab {...sharedProps} />,
    () => <ConstructionStatusTab {...sharedProps} />,
    () => <DeveloperTab {...sharedProps} />,
    () => <FaqsTab {...sharedProps} />,
    () => <SimilarPropertiesTab {...sharedProps} propertyId={propertyId} />,
    () => <SectionVisibilityTab {...sharedProps} />,
    () => <SeoTagsTab {...sharedProps} />,
  ];

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <CircularProgress sx={{ color: 'var(--color-primary-dark)' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            onClick={() => navigate('/admin/properties')}
            sx={{ color: 'var(--color-text-muted)' }}
          >
            <Icon icon="mdi:arrow-left" />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--color-charcoal)' }}>
              {isEdit ? 'Edit Property' : 'Add New Property'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--color-text-muted)' }}>
              {isEdit
                ? `Editing: ${formData.title || 'Untitled'}`
                : 'Fill in the details below to create a new property listing'}
            </Typography>
          </Box>
        </Box>

        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/admin/properties')}
              sx={{
                borderRadius: 2,
                color: 'var(--color-text-muted)',
                borderColor: 'var(--color-border-strong)',
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outlined"
              disabled={savingDisabled}
              startIcon={<Icon icon="mdi:content-save-outline" />}
              sx={{ borderRadius: 2 }}
            >
              Save as draft
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={savingDisabled}
              startIcon={<Icon icon="mdi:check" />}
              sx={{ borderRadius: 2 }}
            >
              {isEdit ? 'Update and publish' : 'Publish'}
            </Button>
          </Box>
        )}
      </Box>

      <Alert
        tone="info"
        title="Property saving is being rebuilt (prompts 18–21)"
        style={{ marginBottom: 'var(--space-4)' }}
      >
        This form still uses the previous property shape. It loads and shows the real listing, but
        saving stays switched off until the sixteen tabs are rebuilt against the current API.
      </Alert>

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {TAB_CONFIG.map((tab, index) => (
            <Accordion
              key={tab.key}
              expanded={activeTab === index}
              onChange={() => setActiveTab(activeTab === index ? -1 : index)}
              sx={{
                borderRadius: '12px !important',
                '&:before': { display: 'none' },
                border:
                  activeTab === index
                    ? '1px solid var(--color-primary)'
                    : '1px solid var(--color-border)',
              }}
            >
              <AccordionSummary expandIcon={<Icon icon="mdi:chevron-down" />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor:
                        activeTab === index ? 'var(--color-charcoal)' : 'var(--color-surface)',
                      color:
                        activeTab === index
                          ? 'var(--color-text-inverse)'
                          : 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Icon
                      icon={tab.icon}
                      style={{
                        fontSize: 18,
                        color:
                          activeTab === index
                            ? 'var(--color-primary-dark)'
                            : 'var(--color-text-muted)',
                      }}
                    />
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        color:
                          activeTab === index ? 'var(--color-charcoal)' : 'var(--color-text-muted)',
                      }}
                    >
                      {tab.label}
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>{tabRenderers[index]()}</AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden', maxWidth: '100%' }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              borderBottom: '1px solid var(--color-border)',
              maxWidth: '100%',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                minHeight: 56,
                color: 'var(--color-text-muted)',
                fontSize: { xs: '0.7rem', md: '0.775rem', lg: '0.825rem' },
                minWidth: { xs: 'auto', md: 80 },
                px: { xs: 0.75, md: 1.5 },
                '&.Mui-selected': { color: 'var(--color-charcoal)', fontWeight: 600 },
              },
              '& .MuiTabs-indicator': { bgcolor: 'var(--color-primary)', height: 3 },
              '& .MuiTabs-scrollButtons': {
                '&.Mui-disabled': { opacity: 0.3 },
              },
            }}
          >
            {TAB_CONFIG.map((tab) => (
              <Tab
                key={tab.key}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Icon icon={tab.icon} style={{ fontSize: 16 }} />
                    {tab.label}
                  </Box>
                }
              />
            ))}
          </Tabs>
          <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, overflow: 'hidden' }}>
            {tabRenderers[activeTab]()}
          </Box>
        </Paper>
      )}

      {isMobile && (
        <Paper
          sx={{
            position: 'sticky',
            bottom: 0,
            mt: 2,
            p: 2,
            borderRadius: 3,
            display: 'flex',
            gap: 1,
            zIndex: 10,
            boxShadow: '0px -4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <Button
            variant="outlined"
            onClick={() => navigate('/admin/properties')}
            sx={{
              borderRadius: 2,
              flex: 1,
              color: 'var(--color-text-muted)',
              borderColor: 'var(--color-border-strong)',
            }}
          >
            Cancel
          </Button>
          <Button variant="outlined" disabled={savingDisabled} sx={{ borderRadius: 2, flex: 1 }}>
            Draft
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={savingDisabled}
            sx={{ borderRadius: 2, flex: 1 }}
          >
            {isEdit ? 'Update' : 'Publish'}
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default PropertyForm;
