import React, { memo } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import PATHS from '../../routes/paths';
import styles from './PropertyCard.module.css';
import { Area, Price } from '../ui';
import { CONSTRUCTION_STATUS } from '../../config/enums';
import { EMPTY, formatBhk } from '../../utils/format';
import { toneStyles } from '../ui/tones';

/**
 * One property, as the listing, the featured row and the similar row show it.
 *
 * It reads the contract record of §6.1 directly: the cover comes from
 * `images[].isCover`, the badges are master data with their own tone and icon,
 * and the price knows whether it is a sale or a monthly rent (D33).
 *
 * What the boilerplate card did and this one does not: no autoplaying videos
 * in a grid, no per-card image carousel, and no heart button that forgot what
 * it was told — the shortlist arrives with its own storage in prompt 26
 * (ADD-10).
 */

const LISTING_BADGE = {
  sale: { label: 'For sale', className: 'badgeSale' },
  rent: { label: 'For rent', className: 'badgeRent' },
  lease: { label: 'For lease', className: 'badgeRent' },
};

/** The image an editor marked as the cover, else the first one. */
const coverImage = (property) => {
  const images = Array.isArray(property.images) ? property.images : [];
  return images.find((image) => image?.isCover) ?? images[0] ?? null;
};

/** Super built-up first, then carpet, then plot — whichever the record has. */
const headlineArea = (property) => {
  const area = property.area ?? {};
  const value = area.superBuiltUpArea ?? area.carpetArea ?? area.plotArea ?? null;
  return value === null
    ? null
    : { value, unit: area.areaUnit === 'sqft' ? 'sq ft' : area.areaUnit };
};

const PropertyCard = memo(({ property }) => {
  if (!property) return null;

  const cover = coverImage(property);
  const listing = LISTING_BADGE[property.listingType] ?? LISTING_BADGE.sale;
  const pricing = property.pricing ?? {};
  const isRental = property.listingType === 'rent' || property.listingType === 'lease';
  const area = headlineArea(property);
  const bedrooms = property.configuration?.bedrooms;
  const badges = Array.isArray(property.badges) ? property.badges.slice(0, 2) : [];

  const place = [property.location?.locality?.name, property.location?.city?.name]
    .filter(Boolean)
    .join(', ');

  return (
    <div className={styles.card}>
      <div className={styles.imageWrapper}>
        {cover?.url ? (
          <img
            src={cover.url}
            alt={cover.alt || property.title}
            className={styles.image}
            loading="lazy"
          />
        ) : (
          <div className={styles.imagePlaceholder} />
        )}

        <span className={`${styles.badge} ${styles[listing.className]}`}>{listing.label}</span>

        {badges.length > 0 || property.isVerified ? (
          <div className={styles.tagStrip}>
            {badges.map((badge) => {
              const tone = toneStyles(badge.color || 'neutral');
              return (
                <span
                  key={badge.id}
                  className={styles.tag}
                  style={{
                    background: tone.background,
                    color: tone.color,
                    borderColor: tone.border,
                  }}
                >
                  {badge.icon ? <Icon icon={badge.icon} style={{ fontSize: 12 }} /> : null}
                  {badge.name}
                </span>
              );
            })}
            {property.isVerified ? (
              <span
                className={styles.tag}
                style={{
                  background: toneStyles('success').background,
                  color: toneStyles('success').color,
                  borderColor: toneStyles('success').border,
                }}
              >
                <Icon icon="mdi:shield-check-outline" style={{ fontSize: 12 }} />
                Verified
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={styles.body}>
        <Link to={PATHS.propertyDetails(property.slug)} className={styles.name}>
          {property.title}
        </Link>

        <Price
          className={styles.price}
          value={isRental ? pricing.rentPerMonth : pricing.price}
          min={!isRental && pricing.priceRangeMin ? pricing.priceRangeMin : undefined}
          max={!isRental && pricing.priceRangeMax ? pricing.priceRangeMax : undefined}
          listingType={property.listingType}
          onRequest={Boolean(pricing.priceOnRequest)}
        />

        <div className={styles.location}>
          <Icon icon="mdi:map-marker-outline" className={styles.locIcon} />
          <span>{place || EMPTY}</span>
        </div>

        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>
              {bedrooms ? 'Configuration' : 'Property type'}
            </span>
            <span className={styles.detailValue}>
              {bedrooms ? formatBhk(bedrooms) : property.propertyType?.name || EMPTY}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Area</span>
            <span className={styles.detailValue}>
              {area ? <Area value={area.value} unit={area.unit} /> : EMPTY}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Status</span>
            <span className={styles.detailValue}>
              {CONSTRUCTION_STATUS.labelOf(property.constructionStatus) || EMPTY}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

PropertyCard.displayName = 'PropertyCard';

export default PropertyCard;
