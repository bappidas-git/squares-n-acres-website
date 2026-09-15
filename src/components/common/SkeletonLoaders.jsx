import React from 'react';
import { Skeleton, Box } from '@mui/material';

/**
 * Branded skeleton loaders matching page layouts.
 * All use the MUI Skeleton wave animation (shimmer).
 */

export const PropertyCardSkeleton = () => (
  <Box
    sx={{
      borderRadius: '8px',
      overflow: 'hidden',
      bgcolor: 'background.paper',
      boxShadow: 1,
    }}
  >
    <Skeleton variant="rectangular" width="100%" sx={{ aspectRatio: '4/3' }} animation="wave" />
    <Box sx={{ p: 2 }}>
      <Skeleton variant="text" width="75%" height={24} animation="wave" />
      <Skeleton variant="text" width="40%" height={28} animation="wave" sx={{ mt: 0.5 }} />
      <Skeleton variant="text" width="60%" height={20} animation="wave" sx={{ mt: 0.5 }} />
      <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5 }}>
        <Skeleton variant="rounded" width="45%" height={36} animation="wave" />
        <Skeleton variant="rounded" width="45%" height={36} animation="wave" />
      </Box>
    </Box>
  </Box>
);

export const PropertyGridSkeleton = ({ count = 6 }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: {
        xs: '1fr',
        sm: 'repeat(2, 1fr)',
        md: 'repeat(3, 1fr)',
      },
      gap: 3,
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <PropertyCardSkeleton key={i} />
    ))}
  </Box>
);

export const PropertyDetailSkeleton = () => (
  <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2, py: 3 }}>
    <Skeleton variant="text" width={200} height={20} animation="wave" />
    <Skeleton
      variant="rectangular"
      width="100%"
      sx={{ aspectRatio: '16/9', borderRadius: '12px', mt: 2 }}
      animation="wave"
    />
    <Box sx={{ mt: 3 }}>
      <Skeleton variant="text" width="60%" height={40} animation="wave" />
      <Skeleton variant="text" width="30%" height={28} animation="wave" />
      <Skeleton variant="text" width="40%" height={24} animation="wave" />
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mt: 3 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: '8px' }} animation="wave" />
      ))}
    </Box>
  </Box>
);

export const ArticleCardSkeleton = () => (
  <Box sx={{ borderRadius: '8px', overflow: 'hidden', bgcolor: 'background.paper', boxShadow: 1 }}>
    <Skeleton variant="rectangular" width="100%" height={200} animation="wave" />
    <Box sx={{ p: 2 }}>
      <Skeleton variant="text" width="30%" height={16} animation="wave" />
      <Skeleton variant="text" width="80%" height={24} animation="wave" sx={{ mt: 1 }} />
      <Skeleton variant="text" width="100%" height={16} animation="wave" sx={{ mt: 1 }} />
      <Skeleton variant="text" width="70%" height={16} animation="wave" />
    </Box>
  </Box>
);

export const ArticleGridSkeleton = ({ count = 6 }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
      gap: 3,
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <ArticleCardSkeleton key={i} />
    ))}
  </Box>
);

export const PageHeroSkeleton = () => (
  <Box sx={{ py: 8, px: 2, textAlign: 'center', bgcolor: 'background.surface' }}>
    <Skeleton variant="text" width={120} height={24} animation="wave" sx={{ mx: 'auto' }} />
    <Skeleton variant="text" width="40%" height={44} animation="wave" sx={{ mx: 'auto', mt: 1 }} />
    <Skeleton variant="text" width="60%" height={24} animation="wave" sx={{ mx: 'auto', mt: 1 }} />
  </Box>
);

/**
 * Branded page loading spinner for Suspense fallback.
 */
export const PageLoader = () => (
  <Box
    sx={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    }}
  >
    <Box
      sx={{
        width: 48,
        height: 48,
        border: '3px solid #E5E7EB',
        borderTopColor: '#C9A86C',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        '@keyframes spin': {
          to: { transform: 'rotate(360deg)' },
        },
      }}
    />
    <Box
      component="span"
      sx={{
        fontFamily: '"Playfair Display", serif',
        fontSize: '1.1rem',
        color: 'text.secondary',
        fontWeight: 600,
      }}
    >
      H.O.M Advisory
    </Box>
  </Box>
);
