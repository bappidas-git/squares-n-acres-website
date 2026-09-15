import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { SwipeableDrawer, useMediaQuery, useTheme } from '@mui/material';
import Swal from 'sweetalert2';
import { propertyService, leadService } from '../../services/api';
import { PropertyDetailSkeleton } from '../../components/common/SkeletonLoaders';
import { useToast } from '../../components/common/ToastProvider';
import { validateLeadForm } from '../../utils/validators';
import { leadStorage } from '../../utils/leadStorage';
import PropertyGallery from '../../components/sections/property/PropertyGallery';
import PropertyOverview from '../../components/sections/property/PropertyOverview';
import PropertySpecs from '../../components/sections/property/PropertySpecs';
import PropertySpecialities from '../../components/sections/property/PropertySpecialities';
import PropertyAmenities from '../../components/sections/property/PropertyAmenities';
import FloorPlans from '../../components/sections/property/FloorPlans';
import FinanceGuide from '../../components/sections/property/FinanceGuide';
import NearbyPlaces from '../../components/sections/property/NearbyPlaces';
import PropertyDocuments from '../../components/sections/property/PropertyDocuments';
import ConstructionSpecs from '../../components/sections/property/ConstructionSpecs';
import ConstructionStatus from '../../components/sections/property/ConstructionStatus';
import BuilderOverview from '../../components/sections/property/BuilderOverview';
import EnquiryForm from '../../components/sections/property/EnquiryForm';
import PropertyFaq from '../../components/sections/property/PropertyFaq';
import SimilarProperties from '../../components/sections/property/SimilarProperties';
import StickyNav from '../../components/sections/property/StickyNav';
import SectionGuard from '../../components/common/SectionGuard';
import styles from './PropertyDetails.module.css';

const formatPrice = (price, unit) => {
  if (price == null || isNaN(Number(price))) return 'Price on Request';
  const numPrice = Number(price);
  if (unit === 'per month') return `₹${numPrice.toLocaleString('en-IN')}/mo`;
  if (numPrice >= 10000000) return `₹${(numPrice / 10000000).toFixed(2)} Cr`;
  if (numPrice >= 100000) return `₹${(numPrice / 100000).toFixed(2)} L`;
  return `₹${numPrice.toLocaleString('en-IN')}`;
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 350, damping: 30 },
  },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } },
};

const swalConfig = {
  customClass: {
    popup: 'hom-swal-popup',
    title: 'hom-swal-title',
    htmlContainer: 'hom-swal-html',
    confirmButton: 'hom-swal-confirm',
  },
  confirmButtonColor: '#C9A86C',
  iconColor: '#059669',
};

const getSweetAlertMessage = (type, config) => {
  const messages = {
    brochure: {
      title: 'We Have Your Request!',
      text: 'Thank you for your interest! Our executive will be contacting you within 24 hours and will share the detailed brochure with you.',
    },
    floorplan: {
      title: 'We Have Your Request!',
      text: 'Thank you for your interest! Our executive will be contacting you within 24 hours and you will receive the detailed floor plan from the executive.',
    },
    floorplan_request: {
      title: 'We Have Your Request!',
      text: 'Thank you for your interest! Our executive will be contacting you within 24 hours with the detailed floor plan information.',
    },
    pricing: {
      title: 'We Have Your Request!',
      text: `Thank you for your interest! Our executive will be contacting you within 24 hours with the detailed pricing breakdown${config ? ` for ${config}` : ''}.`,
    },
    document: {
      title: 'We Have Your Request!',
      text: 'Thank you for your interest! Our executive will contact you within 24 hours and share the requested document with you.',
    },
  };
  return messages[type] || messages.brochure;
};

