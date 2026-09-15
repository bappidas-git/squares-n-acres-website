/**
 * Shared constants for admin modules.
 * Centralised here to avoid DRY violations across Dashboard, AdminLeads,
 * LeadDetail, AdminArticles, ArticleForm, and FaqManager.
 */

/* ─── Lead Status Configuration ─── */
export const LEAD_STATUS_CONFIG = {
  new: { label: 'New', color: '#3B82F6', bg: '#EFF6FF', icon: 'mdi:new-box' },
  contacted: { label: 'Contacted', color: '#F59E0B', bg: '#FFFBEB', icon: 'mdi:phone-check-outline' },
  qualified: { label: 'Qualified', color: '#10B981', bg: '#ECFDF5', icon: 'mdi:check-decagram-outline' },
  converted: { label: 'Converted', color: '#B45309', bg: '#FEF3C7', icon: 'mdi:handshake-outline' },
  lost: { label: 'Lost', color: '#EF4444', bg: '#FEF2F2', icon: 'mdi:close-circle-outline' },
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
  return source
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/* ─── Article Categories ─── */
export const ARTICLE_CATEGORIES = [
  { value: 'market-trends', label: 'Market Trends' },
  { value: 'buying-guide', label: 'Buying Guide' },
  { value: 'investment', label: 'Investment' },
  { value: 'legal', label: 'Legal' },
  { value: 'interior', label: 'Interior Design' },
];

export const ARTICLE_CATEGORY_COLORS = {
  'market-trends': { bg: '#EFF6FF', color: '#3B82F6' },
  'buying-guide': { bg: '#ECFDF5', color: '#10B981' },
  investment: { bg: '#FFFBEB', color: '#F59E0B' },
  legal: { bg: '#FEF2F2', color: '#EF4444' },
  interior: { bg: '#F5F3FF', color: '#8B5CF6' },
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

export const FAQ_CATEGORY_COLORS = {
  general: { bg: '#EFF6FF', color: '#3B82F6' },
  buying: { bg: '#ECFDF5', color: '#10B981' },
  selling: { bg: '#FFFBEB', color: '#F59E0B' },
  renting: { bg: '#F5F3FF', color: '#8B5CF6' },
  legal: { bg: '#FEF2F2', color: '#EF4444' },
  finance: { bg: '#FFF7ED', color: '#EA580C' },
};

/* ─── Default Bank Data (for FinanceGuide) ─── */
export const DEFAULT_BANKS = [
  { name: 'HDFC Bank', icon: 'mdi:bank', rate: 8.35, maxLoan: 50000000, color: '#004B87' },
  { name: 'SBI', icon: 'mdi:bank', rate: 8.4, maxLoan: 50000000, color: '#22409A' },
  { name: 'Axis Bank', icon: 'mdi:bank', rate: 8.55, maxLoan: 50000000, color: '#97144D' },
  { name: 'ICICI Bank', icon: 'mdi:bank', rate: 8.45, maxLoan: 30000000, color: '#F37021' },
  { name: 'Kotak Mahindra', icon: 'mdi:bank', rate: 8.7, maxLoan: 30000000, color: '#ED1C24' },
  { name: 'LIC Housing', icon: 'mdi:bank', rate: 8.5, maxLoan: 50000000, color: '#0072BC' },
];
