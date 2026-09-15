import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import AdminLayout from '../components/layout/AdminLayout';
import ProtectedRoute from '../components/admin/ProtectedRoute';
import { PageLoader } from '../components/common/SkeletonLoaders';
import { ROLES } from '../config/rbac';

// === Public Pages (lazy loaded) ===
const Home = lazy(() => import('../pages/public/Home'));
const PropertyListing = lazy(() => import('../pages/public/PropertyListing'));
const PropertyDetail = lazy(() => import('../pages/public/PropertyDetails'));
const PreLaunch = lazy(() => import('../pages/public/PreLaunch'));
const UnderConstruction = lazy(() => import('../pages/public/UnderConstruction'));
const ReadyToMove = lazy(() => import('../pages/public/ReadyToMove'));
const RentApartments = lazy(() => import('../pages/public/RentApartments'));
const RentVillas = lazy(() => import('../pages/public/RentVillas'));
const HomeLoan = lazy(() => import('../pages/public/HomeLoan'));
const LegalAssistance = lazy(() => import('../pages/public/LegalAssistance'));
const InteriorDesigning = lazy(() => import('../pages/public/InteriorDesigning'));
const Articles = lazy(() => import('../pages/public/Articles'));
const ArticleDetail = lazy(() => import('../pages/public/ArticleDetail'));
const FAQs = lazy(() => import('../pages/public/FAQs'));
const RealEstateAwareness = lazy(() => import('../pages/public/RealEstateAwareness'));
const Contact = lazy(() => import('../pages/public/Contact'));
const About = lazy(() => import('../pages/public/About'));
const SellLet = lazy(() => import('../pages/public/SellLet'));
const Careers = lazy(() => import('../pages/public/Careers'));
const Partnership = lazy(() => import('../pages/public/Partnership'));
const FlexibleWorkspace = lazy(() => import('../pages/public/FlexibleWorkspace'));
const DirectLeaseRetails = lazy(() => import('../pages/public/DirectLeaseRetails'));
const NotFound = lazy(() => import('../pages/public/NotFound'));

// === Admin Pages (lazy loaded) ===
const AdminLogin = lazy(() => import('../pages/admin/AdminLogin'));
const Dashboard = lazy(() => import('../pages/admin/Dashboard'));
const AdminProperties = lazy(() => import('../pages/admin/AdminProperties'));
const AddProperty = lazy(() => import('../pages/admin/AddProperty'));
const EditProperty = lazy(() => import('../pages/admin/EditProperty'));
const AdminLeads = lazy(() => import('../pages/admin/AdminLeads'));
const LeadDetail = lazy(() => import('../pages/admin/LeadDetail'));
const AdminSeo = lazy(() => import('../pages/admin/AdminSeo'));
const AdminArticles = lazy(() => import('../pages/admin/AdminArticles'));
const ArticleForm = lazy(() => import('../pages/admin/ArticleForm'));
const FaqManager = lazy(() => import('../pages/admin/FaqManager'));
const AdminNeighborhoods = lazy(() => import('../pages/admin/AdminNeighborhoods'));
const AdminPartners = lazy(() => import('../pages/admin/AdminPartners'));
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings'));

// All roles shorthand
const ALL_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES];

// Public layout wrapper
const PublicRoute = ({ children }) => (
  <MainLayout>{children}</MainLayout>
);

/**
 * Role-protected wrapper for individual admin child routes.
 * Renders children only if user's role is in allowedRoles.
 */
