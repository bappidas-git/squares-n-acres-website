import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  IconButton,
  Collapse,
  useMediaQuery,
  useTheme,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { leadService } from '../../services/api';
import { getNavItemsForRole } from '../../config/rbac';
import styles from './AdminLayout.module.css';

// Page title mapping
const pageTitles = {
  '/admin/dashboard': 'Dashboard',
  '/admin/properties': 'Properties',
  '/admin/properties/add': 'Add Property',
  '/admin/leads': 'Leads',
  '/admin/articles': 'Articles',
  '/admin/articles/add': 'New Article',
  '/admin/seo': 'SEO Manager',
  '/admin/faqs': 'FAQ Manager',
  '/admin/neighborhoods': 'Neighborhoods',
  '/admin/settings': 'Site Settings',
};

// Format source for display
const formatSource = (source) => {
  if (!source) return 'Unknown';
  const sourceMap = {
    'property-detail-page': 'Property Enquiry',
    'homepage-contact-form': 'Contact Form',
    'newsletter': 'Newsletter',
    'home-loan': 'Home Loan',
    'legal-assistance': 'Legal',
    'interior-designing': 'Interior Design',
    'sell-let': 'Sell/Let',
    'careers': 'Careers',
    'partnership': 'Partnership',
    'property-listing-page': 'Property Listing',
  };
  return sourceMap[source] || source.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const AdminLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, role } = useAdminAuth();

  // Dynamic navigation items based on user role (from centralized RBAC config)
  const navItems = useMemo(() => getNavItemsForRole(role), [role]);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [newLeadCount, setNewLeadCount] = useState(0);

  // Notification state
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const lastLeadCountRef = useRef(0);
  const isInitialFetchRef = useRef(true);

  // Fetch leads and update counts
  const fetchLeads = useCallback(async () => {
    try {
      const leads = await leadService.getAll();
      const allLeads = Array.isArray(leads) ? leads : [];
      const newCount = allLeads.filter((l) => l.status === 'new').length;
      setNewLeadCount(newCount);

      // Store recent leads (newest 5) for notification dropdown
      const sorted = [...allLeads]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      setRecentLeads(sorted);

      // Detect new leads (not on initial fetch)
      if (!isInitialFetchRef.current && allLeads.length > lastLeadCountRef.current) {
        const newestLead = sorted[0];
        if (newestLead) {
          setToastMessage(
            `New lead from ${formatSource(newestLead.source)}: ${newestLead.name}`
          );
          setToastOpen(true);
        }
      }
      lastLeadCountRef.current = allLeads.length;
      isInitialFetchRef.current = false;
    } catch {
      setNewLeadCount(0);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  // Current page title
  const pageTitle = useMemo(() => {
    const path = location.pathname;
    // Check for exact match first
    if (pageTitles[path]) return pageTitles[path];
    // Check for partial match (e.g., edit pages)
    if (path.includes('/admin/properties/edit')) return 'Edit Property';
    if (path.includes('/admin/articles/edit')) return 'Edit Article';
    if (path.includes('/admin/leads/')) return 'Lead Detail';
    return 'Admin Panel';
  }, [location.pathname]);

  const toggleExpand = (label) => {
    setExpandedItems((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path) => location.pathname === path;
  const isParentActive = (children) =>
    children?.some((child) => location.pathname.startsWith(child.path));

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'A';

  const handleLogout = () => {
    setProfileAnchor(null);
    logout();
    navigate('/admin/login');
  };

  // Sidebar content (shared between desktop and mobile drawer)
  const renderNavItems = (items) =>
    items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const expanded = expandedItems[item.label] || isParentActive(item.children);
      const active = hasChildren ? isParentActive(item.children) : isActive(item.path);

      return (
        <div key={item.label} className={styles.navSection}>
          {hasChildren ? (
            <>
              <div
                className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                onClick={() => toggleExpand(item.label)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && toggleExpand(item.label)}
              >
                <span className={styles.navIcon}>
                  <Icon icon={item.icon} />
                </span>
                {(!collapsed || isMobile) && (
                  <>
                    <span className={styles.navLabel}>{item.label}</span>
                    <span
                      className={`${styles.navExpandIcon} ${
                        expanded ? styles.navExpandIconOpen : ''
                      }`}
                    >
                      <Icon icon="mdi:chevron-down" />
                    </span>
                  </>
                )}
              </div>
              {(!collapsed || isMobile) && (
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                  <div className={styles.navSubItems}>
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={`${styles.navSubItem} ${
                          isActive(child.path) ? styles.navSubItemActive : ''
                        }`}
                        onClick={() => isMobile && setMobileOpen(false)}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                </Collapse>
              )}
            </>
          ) : (
            <NavLink
              to={item.path}
              className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
              onClick={() => isMobile && setMobileOpen(false)}
            >
              <span className={styles.navIcon}>
                <Icon icon={item.icon} />
              </span>
              {(!collapsed || isMobile) && (
                <>
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.badge && newLeadCount > 0 && (
                    <span className={styles.navBadge}>{newLeadCount}</span>
                  )}
                </>
              )}
            </NavLink>
          )}
        </div>
      );
    });

  const sidebarContent = (mobile = false) => (
    <>
      {/* Brand */}
      <div className={styles.sidebarBrand}>
        <div className={styles.brandLogo}>
          <Icon icon="mdi:home-city" style={{ fontSize: 20, color: '#C9A86C' }} />
        </div>
        {(!collapsed || mobile) && (
          <div className={styles.brandText}>
            <div className={styles.brandTitle}>H.O.M Advisory</div>
            <div className={styles.brandSubtitle}>Admin Panel</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className={mobile ? styles.mobileDrawerNav : styles.sidebarNav}>
        {(!collapsed || mobile) && (
          <div className={styles.navSectionLabel}>Main Menu</div>
        )}
        {renderNavItems(navItems)}
      </div>

      {/* Footer */}
      <div className={mobile ? styles.mobileDrawerFooter : styles.sidebarFooter}>
        <div className={styles.userCard}>
          <div className={styles.userAvatar}>{userInitials}</div>
          {(!collapsed || mobile) && (
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user?.name || 'Admin'}</div>
              <div className={styles.userRole}>{(user?.role || 'admin').replace(/^\w/, (c) => c.toUpperCase())}</div>
            </div>
          )}
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} type="button">
          <Icon icon="mdi:logout" style={{ fontSize: 18 }} />
          {(!collapsed || mobile) && <span>Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className={styles.adminRoot}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}
        >
          {sidebarContent(false)}
        </aside>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': { width: 280, border: 'none' },
          }}
        >
          <div className={styles.mobileDrawer}>
            <div className={styles.mobileDrawerHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={styles.brandLogo}>
                  <Icon icon="mdi:home-city" style={{ fontSize: 20, color: '#C9A86C' }} />
                </div>
                <div>
                  <div className={styles.brandTitle}>H.O.M Advisory</div>
                  <div className={styles.brandSubtitle}>Admin Panel</div>
                </div>
              </div>
              <IconButton onClick={() => setMobileOpen(false)} size="small">
                <Icon icon="mdi:close" />
              </IconButton>
            </div>
            {sidebarContent(true)}
          </div>
        </Drawer>
      )}

      {/* Top Bar */}
      <header
        className={`${styles.topBar} ${
          !isMobile && collapsed ? styles.topBarCollapsed : ''
        }`}
      >
        <div className={styles.topBarLeft}>
          {isMobile ? (
            <button
              className={styles.collapseBtn}
              onClick={() => setMobileOpen(true)}
              type="button"
              aria-label="Open menu"
            >
              <Icon icon="mdi:menu" style={{ fontSize: 22 }} />
            </button>
          ) : (
            <button
              className={styles.collapseBtn}
              onClick={() => setCollapsed((prev) => !prev)}
              type="button"
              aria-label="Toggle sidebar"
            >
              <Icon
                icon={collapsed ? 'mdi:menu' : 'mdi:menu-open'}
                style={{ fontSize: 22 }}
              />
            </button>
          )}
          <span className={styles.pageTitle}>{pageTitle}</span>
        </div>

        <div className={styles.topBarRight}>
          {/* Notification Bell */}
          <button
            className={styles.topBarIconBtn}
            type="button"
            aria-label="Notifications"
            onClick={(e) => setNotifAnchor(e.currentTarget)}
          >
            <Icon icon="mdi:bell-outline" style={{ fontSize: 22 }} />
            {newLeadCount > 0 && (
              <span className={styles.notificationBadge}>
                {newLeadCount > 9 ? '9+' : newLeadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          <Menu
            anchorEl={notifAnchor}
            open={Boolean(notifAnchor)}
            onClose={() => setNotifAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: { width: 340, mt: 1, borderRadius: 2, maxHeight: 420 },
            }}
          >
            <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1B2A4A' }}>
                Notifications
              </Typography>
              {newLeadCount > 0 && (
                <Box
                  sx={{
                    bgcolor: '#EFF6FF',
                    color: '#3B82F6',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                  }}
                >
                  {newLeadCount} new
                </Box>
              )}
            </Box>
            <Divider />
            {recentLeads.length === 0 ? (
              <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                <Icon icon="mdi:bell-off-outline" style={{ fontSize: 32, color: '#D1D5DB' }} />
                <Typography sx={{ fontSize: '0.8125rem', color: '#9CA3AF', mt: 1 }}>
                  No recent leads
                </Typography>
              </Box>
            ) : (
              recentLeads.map((lead) => {
                const isNew = lead.status === 'new';
                return (
                  <MenuItem
                    key={lead.id}
                    onClick={() => {
                      setNotifAnchor(null);
                      navigate(`/admin/leads/${lead.id}`);
                    }}
                    sx={{
                      py: 1.5,
                      px: 2,
                      bgcolor: isNew ? 'rgba(59,130,246,0.04)' : 'transparent',
                      '&:hover': { bgcolor: isNew ? 'rgba(59,130,246,0.08)' : undefined },
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1.5, width: '100%', alignItems: 'flex-start' }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          bgcolor: isNew ? '#EFF6FF' : '#F3F4F6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon
                          icon="mdi:account-outline"
                          style={{ fontSize: 18, color: isNew ? '#3B82F6' : '#9CA3AF' }}
                        />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            fontWeight: isNew ? 600 : 400,
                            color: '#1B2A4A',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {lead.name}
                        </Typography>
                        <Typography sx={{ fontSize: '0.6875rem', color: '#6B7280' }}>
                          {formatSource(lead.source)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.625rem', color: '#9CA3AF', mt: 0.25 }}>
                          {new Date(lead.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      </Box>
                      {isNew && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: '#3B82F6',
                            flexShrink: 0,
                            mt: 0.5,
                          }}
                        />
                      )}
                    </Box>
                  </MenuItem>
                );
              })
            )}
            <Divider />
            <MenuItem
              onClick={() => {
                setNotifAnchor(null);
                navigate('/admin/leads');
              }}
              sx={{ justifyContent: 'center', py: 1.5 }}
            >
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#3B82F6' }}>
                View All Leads
              </Typography>
            </MenuItem>
          </Menu>

          <button
            className={styles.profileDropdown}
            type="button"
            onClick={(e) => setProfileAnchor(e.currentTarget)}
            aria-label="Profile menu"
          >
            <div className={styles.profileAvatar}>{userInitials}</div>
            {!isMobile && (
              <span className={styles.profileName}>{user?.name || 'Admin'}</span>
            )}
            <Icon icon="mdi:chevron-down" style={{ fontSize: 16, color: '#9CA3AF' }} />
          </button>

          <Menu
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={() => setProfileAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: { width: 200, mt: 1, borderRadius: 2 },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1B2A4A' }}>
                {user?.name || 'Admin'}
              </Box>
              <Box sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                {user?.email || 'admin@homadvisory.com'}
              </Box>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                setProfileAnchor(null);
                navigate('/admin/settings');
              }}
            >
              <ListItemIcon>
                <Icon icon="mdi:cog-outline" style={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>
                Settings
              </ListItemText>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Icon icon="mdi:logout" style={{ fontSize: 18, color: '#EF4444' }} />
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={{ fontSize: '0.875rem', color: '#EF4444' }}
              >
                Logout
              </ListItemText>
            </MenuItem>
          </Menu>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`${styles.mainContent} ${
          !isMobile && collapsed ? styles.mainContentCollapsed : ''
        }`}
      >
        <Outlet />
      </main>

      {/* Toast notification for new leads */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={5000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 8 }}
      >
        <Alert
          onClose={() => setToastOpen(false)}
          severity="info"
          icon={<Icon icon="mdi:account-plus-outline" style={{ fontSize: 20 }} />}
          sx={{
            borderRadius: 2,
            bgcolor: '#EFF6FF',
            color: '#1B2A4A',
            border: '1px solid #BFDBFE',
            '& .MuiAlert-icon': { color: '#3B82F6' },
            cursor: 'pointer',
          }}
          onClick={() => {
            setToastOpen(false);
            navigate('/admin/leads');
          }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default AdminLayout;
