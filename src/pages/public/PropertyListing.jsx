import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useLocation, useSearchParams } from 'react-router-dom';

import PropertyCard from '../../components/common/PropertyCard';
import PropertyFilters from '../../components/common/PropertyFilters';
import propertyService from '../../services/propertyService';
import styles from './PropertyListing.module.css';
import toLegacyProperty from '../../utils/adapters/legacyProperty';
import { PropertyGridSkeleton } from '../../components/common/SkeletonLoaders';
import { SITE } from '../../config/site';
import { isCanceled } from '../../services/apiError';
import { useMasterData } from '../../contexts/MasterDataContext';

const ITEMS_PER_PAGE = 9;

/**
 * Prompt 26 makes this page server-driven (D94). Until then it asks for one
 * page of the contract's maximum size and does the narrowing in the browser,
 * which is the behaviour the filter panel was written against.
 */
const MAX_PER_PAGE = 100;

const PRICE_RANGES_MAP = {
  '0-5000000': { min: 0, max: 5000000 },
  '5000000-10000000': { min: 5000000, max: 10000000 },
  '10000000-20000000': { min: 10000000, max: 20000000 },
  '20000000-50000000': { min: 20000000, max: 50000000 },
  '50000000-Infinity': { min: 50000000, max: Infinity },
};

// Route configuration for different listing pages
const ROUTE_CONFIG = {
  '/properties': {
    title: 'Property Listings',
    subtitle: 'Browse our exclusive collection of premium properties',
    seoTitle: `Property Listings | ${SITE.name}`,
    preFilters: {},
  },
  '/buy/pre-launch': {
    title: 'Pre-Launch Properties',
    subtitle: 'Discover upcoming premium properties before they hit the market',
    seoTitle: `Pre-Launch Properties | ${SITE.name}`,
    preFilters: { status: 'pre-launch', type: 'sale' },
  },
  '/buy/under-construction': {
    title: 'Under Construction Properties',
    subtitle: 'Invest early in premium properties currently under development',
    seoTitle: `Under Construction Properties | ${SITE.name}`,
    preFilters: { status: 'under-construction', type: 'sale' },
  },
  '/buy/ready-to-move': {
    title: 'Ready to Move Properties',
    subtitle: 'Move into your dream home right away with our ready properties',
    seoTitle: `Ready to Move Properties | ${SITE.name}`,
    preFilters: { status: 'ready-to-move', type: 'sale' },
  },
  '/rent/apartments': {
    title: 'Apartments for Rent',
    subtitle: 'Find the perfect apartment to rent from our premium collection',
    seoTitle: `Apartments for Rent | ${SITE.name}`,
    preFilters: { propertyType: 'apartments', type: 'rent' },
  },
  '/rent/villas': {
    title: 'Villas for Rent',
    subtitle: 'Explore luxurious villas available for rent',
    seoTitle: `Villas for Rent | ${SITE.name}`,
    preFilters: { propertyType: 'villas', type: 'rent' },
  },
};

