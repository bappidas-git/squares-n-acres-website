import React from 'react';
import { Skeleton, Box } from '@mui/material';
import { BRAND } from '../../config/site';

/**
 * Branded skeleton loaders matching page layouts.
 * All use the MUI Skeleton wave animation (shimmer).
 */

/**
 * Mirrors `PropertyCard`: image, title, price, location and the three-column
 * detail grid. The card has no footer buttons, so neither does the skeleton —
 * a skeleton that does not match its component is a layout shift waiting to
 * happen (ADD-24).
 */
export const PropertyCardSkeleton = () => (
  <Box
    aria-busy="true"
    aria-live="polite"
    sx={{
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--color-border)',
      bgcolor: 'var(--color-bg)',
      boxShadow: 'var(--shadow-sm)',
    }}
  >
    <Skeleton variant="rectangular" width="100%" sx={{ aspectRatio: '4/3' }} animation="wave" />
    <Box sx={{ p: 2 }}>
      <Skeleton variant="text" width="75%" height={24} animation="wave" />
      <Skeleton variant="text" width="40%" height={28} animation="wave" sx={{ mt: 0.5 }} />
      <Skeleton variant="text" width="60%" height={20} animation="wave" sx={{ mt: 0.5 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 1.5 }}>
        <Skeleton variant="text" height={34} animation="wave" />
        <Skeleton variant="text" height={34} animation="wave" />
        <Skeleton variant="text" height={34} animation="wave" />
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

/**
 * Mirrors the property details shell: the breadcrumb, the 16/9 gallery with its
 * thumbnail column, the title lines, the price card and the key-facts grid, in
 * the same two-column proportions the page uses above 1200px. A skeleton that
 * does not match its page is a layout shift waiting to happen (ADD-24).
 */
export const PropertyDetailSkeleton = () => (
  <Box
    aria-busy="true"
    aria-live="polite"
    sx={{ maxWidth: 'var(--container-max)', mx: 'auto', px: 'var(--container-padding)', py: 3 }}
  >
    <Skeleton variant="text" width={280} height={20} animation="wave" />

    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 132px' },
        gap: 1.5,
        mt: 2,
      }}
    >
      <Skeleton
        variant="rectangular"
        width="100%"
        sx={{ aspectRatio: { xs: '4/3', md: '16/9' }, borderRadius: 'var(--radius-lg)' }}
        animation="wave"
      />
      <Box
        sx={{
          display: { xs: 'none', md: 'grid' },
          gridTemplateRows: 'repeat(3, 1fr)',
          gap: 1,
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            sx={{ aspectRatio: '4/3', borderRadius: 'var(--radius-md)' }}
            animation="wave"
          />
        ))}
      </Box>
    </Box>

    <Box sx={{ mt: 3 }}>
      <Skeleton variant="text" width="65%" height={40} animation="wave" />
      <Skeleton variant="text" width="35%" height={24} animation="wave" sx={{ mt: 1 }} />
      <Skeleton variant="text" width="45%" height={20} animation="wave" />
    </Box>

    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 8fr) minmax(320px, 4fr)' },
        gap: 3,
        mt: 3,
      }}
    >
      <Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 2,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="text" height={56} animation="wave" />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              width={112}
              height={40}
              sx={{ borderRadius: 'var(--radius-full)' }}
              animation="wave"
            />
          ))}
        </Box>
      </Box>

      <Skeleton
        variant="rectangular"
        height={340}
        sx={{ borderRadius: 'var(--radius-lg)' }}
        animation="wave"
      />
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
 * The admin table's loading state (§8.4): the same row height and the same
 * column count as the table it stands in, so the rows do not jump when the
 * answer arrives.
 *
 * @param {object} props
 * @param {number} [props.rows]
 * @param {number} [props.columns]
 */
export const TableSkeleton = ({ rows = 6, columns = 5 }) => (
  <Box role="status" aria-busy="true" aria-live="polite" aria-label="Loading rows">
    {Array.from({ length: rows }).map((_, row) => (
      <Box
        key={row}
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 2,
          alignItems: 'center',
          height: 48,
          px: 2,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {Array.from({ length: columns }).map((__, column) => (
          <Skeleton
            key={column}
            variant="text"
            height={20}
            animation="wave"
            width={column === 0 ? '80%' : '60%'}
          />
        ))}
      </Box>
    ))}
  </Box>
);

/**
 * Branded page loading spinner for Suspense fallback.
 */
/** The Suspense fallback: the monogram, a spinner ring and a live status. */
export const PageLoader = () => (
  <Box
    role="status"
    aria-live="polite"
    sx={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    }}
  >
    <Box sx={{ position: 'relative', width: 72, height: 72 }}>
      <Box
        component="img"
        src={BRAND.iconUrl}
        alt=""
        sx={{ position: 'absolute', inset: '14px', width: 44, height: 44, objectFit: 'contain' }}
      />
      <Box
        sx={{
          width: 72,
          height: 72,
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: 'var(--radius-full)',
          animation: 'pageLoaderSpin 0.8s linear infinite',
          '@keyframes pageLoaderSpin': { to: { transform: 'rotate(360deg)' } },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />
    </Box>
    <Box
      component="span"
      sx={{
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-muted)',
        fontWeight: 'var(--font-weight-semibold)',
      }}
    >
      Loading&hellip;
    </Box>
  </Box>
);
