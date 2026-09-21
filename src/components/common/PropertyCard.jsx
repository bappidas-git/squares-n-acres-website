import React, { memo } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import PATHS from '../../routes/paths';
import ShortlistButton from './ShortlistButton';
import styles from './PropertyCard.module.css';
import { Area, Chip, LazyImage, Price } from '../ui';
import { CONSTRUCTION_STATUS } from '../../config/enums';
import { EMPTY, formatBhk } from '../../utils/format';
import { visibleBadges } from '../../utils/propertyBadges';

/**
 * One property, as the listing, the featured row and the similar row show it.
 *
 * It reads the contract record of §6.1 directly: the cover comes from
 * `images[].isCover`, the badges are the master-data records the API embeds —
 * each painted from its own tone token by `ui/Chip` (§2.4, §6.4) — and the
 * price knows whether it is a sale or a monthly rent (D33).
 *
 * The cover goes through `LazyImage`, so a Cloudinary photograph arrives at the
 * width this card is actually drawn at rather than at 1600 px (§8.6), and a
 * `picsum.photos` one is used exactly as it is.
 *
 * What the boilerplate card did and this one does not: no autoplaying videos
 * in a grid and no per-card image carousel. The heart is `ShortlistButton`,
 * which writes through `ShortlistContext` into `sna_shortlist` — the
 * boilerplate's remembered nothing (ADD-10).
 *
 * `variant="list"` is the same card laid on its side for the listing's list
 * view: image left, body right, and room for the editor's highlights, which
 * the grid has no space for.
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

/** How many of the editor's highlights the wide card has room for. */
const LIST_HIGHLIGHTS = 3;

const PropertyCard = memo(({ property, variant = 'grid' }) => {
  if (!property) return null;

  const cover = coverImage(property);
  const listing = LISTING_BADGE[property.listingType] ?? LISTING_BADGE.sale;
  const pricing = property.pricing ?? {};
  const isRental = property.listingType === 'rent' || property.listingType === 'lease';
  const area = headlineArea(property);
  const bedrooms = property.configuration?.bedrooms;
  // The card draws its own "Verified" chip from `isVerified`, so the badge of
  // that name is dropped rather than printed beside it (`utils/propertyBadges`).
  const badges = visibleBadges(property, { limit: 2 });

  const place = [property.location?.locality?.name, property.location?.city?.name]
    .filter(Boolean)
    .join(', ');

  const highlights =
    variant === 'list' && Array.isArray(property.highlights)
      ? property.highlights.filter(Boolean).slice(0, LIST_HIGHLIGHTS)
      : [];

  return (
    <div className={[styles.card, variant === 'list' ? styles.list : ''].filter(Boolean).join(' ')}>
      <div className={styles.imageWrapper}>
        {cover?.url ? (
          <LazyImage
            src={cover.url}
            alt={cover.alt || property.title}
            ratio="4/3"
            // One card per row on a phone, two on a tablet, three in the grid.
            sizes="(max-width: 599px) 100vw, (max-width: 1199px) 50vw, 33vw"
            className={styles.imageBox}
            imageClassName={styles.image}
          />
        ) : (
          <div className={styles.imagePlaceholder} />
        )}

        <span className={`${styles.badge} ${styles[listing.className]}`}>{listing.label}</span>

        <ShortlistButton
          propertyId={property.id}
          title={property.title}
          onImage
          className={styles.heart}
        />

        {badges.length > 0 || property.isVerified ? (
          <div className={styles.tagStrip}>
            {badges.map((badge) => (
              <Chip
                key={badge.id}
                tone={badge.color || 'neutral'}
                icon={badge.icon ? <Icon icon={badge.icon} width="12" height="12" /> : null}
              >
                {badge.name}
              </Chip>
            ))}
            {property.isVerified ? (
              <Chip
                tone="success"
                icon={<Icon icon="mdi:shield-check-outline" width="12" height="12" />}
              >
                Verified
              </Chip>
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

        {highlights.length > 0 ? (
          <ul className={styles.highlights}>
            {highlights.map((highlight) => (
              <li key={highlight} className={styles.highlight}>
                <Icon
                  icon="mdi:check-circle-outline"
                  className={styles.highlightIcon}
                  aria-hidden="true"
                />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
});

PropertyCard.displayName = 'PropertyCard';

export default PropertyCard;
