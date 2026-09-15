/**
 * Shared constants for admin modules.
 * Centralised here to avoid DRY violations across Dashboard, AdminLeads,
 * LeadDetail, AdminArticles, ArticleForm, and FaqManager.
 */

/* ─── Lead Status Configuration ─── */
/**
 * `tone` names a semantic tone; `toneStyles(tone)` in `components/ui/tones.js`
 * turns it into the `var(--token)` triplet. Records never carry colours.
 */
export const LEAD_STATUS_CONFIG = {
  new: { label: 'New', tone: 'info', icon: 'mdi:new-box' },
  contacted: { label: 'Contacted', tone: 'warning', icon: 'mdi:phone-check-outline' },
  qualified: { label: 'Qualified', tone: 'success', icon: 'mdi:check-decagram-outline' },
  converted: { label: 'Converted', tone: 'primary', icon: 'mdi:handshake-outline' },
  lost: { label: 'Lost', tone: 'error', icon: 'mdi:close-circle-outline' },
};

export const LEAD_STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'converted', 'lost'];

/* ─── Lead Source Configuration ─── */
export const LEAD_SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'property-detail-page', label: 'Property Enquiry' },
  { value: 'property_enquiry', label: 'Property Enquiry' },
  { value: 'homepage-contact-form', label: 'Contact Form' },
  { value: 'contact', label: 'Contact Form' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'home_loan', label: 'Home Loan' },
  { value: 'legal_assistance', label: 'Legal Assistance' },
  { value: 'interior_design', label: 'Interior Design' },
  { value: 'sell_let', label: 'Sell/Let' },
  { value: 'careers', label: 'Careers' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'flexible_workspace', label: 'Flexible Workspace' },
  { value: 'direct_lease_retails', label: 'Direct Lease & Retails' },
  { value: 'real_estate_awareness', label: 'Real Estate Awareness' },
  { value: 'property-listing-page', label: 'Property Listing' },
  { value: 'financial-assessment', label: 'Financial Assessment' },
  { value: 'brochure_download', label: 'Brochure Download' },
  { value: 'floorplan_download', label: 'Floor Plan Download' },
  { value: 'document_download', label: 'Document Download' },
  { value: 'detailed_pricing', label: 'Detailed Pricing' },
];

/**
 * Format a raw lead source string into a human-readable label.
 * Looks up from LEAD_SOURCE_OPTIONS first, then falls back to formatting.
 */
export const formatLeadSource = (source) => {
  if (!source) return '--';
  const found = LEAD_SOURCE_OPTIONS.find((s) => s.value === source);
  if (found) return found.label;
  return source.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

/* ─── Article Categories ─── */
export const ARTICLE_CATEGORIES = [
  { value: 'market-trends', label: 'Market Trends' },
  { value: 'buying-guide', label: 'Buying Guide' },
  { value: 'investment', label: 'Investment' },
  { value: 'legal', label: 'Legal' },
  { value: 'interior', label: 'Interior Design' },
];

export const ARTICLE_CATEGORY_TONES = {
  'market-trends': 'info',
  'buying-guide': 'success',
  investment: 'warning',
  legal: 'error',
  interior: 'primary',
};

/* ─── FAQ Categories ─── */
export const FAQ_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'buying', label: 'Buying' },
  { value: 'selling', label: 'Selling' },
  { value: 'renting', label: 'Renting' },
  { value: 'legal', label: 'Legal' },
  { value: 'finance', label: 'Finance' },
];

export const FAQ_CATEGORY_TONES = {
  general: 'info',
  buying: 'success',
  selling: 'warning',
  renting: 'primary',
  legal: 'error',
  finance: 'neutral',
};

/* ─── Default Bank Data (for FinanceGuide) ─── */
export const DEFAULT_BANKS = [
  { name: 'HDFC Bank', icon: 'mdi:bank', rate: 8.35, maxLoan: 50000000 },
  { name: 'SBI', icon: 'mdi:bank', rate: 8.4, maxLoan: 50000000 },
  { name: 'Axis Bank', icon: 'mdi:bank', rate: 8.55, maxLoan: 50000000 },
  { name: 'ICICI Bank', icon: 'mdi:bank', rate: 8.45, maxLoan: 30000000 },
  { name: 'Kotak Mahindra', icon: 'mdi:bank', rate: 8.7, maxLoan: 30000000 },
  { name: 'LIC Housing', icon: 'mdi:bank', rate: 8.5, maxLoan: 50000000 },
];