const PropertyDetails = () => {
  const { slug } = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);

  // Download lead capture modal state
  const [downloadModal, setDownloadModal] = useState({ open: false, type: '' });
  const [downloadFormData, setDownloadFormData] = useState({ name: '', email: '', phone: '' });
  const [downloadSubmitting, setDownloadSubmitting] = useState(false);
  const [downloadSubmitted, setDownloadSubmitted] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [downloadErrors, setDownloadErrors] = useState({});

  // Document download lead capture modal state
  const [docModal, setDocModal] = useState({ open: false, docName: '' });
  const [docFormData, setDocFormData] = useState({ name: '', email: '', phone: '' });
  const [docSubmitting, setDocSubmitting] = useState(false);
  const [docSubmitted, setDocSubmitted] = useState(false);
  const [docError, setDocError] = useState('');
  const [docErrors, setDocErrors] = useState({});

  // Pricing modal state
  const [pricingModal, setPricingModal] = useState({ open: false, config: '' });
  const [pricingFormData, setPricingFormData] = useState({ name: '', email: '', phone: '' });
  const [pricingSubmitting, setPricingSubmitting] = useState(false);
  const [pricingSubmitted, setPricingSubmitted] = useState(false);
  const [pricingError, setPricingError] = useState('');
  const [pricingErrors, setPricingErrors] = useState({});

  // Floor plan request modal state (separate from Contact Agent)
  const [floorPlanRequestModal, setFloorPlanRequestModal] = useState({ open: false });
  const [floorPlanRequestFormData, setFloorPlanRequestFormData] = useState({ name: '', email: '', phone: '' });
  const [floorPlanRequestSubmitting, setFloorPlanRequestSubmitting] = useState(false);
  const [floorPlanRequestSubmitted, setFloorPlanRequestSubmitted] = useState(false);
  const [floorPlanRequestError, setFloorPlanRequestError] = useState('');
  const [floorPlanRequestErrors, setFloorPlanRequestErrors] = useState({});

  // Helper: save lead to sessionStorage and update state
  const saveLeadToSession = useCallback((formData, propertyId, source) => {
    leadStorage.save(formData, propertyId, source);
    setLeadCaptured(true);
  }, []);

  // Helper: get saved user details for pre-filling forms
  const getSavedUserDetails = useCallback(() => {
    return leadStorage.getUserDetails();
  }, []);

  // Helper: pre-fill form data from sessionStorage
  const getPrefilledData = useCallback(() => {
    const saved = getSavedUserDetails();
    if (saved) {
      return { name: saved.name || '', email: saved.email || '', phone: saved.phone || '' };
    }
    return { name: '', email: '', phone: '' };
  }, [getSavedUserDetails]);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        setError(false);
        const data = await propertyService.getBySlug(slug);
        if (!data) {
          setError(true);
        } else {
          setProperty(data);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
    window.scrollTo(0, 0);
  }, [slug]);

  // Check sessionStorage on mount and when property changes
  // Use per-property check so lead form appears on each new property page
  useEffect(() => {
    const isCaptured = leadStorage.isLeadCapturedForProperty(property?.id);
    setLeadCaptured(isCaptured);
  }, [property]);

  const handleShare = useCallback(() => {
    if (isMobile && navigator.share) {
      navigator.share({
        title: property?.title,
        url: window.location.href,
      }).catch(() => {});
    } else if (isMobile) {
      setShareSheetOpen(true);
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        toast.success('Link copied to clipboard!');
      });
    }
  }, [isMobile, property?.title, toast]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success('Link copied to clipboard!');
      setShareSheetOpen(false);
    });
  }, [toast]);

  const handleOpenLeadForm = useCallback(() => {
    setShowLeadForm(true);
    const sidebar = document.getElementById('enquiry-sidebar');
    if (sidebar && window.innerWidth > 960) {
      sidebar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Show SweetAlert for already-captured leads
  const showLeadCapturedAlert = useCallback((type, config) => {
    const msg = getSweetAlertMessage(type, config);
    Swal.fire({
      icon: 'success',
      title: msg.title,
      text: msg.text,
      ...swalConfig,
    });
  }, []);

  // Download modal handlers
  const openDownloadModal = useCallback((type) => {
    if (leadCaptured) {
      showLeadCapturedAlert(type);
      return;
    }
    const prefilled = getPrefilledData();
    setDownloadModal({ open: true, type });
    setDownloadSubmitted(false);
    setDownloadError('');
    setDownloadErrors({});
    setDownloadFormData(prefilled);
  }, [leadCaptured, showLeadCapturedAlert, getPrefilledData]);

  const closeDownloadModal = useCallback(() => {
    setDownloadModal({ open: false, type: '' });
    setDownloadSubmitted(false);
    setDownloadError('');
    setDownloadErrors({});
  }, []);

  const handleDownloadFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setDownloadFormData((prev) => ({ ...prev, [name]: value }));
    setDownloadErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  const handleDownloadSubmit = useCallback(async (e) => {
    e.preventDefault();
    setDownloadError('');

    const { valid, errors: vErrors } = validateLeadForm(downloadFormData);
    if (!valid) {
      setDownloadErrors(vErrors);
      return;
    }

    try {
      setDownloadSubmitting(true);
      const source = downloadModal.type === 'brochure' ? 'brochure_download' : 'floorplan_download';
      await leadService.create({
        ...downloadFormData,
        propertyId: property?.id || null,
        source,
      });
      saveLeadToSession(downloadFormData, property?.id, source);
      setDownloadSubmitted(true);
      toast.success('Request submitted successfully!');
    } catch {
      setDownloadError('Something went wrong. Please try again.');
    } finally {
      setDownloadSubmitting(false);
    }
  }, [downloadFormData, downloadModal.type, property?.id, toast, saveLeadToSession]);

  // Document download modal handlers
  const openDocModal = useCallback((docName) => {
    if (leadCaptured) {
      showLeadCapturedAlert('document');
      return;
    }
    const prefilled = getPrefilledData();
    setDocModal({ open: true, docName });
    setDocSubmitted(false);
    setDocError('');
    setDocErrors({});
    setDocFormData(prefilled);
  }, [leadCaptured, showLeadCapturedAlert, getPrefilledData]);

  const closeDocModal = useCallback(() => {
    setDocModal({ open: false, docName: '' });
    setDocSubmitted(false);
    setDocError('');
    setDocErrors({});
  }, []);

  const handleDocFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setDocFormData((prev) => ({ ...prev, [name]: value }));
    setDocErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  const handleDocSubmit = useCallback(async (e) => {
    e.preventDefault();
    setDocError('');

    const { valid, errors: vErrors } = validateLeadForm(docFormData);
    if (!valid) {
      setDocErrors(vErrors);
      return;
    }

    try {
      setDocSubmitting(true);
      await leadService.create({
        ...docFormData,
        propertyId: property?.id || null,
        source: 'document_download',
        message: `Requested document: ${docModal.docName}`,
      });
      saveLeadToSession(docFormData, property?.id, 'document_download');
      setDocSubmitted(true);
      toast.success('Request submitted successfully!');
    } catch {
      setDocError('Something went wrong. Please try again.');
    } finally {
      setDocSubmitting(false);
    }
  }, [docFormData, docModal.docName, property?.id, toast, saveLeadToSession]);

  // Pricing modal handlers
  const openPricingModal = useCallback((config) => {
    if (leadCaptured) {
      showLeadCapturedAlert('pricing', config);
      return;
    }
    const prefilled = getPrefilledData();
    setPricingModal({ open: true, config });
    setPricingSubmitted(false);
    setPricingError('');
    setPricingErrors({});
    setPricingFormData(prefilled);
  }, [leadCaptured, showLeadCapturedAlert, getPrefilledData]);

  const closePricingModal = useCallback(() => {
    setPricingModal({ open: false, config: '' });
    setPricingSubmitted(false);
    setPricingError('');
    setPricingErrors({});
  }, []);

  const handlePricingFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setPricingFormData((prev) => ({ ...prev, [name]: value }));
    setPricingErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  const handlePricingSubmit = useCallback(async (e) => {
    e.preventDefault();
    setPricingError('');

    const { valid, errors: vErrors } = validateLeadForm(pricingFormData);
    if (!valid) {
      setPricingErrors(vErrors);
      return;
    }

    try {
      setPricingSubmitting(true);
      await leadService.create({
        ...pricingFormData,
        propertyId: property?.id || null,
        source: 'detailed_pricing',
        message: `Requested detailed pricing for ${pricingModal.config} — ${property?.title || ''}`,
      });
      saveLeadToSession(pricingFormData, property?.id, 'detailed_pricing');
      setPricingSubmitted(true);
      toast.success('Pricing request submitted successfully!');
    } catch {
      setPricingError('Something went wrong. Please try again.');
    } finally {
      setPricingSubmitting(false);
    }
  }, [pricingFormData, pricingModal.config, property?.id, property?.title, toast, saveLeadToSession]);

  // Floor plan request modal handlers (for "Request Floor Plan Details" CTA)
  const openFloorPlanRequestModal = useCallback(() => {
    if (leadCaptured) {
      showLeadCapturedAlert('floorplan_request');
      return;
    }
    const prefilled = getPrefilledData();
    setFloorPlanRequestModal({ open: true });
    setFloorPlanRequestSubmitted(false);
    setFloorPlanRequestError('');
    setFloorPlanRequestErrors({});
    setFloorPlanRequestFormData(prefilled);
  }, [leadCaptured, showLeadCapturedAlert, getPrefilledData]);

  const closeFloorPlanRequestModal = useCallback(() => {
    setFloorPlanRequestModal({ open: false });
    setFloorPlanRequestSubmitted(false);
    setFloorPlanRequestError('');
    setFloorPlanRequestErrors({});
  }, []);

  const handleFloorPlanRequestFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFloorPlanRequestFormData((prev) => ({ ...prev, [name]: value }));
    setFloorPlanRequestErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  const handleFloorPlanRequestSubmit = useCallback(async (e) => {
    e.preventDefault();
    setFloorPlanRequestError('');

    const { valid, errors: vErrors } = validateLeadForm(floorPlanRequestFormData);
    if (!valid) {
      setFloorPlanRequestErrors(vErrors);
      return;
    }

    try {
      setFloorPlanRequestSubmitting(true);
      await leadService.create({
        ...floorPlanRequestFormData,
        propertyId: property?.id || null,
        source: 'floorplan_request',
        message: `Requested floor plan details for ${property?.title || ''}`,
      });
      saveLeadToSession(floorPlanRequestFormData, property?.id, 'floorplan_request');
      setFloorPlanRequestSubmitted(true);
      toast.success('Floor plan request submitted successfully!');
    } catch {
      setFloorPlanRequestError('Something went wrong. Please try again.');
    } finally {
      setFloorPlanRequestSubmitting(false);
    }
  }, [floorPlanRequestFormData, property?.id, property?.title, toast, saveLeadToSession]);

  // Callback for when EnquiryForm or FinanceGuide captures a lead
  const handleLeadCapturedFromChild = useCallback((formData) => {
    saveLeadToSession(formData, property?.id, 'child_form');
  }, [property?.id, saveLeadToSession]);

  // Section visibility from admin toggles (defaults to all enabled)
  const sec = useMemo(() => {
    if (!property) return {};
    return property.sections || {};
  }, [property]);

  const isSale = property?.type === 'sale';
  const isRent = property?.type === 'rent';

  // Compute which sections have data for conditional rendering + sticky nav
  // Must be called before early returns to maintain hook order
  const sectionFlags = useMemo(() => {
    if (!property) return {};
    const hasSpecs = (() => {
      if (Array.isArray(property.specificationsArray) && property.specificationsArray.some(s => s.key && s.value)) return true;
      if (property.specifications && typeof property.specifications === 'object') {
        return Object.values(property.specifications).some(v => v !== null && v !== undefined && v !== '' && v !== '—');
      }
      return false;
    })();
    const hasConstructionSpecs = (() => {
      if (!property.constructionSpecs || typeof property.constructionSpecs !== 'object') return false;
      return Object.values(property.constructionSpecs).some(
        (arr) => Array.isArray(arr) && arr.length > 0 && arr.some(item => item.area?.trim() && item.spec?.trim())
      );
    })();
    const hasConstructionTimeline = Array.isArray(property.constructionTimeline) && property.constructionTimeline.length > 0;
    const hasFaqs = Array.isArray(property.faqs) && property.faqs.length > 0;
    const hasSimilar = Array.isArray(property.similarPropertyIds) && property.similarPropertyIds.length > 0;
    const hasDeveloperInfo = Boolean(
      property.developerInfo?.name || property.developerInfo?.description || property.developer
    );
    return {
      hasOverview: Boolean(property.description),
      hasSpecs,
      hasSpecialities: property.specialities?.length > 0,
      hasAmenities: property.amenities?.length > 0,
      hasFloorPlans: property.floorPlans?.length > 0,
      hasNearbyPlaces: property.nearbyPlaces?.length > 0,
      hasDocuments: property.documents?.length > 0,
      hasConstructionSpecs,
      hasConstructionTimeline,
      hasDeveloper: hasDeveloperInfo,
      hasFaqs,
      hasSimilar,
    };
  }, [property]);

  const visibleSections = useMemo(() => {
    if (!property) return [];
    const sections = [];
    const enabled = (key) => sec[key] !== false;
    if (enabled('overview') && sectionFlags.hasOverview) sections.push('overview');
    if (enabled('details') && sectionFlags.hasSpecs) sections.push('specifications');
    if (sectionFlags.hasSpecialities) sections.push('specialities');
    if (enabled('amenities') && sectionFlags.hasAmenities) sections.push('amenities');
    if (enabled('floorPlans') && sectionFlags.hasFloorPlans) sections.push('floor-plans');
    if (enabled('finance') && isSale) sections.push('finance');
    if (enabled('location') && sectionFlags.hasNearbyPlaces) sections.push('nearby');
    if (enabled('documents') && sectionFlags.hasDocuments) sections.push('documents');
    if (enabled('constructionSpecs') && sectionFlags.hasConstructionSpecs) sections.push('construction-specs');
    if (enabled('construction') && sectionFlags.hasConstructionTimeline) sections.push('construction');
    if (enabled('developer') && sectionFlags.hasDeveloper) sections.push('builder');
    if (enabled('faqs') && sectionFlags.hasFaqs) sections.push('faqs');
    if (enabled('similar') && sectionFlags.hasSimilar) sections.push('similar');
    return sections;
  }, [property, sectionFlags, sec, isSale]);

  // Loading skeleton
  if (loading) {
    return <PropertyDetailSkeleton />;
  }

  // 404 / Error state
  if (error || !property) {
    return (
      <div className={styles.errorPage}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Icon icon="mdi:home-search" className={styles.errorIcon} />
          <h1 className={styles.errorTitle}>Property Not Found</h1>
          <p className={styles.errorText}>
            The property you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/properties" className={styles.errorBtn}>
            <Icon icon="mdi:arrow-left" />
            Browse All Properties
          </Link>
        </motion.div>
      </div>
    );
  }

  const {
    hasOverview, hasSpecs, hasSpecialities, hasAmenities,
    hasFloorPlans, hasNearbyPlaces, hasDocuments, hasConstructionSpecs,
    hasConstructionTimeline, hasDeveloper, hasFaqs, hasSimilar,
  } = sectionFlags;

  // Helper: check if admin has enabled a section (defaults to true if not set)
  const sectionEnabled = (key) => sec[key] !== false;

  const badge = property.type === 'rent' ? 'For Rent' : 'For Sale';
  const badgeClass = property.type === 'rent' ? styles.badgeRent : styles.badgeSale;

  const downloadModalTitle = downloadModal.type === 'brochure'
    ? `Download Brochure — ${property.title}`
    : `Download Floor Plans — ${property.title}`;

  const thankYouMessage = downloadModal.type === 'brochure'
    ? 'Your brochure download request has been received. Our team will share the brochure with you shortly.'
    : 'Your floor plan request has been received. Our team will share the detailed floor plans with you shortly.';

  const savedUserDetails = getSavedUserDetails();

  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{property.seoTitle || property.title}</title>
        <meta name="description" content={property.seoDescription || property.description?.slice(0, 160)} />
        {property.seoKeywords?.length > 0 && (
          <meta name="keywords" content={property.seoKeywords.join(', ')} />
        )}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />

        {/* Canonical URL — always set to prevent duplicate content */}
        <link rel="canonical" href={property.canonicalUrl || `${window.location.origin}/properties/${property.slug}`} />

        {/* Open Graph tags */}
        <meta property="og:title" content={property.ogTitle || property.seoTitle || property.title} />
        <meta property="og:description" content={property.ogDescription || property.seoDescription || property.description?.slice(0, 160)} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={property.canonicalUrl || `${window.location.origin}/properties/${property.slug}`} />
        <meta property="og:site_name" content="HOM Advisory" />
        {(property.ogImage || property.gallery?.[0]) && (
          <meta property="og:image" content={property.ogImage || property.gallery[0]} />
        )}
        {(property.ogImage || property.gallery?.[0]) && (
          <meta property="og:image:alt" content={`${property.title} — Property Image`} />
        )}

        {/* Twitter Card tags */}
        <meta name="twitter:card" content={property.twitterCard || 'summary_large_image'} />
        <meta name="twitter:title" content={property.ogTitle || property.seoTitle || property.title} />
        <meta name="twitter:description" content={property.ogDescription || property.seoDescription || property.description?.slice(0, 160)} />
        {(property.ogImage || property.gallery?.[0]) && (
          <meta name="twitter:image" content={property.ogImage || property.gallery[0]} />
        )}
        {(property.ogImage || property.gallery?.[0]) && (
          <meta name="twitter:image:alt" content={`${property.title} — Property Image`} />
        )}

        {/* JSON-LD Schema Markup — supports single object or array of schemas */}
        {property.schemaMarkup && (
          <script type="application/ld+json">{property.schemaMarkup}</script>
        )}
      </Helmet>

      {/* Lead capture modal overlay — spring animation */}
      <AnimatePresence>
        {showLeadForm && (
          <motion.div
            className={styles.modalOverlay}
            onClick={() => setShowLeadForm(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.modalContent}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.modalClose}
                onClick={() => setShowLeadForm(false)}
                aria-label="Close enquiry form"
              >
                <Icon icon="mdi:close" />
              </button>
              <EnquiryForm
                property={property}
                savedUserDetails={savedUserDetails}
                onLeadCaptured={handleLeadCapturedFromChild}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download Lead Capture Modal */}
      <AnimatePresence>
        {downloadModal.open && (
          <motion.div
            className={styles.modalOverlay}
            onClick={closeDownloadModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.modalContent}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.modalClose}
                onClick={closeDownloadModal}
                aria-label="Close download form"
              >
                <Icon icon="mdi:close" />
              </button>

              {downloadSubmitted ? (
                <div className={styles.thankYou}>
                  <Icon icon="mdi:check-circle" className={styles.thankYouIcon} />
                  <h3 className={styles.thankYouTitle}>Thank You!</h3>
                  <p className={styles.thankYouText}>{thankYouMessage}</p>
                  <button className={styles.thankYouClose} onClick={closeDownloadModal}>
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <h3 className={styles.modalTitle}>{downloadModalTitle}</h3>
                  <form onSubmit={handleDownloadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <input
                        type="text"
                        name="name"
                        placeholder="Your Name *"
                        value={downloadFormData.name}
                        onChange={handleDownloadFormChange}
                        style={downloadErrors.name ? inputErrorStyle : inputStyle}
                      />
                      {downloadErrors.name && <span style={fieldErrorTextStyle}>{downloadErrors.name}</span>}
                    </div>
                    <div>
                      <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={downloadFormData.email}
                        onChange={handleDownloadFormChange}
                        style={downloadErrors.email ? inputErrorStyle : inputStyle}
                      />
                      {downloadErrors.email && <span style={fieldErrorTextStyle}>{downloadErrors.email}</span>}
                    </div>
                    <div>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Phone Number *"
                        value={downloadFormData.phone}
                        onChange={handleDownloadFormChange}
                        style={downloadErrors.phone ? inputErrorStyle : inputStyle}
                      />
                      {downloadErrors.phone && <span style={fieldErrorTextStyle}>{downloadErrors.phone}</span>}
                    </div>
                    {downloadError && (
                      <p style={{ color: '#dc2626', fontSize: '0.8rem', fontFamily: '"DM Sans", sans-serif' }}>
                        {downloadError}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={downloadSubmitting}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '12px',
                        background: downloadModal.type === 'brochure' ? '#C9A86C' : '#1B2A4A',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: downloadSubmitting ? 'not-allowed' : 'pointer',
                        opacity: downloadSubmitting ? 0.7 : 1,
                      }}
                    >
                      {downloadSubmitting ? 'Submitting...' : (
                        <>
                          <Icon icon="mdi:download" />
                          {downloadModal.type === 'brochure' ? 'Get Brochure' : 'Get Floor Plans'}
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Download Lead Capture Modal */}
      <AnimatePresence>
        {docModal.open && (
          <motion.div
            className={styles.modalOverlay}
            onClick={closeDocModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.modalContent}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.modalClose}
                onClick={closeDocModal}
                aria-label="Close document download form"
              >
                <Icon icon="mdi:close" />
              </button>

              {docSubmitted ? (
                <div className={styles.thankYou}>
                  <Icon icon="mdi:check-circle" className={styles.thankYouIcon} />
                  <h3 className={styles.thankYouTitle}>Thank You!</h3>
                  <p className={styles.thankYouText}>
                    Your request for "{docModal.docName}" has been received. Our team will share the document with you shortly.
                  </p>
                  <button className={styles.thankYouClose} onClick={closeDocModal}>
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <h3 className={styles.modalTitle}>
                    Download {docModal.docName}
                  </h3>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.8rem', color: '#6B7280', marginBottom: '16px', lineHeight: 1.5 }}>
                    Please share your details to receive the document.
                  </p>
                  <form onSubmit={handleDocSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <input
                        type="text"
                        name="name"
                        placeholder="Your Name *"
                        value={docFormData.name}
                        onChange={handleDocFormChange}
                        style={docErrors.name ? inputErrorStyle : inputStyle}
                      />
                      {docErrors.name && <span style={fieldErrorTextStyle}>{docErrors.name}</span>}
                    </div>
                    <div>
                      <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={docFormData.email}
                        onChange={handleDocFormChange}
                        style={docErrors.email ? inputErrorStyle : inputStyle}
                      />
                      {docErrors.email && <span style={fieldErrorTextStyle}>{docErrors.email}</span>}
                    </div>
                    <div>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Phone Number *"
                        value={docFormData.phone}
                        onChange={handleDocFormChange}
                        style={docErrors.phone ? inputErrorStyle : inputStyle}
                      />
                      {docErrors.phone && <span style={fieldErrorTextStyle}>{docErrors.phone}</span>}
                    </div>
                    {docError && (
                      <p style={{ color: '#dc2626', fontSize: '0.8rem', fontFamily: '"DM Sans", sans-serif' }}>
                        {docError}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={docSubmitting}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '12px',
                        background: '#1B2A4A',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: docSubmitting ? 'not-allowed' : 'pointer',
                        opacity: docSubmitting ? 0.7 : 1,
                      }}
                    >
                      {docSubmitting ? 'Submitting...' : (
                        <>
                          <Icon icon="mdi:download" />
                          Get Document
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pricing Lead Capture Modal */}
      <AnimatePresence>
        {pricingModal.open && (
          <motion.div
            className={styles.modalOverlay}
            onClick={closePricingModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.modalContent}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.modalClose}
                onClick={closePricingModal}
                aria-label="Close pricing form"
              >
                <Icon icon="mdi:close" />
              </button>

              {pricingSubmitted ? (
                <div className={styles.thankYou}>
                  <Icon icon="mdi:check-circle" className={styles.thankYouIcon} />
                  <h3 className={styles.thankYouTitle}>Thank You!</h3>
                  <p className={styles.thankYouText}>
                    Your request for {pricingModal.config} detailed pricing has been received. Our team will share the pricing details with you shortly.
                  </p>
                  <button className={styles.thankYouClose} onClick={closePricingModal}>
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className={styles.pricingModalHeader}>
                    <Icon icon="mdi:currency-inr" className={styles.pricingModalIcon} />
                    <div>
                      <h3 className={styles.modalTitle} style={{ marginBottom: 0 }}>
                        Get {pricingModal.config} Detailed Pricing
                      </h3>
                      <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.8rem', color: '#6B7280', margin: '4px 0 0', lineHeight: 1.5 }}>
                        {property?.title}
                      </p>
                    </div>
                  </div>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.8rem', color: '#6B7280', marginBottom: '16px', lineHeight: 1.5 }}>
                    Please share your details to receive the complete pricing breakdown including all charges and payment plans.
                  </p>
                  <form onSubmit={handlePricingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <input
                        type="text"
                        name="name"
                        placeholder="Your Name *"
                        value={pricingFormData.name}
                        onChange={handlePricingFormChange}
                        style={pricingErrors.name ? inputErrorStyle : inputStyle}
                      />
                      {pricingErrors.name && <span style={fieldErrorTextStyle}>{pricingErrors.name}</span>}
                    </div>
                    <div>
                      <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={pricingFormData.email}
                        onChange={handlePricingFormChange}
                        style={pricingErrors.email ? inputErrorStyle : inputStyle}
                      />
                      {pricingErrors.email && <span style={fieldErrorTextStyle}>{pricingErrors.email}</span>}
                    </div>
                    <div>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Phone Number *"
                        value={pricingFormData.phone}
                        onChange={handlePricingFormChange}
                        style={pricingErrors.phone ? inputErrorStyle : inputStyle}
                      />
                      {pricingErrors.phone && <span style={fieldErrorTextStyle}>{pricingErrors.phone}</span>}
                    </div>
                    {pricingError && (
                      <p style={{ color: '#dc2626', fontSize: '0.8rem', fontFamily: '"DM Sans", sans-serif' }}>
                        {pricingError}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={pricingSubmitting}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '12px',
                        background: '#1B2A4A',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: pricingSubmitting ? 'not-allowed' : 'pointer',
                        opacity: pricingSubmitting ? 0.7 : 1,
                      }}
                    >
                      {pricingSubmitting ? 'Submitting...' : (
                        <>
                          <Icon icon="mdi:currency-inr" />
                          Get Detailed Pricing
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floor Plan Request Lead Capture Modal */}
      <AnimatePresence>
        {floorPlanRequestModal.open && (
          <motion.div
            className={styles.modalOverlay}
            onClick={closeFloorPlanRequestModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.modalContent}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.modalClose}
                onClick={closeFloorPlanRequestModal}
                aria-label="Close floor plan request form"
              >
                <Icon icon="mdi:close" />
              </button>

              {floorPlanRequestSubmitted ? (
                <div className={styles.thankYou}>
                  <Icon icon="mdi:check-circle" className={styles.thankYouIcon} />
                  <h3 className={styles.thankYouTitle}>Thank You!</h3>
                  <p className={styles.thankYouText}>
                    Your floor plan request has been received. Our executive will contact you within 24 hours with detailed floor plan information.
                  </p>
                  <button className={styles.thankYouClose} onClick={closeFloorPlanRequestModal}>
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className={styles.pricingModalHeader}>
                    <Icon icon="mdi:file-document-outline" className={styles.pricingModalIcon} />
                    <div>
                      <h3 className={styles.modalTitle} style={{ marginBottom: 0 }}>
                        Request Floor Plan Details
                      </h3>
                      <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.8rem', color: '#6B7280', margin: '4px 0 0', lineHeight: 1.5 }}>
                        {property?.title}
                      </p>
                    </div>
                  </div>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.8rem', color: '#6B7280', marginBottom: '16px', lineHeight: 1.5 }}>
                    Please share your details to receive the complete floor plan with dimensions and layout details.
                  </p>
                  <form onSubmit={handleFloorPlanRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <input
                        type="text"
                        name="name"
                        placeholder="Your Name *"
                        value={floorPlanRequestFormData.name}
                        onChange={handleFloorPlanRequestFormChange}
                        style={floorPlanRequestErrors.name ? inputErrorStyle : inputStyle}
                      />
                      {floorPlanRequestErrors.name && <span style={fieldErrorTextStyle}>{floorPlanRequestErrors.name}</span>}
                    </div>
                    <div>
                      <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={floorPlanRequestFormData.email}
                        onChange={handleFloorPlanRequestFormChange}
                        style={floorPlanRequestErrors.email ? inputErrorStyle : inputStyle}
                      />
                      {floorPlanRequestErrors.email && <span style={fieldErrorTextStyle}>{floorPlanRequestErrors.email}</span>}
                    </div>
                    <div>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Phone Number *"
                        value={floorPlanRequestFormData.phone}
                        onChange={handleFloorPlanRequestFormChange}
                        style={floorPlanRequestErrors.phone ? inputErrorStyle : inputStyle}
                      />
                      {floorPlanRequestErrors.phone && <span style={fieldErrorTextStyle}>{floorPlanRequestErrors.phone}</span>}
                    </div>
                    {floorPlanRequestError && (
                      <p style={{ color: '#dc2626', fontSize: '0.8rem', fontFamily: '"DM Sans", sans-serif' }}>
                        {floorPlanRequestError}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={floorPlanRequestSubmitting}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '12px',
                        background: '#C9A86C',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: floorPlanRequestSubmitting ? 'not-allowed' : 'pointer',
                        opacity: floorPlanRequestSubmitting ? 0.7 : 1,
                      }}
                    >
                      {floorPlanRequestSubmitting ? 'Submitting...' : (
                        <>
                          <Icon icon="mdi:file-document-outline" />
                          Get Floor Plan Details
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Bottom Sheet (mobile) */}
      {isMobile && (
        <SwipeableDrawer
          anchor="bottom"
          open={shareSheetOpen}
          onClose={() => setShareSheetOpen(false)}
          onOpen={() => setShareSheetOpen(true)}
          disableSwipeToOpen
          PaperProps={{
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              p: 2,
            },
          }}
        >
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ width: 40, height: 4, background: '#D1D5DB', borderRadius: 2, margin: '0 auto 16px' }} />
            <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.1rem', marginBottom: 16 }}>
              Share this Property
            </h3>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button onClick={handleCopyLink} style={shareOptionStyle} aria-label="Copy link">
                <Icon icon="mdi:content-copy" style={{ fontSize: 24 }} />
                <span>Copy Link</span>
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(property.title + ' ' + window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={shareOptionStyle}
                aria-label="Share on WhatsApp"
                onClick={() => setShareSheetOpen(false)}
              >
                <Icon icon="mdi:whatsapp" style={{ fontSize: 24, color: '#25D366' }} />
                <span>WhatsApp</span>
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(property.title)}&body=${encodeURIComponent(window.location.href)}`}
                style={shareOptionStyle}
                aria-label="Share via Email"
                onClick={() => setShareSheetOpen(false)}
              >
                <Icon icon="mdi:email-outline" style={{ fontSize: 24 }} />
                <span>Email</span>
              </a>
            </div>
          </div>
        </SwipeableDrawer>
      )}

      {/* Secondary sticky navigation */}
      <StickyNav visibleSections={visibleSections} />

      <div className={styles.page}>
        <div className={styles.container}>
          {/* Breadcrumb */}
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link to="/" className={styles.breadcrumbLink}>Home</Link>
            <Icon icon="mdi:chevron-right" className={styles.breadcrumbSep} />
            <Link to="/properties" className={styles.breadcrumbLink}>Properties</Link>
            <Icon icon="mdi:chevron-right" className={styles.breadcrumbSep} />
            <span className={styles.breadcrumbCurrent}>{property.title}</span>
          </nav>

          {/* Gallery */}
          <PropertyGallery images={property.gallery} />

          {/* Download Buttons - below gallery */}
          <div className={styles.downloadButtons}>
            <button
              className={`${styles.downloadBtn} ${styles.downloadBrochure}`}
              onClick={() => openDownloadModal('brochure')}
            >
              <Icon icon="mdi:download" /> Download Brochure
            </button>
            <button
              className={`${styles.downloadBtn} ${styles.downloadFloorPlan}`}
              onClick={() => openDownloadModal('floorplan')}
            >
              <Icon icon="mdi:floor-plan" /> Download Floor Plans
            </button>
          </div>

          {/* Main content + sidebar layout */}
          <div className={styles.layout}>
            <div className={styles.mainContent}>
              {/* Property Header */}
              <motion.div
                className={styles.propertyHeader}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <div className={styles.headerTop}>
                  <div>
                    <h1 className={styles.propertyName}>{property.title}</h1>
                    <span className={`${styles.badge} ${badgeClass}`}>{badge}</span>
                  </div>
                  <div className={styles.priceBlock}>
                    <span className={styles.price}>
                      {formatPrice(property.price, property.priceUnit)}
                    </span>
                    <span className={styles.priceUnit}>{property.priceUnit}</span>
                  </div>
                </div>

                <div className={styles.locationRow}>
                  <Icon icon="mdi:map-marker" className={styles.locationIcon} />
                  <span>{[property.location?.area, property.location?.city].filter(Boolean).join(', ') || '—'}</span>
                </div>

                <div className={styles.quickChips}>
                  {property.configuration?.map((config, idx) => (
                    <span key={idx} className={styles.chip}>
                      <Icon icon="mdi:floor-plan" /> {config}
                    </span>
                  ))}
                  {property.dimensionRange && (
                    <span className={styles.chip}>
                      <Icon icon="mdi:ruler-square" />
                      {property.dimensionRange.min} - {property.dimensionRange.max} {property.dimensionRange.unit}
                    </span>
                  )}
                  {property.possession && (
                    <span className={styles.chip}>
                      <Icon icon="mdi:calendar-clock" /> {property.possession}
                    </span>
                  )}
                </div>

                <div className={styles.headerActions}>
                  <button className={styles.shareBtn} onClick={handleShare} aria-label="Share property">
                    <Icon icon="mdi:share-variant" />
                    Share
                  </button>
                </div>
              </motion.div>

              {/* Sections — rendered via SectionGuard (admin toggle + data presence + type) */}
              <SectionGuard sectionEnabled={sectionEnabled('overview')} hasData={hasOverview}>
                <PropertyOverview property={property} />
              </SectionGuard>
              <SectionGuard sectionEnabled={sectionEnabled('details')} hasData={hasSpecs}>
                <PropertySpecs specifications={property.specifications} specificationsArray={property.specificationsArray} propertyType={property.propertyType} />
              </SectionGuard>
              <SectionGuard sectionEnabled={sectionEnabled('highlights')} hasData={hasSpecialities}>
                <PropertySpecialities specialities={property.specialities} />
              </SectionGuard>
              <SectionGuard sectionEnabled={sectionEnabled('amenities')} hasData={hasAmenities}>
                <PropertyAmenities amenities={property.amenities} />
              </SectionGuard>
              <SectionGuard sectionEnabled={sectionEnabled('floorPlans')} hasData={hasFloorPlans}>
                <FloorPlans
                  floorPlans={property.floorPlans}
                  priceUnit={property.priceUnit}
                  onRequestDetails={openFloorPlanRequestModal}
                  onGetPricing={openPricingModal}
                  isLeadCaptured={leadCaptured}
                  onFloorPlanImageClick={openFloorPlanRequestModal}
                />
              </SectionGuard>
              <SectionGuard sectionEnabled={sectionEnabled('finance')} hasData={true} typeAllowed={isSale}>
                <FinanceGuide
                  price={property.price}
                  property={property}
                  savedUserDetails={savedUserDetails}
                  onLeadCaptured={handleLeadCapturedFromChild}
                />
              </SectionGuard>
              <SectionGuard sectionEnabled={sectionEnabled('location')} hasData={hasNearbyPlaces}>
                <NearbyPlaces nearbyPlaces={property.nearbyPlaces} location={property.location} />
              </SectionGuard>
              <SectionGuard sectionEnabled={sectionEnabled('documents')} hasData={hasDocuments}>
                <PropertyDocuments documents={property.documents} onDownloadClick={openDocModal} />
              </SectionGuard>
              <SectionGuard sectionEnabled={sectionEnabled('constructionSpecs')} hasData={hasConstructionSpecs} typeAllowed={!isRent}>
                <ConstructionSpecs constructionSpecs={property.constructionSpecs} />
              </SectionGuard>
              <SectionGuard sectionEnabled={sectionEnabled('construction')} hasData={hasConstructionTimeline} typeAllowed={!isRent}>
                <ConstructionStatus status={property.status} constructionTimeline={property.constructionTimeline} />
              </SectionGuard>
              <SectionGuard sectionEnabled={sectionEnabled('developer')} hasData={hasDeveloper}>
                <BuilderOverview developer={property.developer} developerInfo={property.developerInfo} />
              </SectionGuard>
              <SectionGuard sectionEnabled={sectionEnabled('faqs')} hasData={hasFaqs}>
                <PropertyFaq property={property} />
              </SectionGuard>
            </div>

            {/* Sidebar — sticky on desktop */}
            <div className={styles.sidebarCol} id="enquiry-sidebar">
              <EnquiryForm
                property={property}
                savedUserDetails={savedUserDetails}
                onLeadCaptured={handleLeadCapturedFromChild}
              />
            </div>
          </div>

          {/* Similar Properties - full width */}
          <SectionGuard sectionEnabled={sectionEnabled('similar')} hasData={hasSimilar}>
            <SimilarProperties currentProperty={property} />
          </SectionGuard>
        </div>
      </div>

      {/* Mobile Enquiry Button */}
      <EnquiryForm
        property={property}
        isMobile
        savedUserDetails={savedUserDetails}
        onLeadCaptured={handleLeadCapturedFromChild}
      />
    </>
  );
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1.5px solid #E5E7EB',
  borderRadius: '8px',
  fontFamily: '"DM Sans", sans-serif',
  fontSize: '0.875rem',
  color: '#1B2A4A',
  outline: 'none',
  background: '#fff',
};

const inputErrorStyle = {
  ...inputStyle,
  border: '1.5px solid #dc2626',
};

const fieldErrorTextStyle = {
  color: '#dc2626',
  fontSize: '0.75rem',
  fontFamily: '"DM Sans", sans-serif',
  marginTop: '4px',
  display: 'block',
};

const shareOptionStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  padding: '12px 16px',
  border: '1px solid #E5E7EB',
  borderRadius: 12,
  background: '#fff',
  cursor: 'pointer',
  fontFamily: '"DM Sans", sans-serif',
  fontSize: '0.75rem',
  color: '#1B2A4A',
  textDecoration: 'none',
  minWidth: 80,
};

export default PropertyDetails;
