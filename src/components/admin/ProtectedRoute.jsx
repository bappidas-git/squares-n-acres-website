import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Button, Paper } from '@mui/material';
import { Icon } from '@iconify/react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

/**
 * 403 Forbidden page — shown when user is authenticated but lacks role access.
 */
const Forbidden = () => {
  const { getDefaultRoute } = useAdminAuth();

  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          textAlign: 'center',
          maxWidth: 440,
          p: { xs: 3, sm: 5 },
          borderRadius: 3,
          bgcolor: 'transparent',
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: 'rgba(239,68,68,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <Icon icon="mdi:shield-lock-outline" style={{ fontSize: 36, color: '#EF4444' }} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1B2A4A', mb: 1 }}>
          403
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1B2A4A', mb: 1 }}>
          Access Denied
        </Typography>
        <Typography variant="body2" sx={{ color: '#6B7280', mb: 3 }}>
          You don't have permission to access this page. Please contact your administrator
          if you believe this is an error.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          href={getDefaultRoute()}
          sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
          startIcon={<Icon icon="mdi:arrow-left" style={{ fontSize: 18 }} />}
        >
          Go to Dashboard
        </Button>
      </Paper>
    </Box>
  );
};

/**
 * ProtectedRoute — guards admin routes.
 *
 * Usage:
 *   <ProtectedRoute>                          → Requires authentication only
 *   <ProtectedRoute allowedRoles={['admin']}> → Requires authentication + role
 *
 * Behavior:
 *   1. Loading         → Spinner
 *   2. Not logged in   → Redirect to /admin/login
 *   3. Wrong role      → Show 403 Forbidden
 *   4. Authorized      → Render children
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, role } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#F4F6F8',
        }}
      >
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Role check: if allowedRoles is provided, verify user's role
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Forbidden />;
  }

  return children;
};

export default ProtectedRoute;