const RoleRoute = ({ children, allowedRoles }) => (
  <ProtectedRoute allowedRoles={allowedRoles}>{children}</ProtectedRoute>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* === Public Routes (wrapped in MainLayout) === */}
        <Route path="/" element={<PublicRoute><Home /></PublicRoute>} />
        <Route path="/properties" element={<PublicRoute><PropertyListing /></PublicRoute>} />
        <Route path="/properties/:slug" element={<PublicRoute><PropertyDetail /></PublicRoute>} />

        {/* Buy sub-routes */}
        <Route path="/buy/pre-launch" element={<PublicRoute><PreLaunch /></PublicRoute>} />
        <Route path="/buy/under-construction" element={<PublicRoute><UnderConstruction /></PublicRoute>} />
        <Route path="/buy/ready-to-move" element={<PublicRoute><ReadyToMove /></PublicRoute>} />

        {/* Rent sub-routes */}
        <Route path="/rent/apartments" element={<PublicRoute><RentApartments /></PublicRoute>} />
        <Route path="/rent/villas" element={<PublicRoute><RentVillas /></PublicRoute>} />

        {/* Buyer Assistance sub-routes */}
        <Route path="/buyer-assistance/home-loan" element={<PublicRoute><HomeLoan /></PublicRoute>} />
        <Route path="/buyer-assistance/legal-assistance" element={<PublicRoute><LegalAssistance /></PublicRoute>} />
        <Route path="/buyer-assistance/interior-designing" element={<PublicRoute><InteriorDesigning /></PublicRoute>} />

        {/* Insights sub-routes */}
        <Route path="/insights/articles" element={<PublicRoute><Articles /></PublicRoute>} />
        <Route path="/insights/articles/:slug" element={<PublicRoute><ArticleDetail /></PublicRoute>} />
        <Route path="/insights/faqs" element={<PublicRoute><FAQs /></PublicRoute>} />
        <Route path="/insights/real-estate-awareness" element={<PublicRoute><RealEstateAwareness /></PublicRoute>} />

        {/* Other public pages */}
        <Route path="/contact" element={<PublicRoute><Contact /></PublicRoute>} />
        <Route path="/about" element={<PublicRoute><About /></PublicRoute>} />
        <Route path="/sell-let" element={<PublicRoute><SellLet /></PublicRoute>} />
        <Route path="/careers" element={<PublicRoute><Careers /></PublicRoute>} />
        <Route path="/partnership" element={<PublicRoute><Partnership /></PublicRoute>} />
        <Route path="/flexible-workspace" element={<PublicRoute><FlexibleWorkspace /></PublicRoute>} />
        <Route path="/direct-lease-retails" element={<PublicRoute><DirectLeaseRetails /></PublicRoute>} />

        {/* === Admin Routes === */}
        {/* Login — no layout, no auth required */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected admin routes — wrapped in AdminLayout */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Redirect /admin to /admin/dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />

          {/* Dashboard — all roles */}
          <Route path="dashboard" element={<RoleRoute allowedRoles={ALL_ROLES}><Dashboard /></RoleRoute>} />

          {/* Properties — admin + manager */}
          <Route path="properties" element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}><AdminProperties /></RoleRoute>} />
          <Route path="properties/add" element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}><AddProperty /></RoleRoute>} />
          <Route path="properties/edit/:id" element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}><EditProperty /></RoleRoute>} />

          {/* Leads — all roles */}
          <Route path="leads" element={<RoleRoute allowedRoles={ALL_ROLES}><AdminLeads /></RoleRoute>} />
          <Route path="leads/:id" element={<RoleRoute allowedRoles={ALL_ROLES}><LeadDetail /></RoleRoute>} />

          {/* SEO — admin only */}
          <Route path="seo" element={<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminSeo /></RoleRoute>} />

          {/* Articles — admin + manager */}
          <Route path="articles" element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}><AdminArticles /></RoleRoute>} />
          <Route path="articles/add" element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}><ArticleForm /></RoleRoute>} />
          <Route path="articles/edit/:id" element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}><ArticleForm /></RoleRoute>} />

          {/* FAQs — admin + manager */}
          <Route path="faqs" element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}><FaqManager /></RoleRoute>} />

          {/* Neighborhoods — admin + manager */}
          <Route path="neighborhoods" element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}><AdminNeighborhoods /></RoleRoute>} />

          {/* Partners — admin + manager */}
          <Route path="partners" element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}><AdminPartners /></RoleRoute>} />

          {/* Site Settings — admin only */}
          <Route path="settings" element={<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminSettings /></RoleRoute>} />
        </Route>

        {/* 404 Not Found */}
        <Route path="*" element={<PublicRoute><NotFound /></PublicRoute>} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