const PropertyListing = ({ routePath }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { bySlug, byId } = useMasterData();

  const currentPath = routePath || location.pathname;
  const baseConfig = ROUTE_CONFIG[currentPath] || ROUTE_CONFIG['/properties'];

  // Dynamic config override based on URL type param (for homepage category card links)
  const TYPE_LABELS = {
    sale: {
      title: 'Properties for Sale',
      subtitle: 'Explore premium properties available for purchase',
      seoTitle: `Properties for Sale | ${SITE.name}`,
    },
    rent: {
      title: 'Properties for Rent',
      subtitle: 'Find rental properties with flexible terms and premium amenities',
      seoTitle: `Properties for Rent | ${SITE.name}`,
    },
    lease: {
      title: 'Commercial Spaces for Lease',
      subtitle: 'Discover premium commercial and office spaces for your business',
      seoTitle: `Office Spaces for Lease | ${SITE.name}`,
    },
  };

  const urlType = searchParams.get('type');
  const typeOverride = urlType && !baseConfig.preFilters.type ? TYPE_LABELS[urlType] : null;
  const config = typeOverride
    ? { ...baseConfig, ...typeOverride, preFilters: baseConfig.preFilters }
    : baseConfig;

  const [allProperties, setAllProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Initialize filters from URL params + pre-filters
  const initFilters = useCallback(() => {
    const bhk = searchParams.get('bhk');
    const priceRange = searchParams.get('priceRange');
    const locations = searchParams.get('locations');
    const propertyType = searchParams.get('propertyType');
    const status = searchParams.get('status');
    const developer = searchParams.get('developer');

    return {
      bhk: bhk ? bhk.split(',') : [],
      priceRange: priceRange || '',
      locations: locations ? locations.split(',') : [],
      propertyType: propertyType || '',
      status: status || '',
      developer: developer || '',
      ...config.preFilters,
    };
  }, [searchParams, config.preFilters]);

  const [filters, setFilters] = useState(initFilters);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || '');

  // The route's pre-filters (`type`, `status`, `propertyType` — the vocabulary
  // the filter panel still speaks) translated into the contract names of §5.7.
  const requestParams = useMemo(() => {
    const params = { perPage: MAX_PER_PAGE };
    const { type, status, propertyType } = config.preFilters;

    const listingType = type || searchParams.get('type');
    if (listingType) params.listingType = listingType;
    if (status) params.constructionStatus = status;

    // A route's pre-filter names a type by slug (`/rent/villas`); the filter
    // panel's select names one by id (§5.7). Both resolve to the same record.
    const wantedType = propertyType || searchParams.get('propertyType');
    const typeId = wantedType
      ? (bySlug('propertyTypes', wantedType)?.id ?? byId('propertyTypes', wantedType)?.id ?? null)
      : null;
    if (typeId) params.propertyTypeId = typeId;

    const q = searchParams.get('q');
    if (q) params.q = q;

    return params;
  }, [config.preFilters, searchParams, bySlug, byId]);

  const [refreshToken, setRefreshToken] = useState(0);
  const refetch = useCallback(() => setRefreshToken((token) => token + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    propertyService
      .list(requestParams, { signal: controller.signal })
      .then(({ data }) => {
        setAllProperties(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((thrown) => {
        if (isCanceled(thrown)) return;
        setError(thrown.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [requestParams, refreshToken]);

  // Re-init filters when route changes
  useEffect(() => {
    setFilters(initFilters());
    setPage(1);
  }, [currentPath, initFilters]);

  /**
   * Each row keeps both views of the same property: `record` is what the API
   * sent and what `PropertyCard` renders, `legacy` is the adapter's shape that
   * this page's filter and sort code still speaks. Prompt 26 deletes `legacy`.
   */
  const rows = useMemo(
    () => allProperties.map((record) => ({ record, legacy: toLegacyProperty(record) })),
    [allProperties]
  );

  const legacyProperties = useMemo(() => rows.map((row) => row.legacy), [rows]);

  // Client-side filtering
  const filteredRows = useMemo(() => {
    let result = rows;

    const area = searchParams.get('area');
    if (area) {
      result = result.filter((row) =>
        (row.legacy.location?.area || '').toLowerCase().includes(area.toLowerCase())
      );
    }

    if (filters.bhk && filters.bhk.length > 0) {
      result = result.filter((row) =>
        filters.bhk.some((bhk) =>
          row.legacy.configuration.some((config_) =>
            String(config_).toLowerCase().includes(String(bhk).toLowerCase())
          )
        )
      );
    }

    if (filters.priceRange) {
      const range = PRICE_RANGES_MAP[filters.priceRange];
      if (range) {
        result = result.filter(
          (row) => row.legacy.price >= range.min && row.legacy.price < range.max
        );
      }
    }

    if (filters.locations && filters.locations.length > 0) {
      result = result.filter((row) =>
        filters.locations.some((locality) =>
          (row.legacy.location?.area || '').toLowerCase().includes(locality.toLowerCase())
        )
      );
    }

    if (filters.propertyType && !config.preFilters.propertyType) {
      const wanted = String(filters.propertyType);
      result = result.filter(
        (row) =>
          String(row.legacy.propertyTypeId ?? '') === wanted || row.legacy.propertyType === wanted
      );
    }

    if (filters.status && !config.preFilters.status) {
      result = result.filter((row) => row.legacy.status === filters.status);
    }

    if (filters.developer) {
      result = result.filter((row) =>
        row.legacy.developer?.toLowerCase().includes(filters.developer.toLowerCase())
      );
    }

    return result;
  }, [rows, filters, config.preFilters, searchParams]);

  // Sorting
  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    const time = (value) => (value ? new Date(value).getTime() || 0 : 0);

    switch (sortBy) {
      case 'price-asc':
        sorted.sort((a, b) => (Number(a.legacy.price) || 0) - (Number(b.legacy.price) || 0));
        break;
      case 'price-desc':
        sorted.sort((a, b) => (Number(b.legacy.price) || 0) - (Number(a.legacy.price) || 0));
        break;
      case 'newest':
        sorted.sort((a, b) => time(b.record.publishedAt) - time(a.record.publishedAt));
        break;
      case 'possession':
        sorted.sort(
          (a, b) =>
            (time(a.record.possessionDate) || Infinity) -
            (time(b.record.possessionDate) || Infinity)
        );
        break;
      default:
        break;
    }
    return sorted;
  }, [filteredRows, sortBy]);

  // Pagination
  const paginatedRows = useMemo(
    () => sortedRows.slice(0, page * ITEMS_PER_PAGE),
    [sortedRows, page]
  );

  const hasMore = paginatedRows.length < sortedRows.length;

  const handleLoadMore = () => {
    setLoadingMore(true);
    // Small delay for UX
    setTimeout(() => {
      setPage((prev) => prev + 1);
      setLoadingMore(false);
    }, 300);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleClearFilters = () => {
    const cleared = {
      bhk: [],
      priceRange: '',
      locations: [],
      propertyType: '',
      status: '',
      developer: '',
      ...config.preFilters,
    };
    setFilters(cleared);
    setPage(1);
  };

  // Animation variants for staggered grid items
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' },
    }),
  };

  return (
    <>
      <Helmet>
        <title>{config.seoTitle}</title>
        <meta name="description" content={config.subtitle} />
      </Helmet>

      {/* Page Header */}
      <motion.div
        className={styles.pageHeader}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className={styles.headerContainer}>
          <h1 className={styles.pageTitle}>{config.title}</h1>
          <p className={styles.pageSubtitle}>{config.subtitle}</p>
          <div className={styles.divider} />
        </div>
      </motion.div>

      {/* Main Content */}
      <section className={styles.section}>
        <div className={styles.container}>
          {/* Filters */}
          <PropertyFilters
            properties={legacyProperties}
            totalCount={sortedRows.length}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            sortBy={sortBy}
            onSortChange={setSortBy}
            preFilters={config.preFilters}
          />

          {/* Loading State — branded shimmer skeletons */}
          {loading && <PropertyGridSkeleton count={6} />}

          {/* Error State */}
          {error && !loading && (
            <div className={styles.errorState}>
              <Icon icon="mdi:alert-circle-outline" className={styles.errorIcon} />
              <p className={styles.emptyTitle}>{error}</p>
              <button className={styles.retryBtn} onClick={refetch} type="button">
                Try again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && sortedRows.length === 0 && (
            <div className={styles.emptyState}>
              <Icon icon="mdi:home-search-outline" className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>No properties found</h3>
              <p className={styles.emptyText}>
                No properties found matching your criteria. Try adjusting your filters or clearing
                them to see all available properties.
              </p>
              <button className={styles.clearFiltersBtn} onClick={handleClearFilters} type="button">
                Clear Filters
              </button>
            </div>
          )}

          {/* Property Grid */}
          {!loading && !error && sortedRows.length > 0 && (
            <>
              <div className={styles.propertyGrid}>
                {paginatedRows.map((row, index) => (
                  <motion.div
                    key={row.record.id}
                    custom={index % ITEMS_PER_PAGE}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <PropertyCard property={row.record} />
                  </motion.div>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className={styles.loadMoreWrapper}>
                  <button
                    className={styles.loadMoreBtn}
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    type="button"
                  >
                    {loadingMore ? 'Loading...' : 'Load More Properties'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
};

export default PropertyListing;
