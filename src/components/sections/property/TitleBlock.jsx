import { Icon } from '@iconify/react';

import { Badge } from '../../ui';
import { EMPTY, formatDate } from '../../../utils/format';
import { LISTING_TYPES } from '../../../config/enums';
import ShareButton from '../../common/ShareButton';
import ShortlistButton from '../../common/ShortlistButton';
import { visibleBadges } from '../../../utils/propertyBadges';

import styles from './TitleBlock.module.css';

/**
 * The listing's name, where it is, and the two things a visitor does with a
 * page before reading it: share it and save it.
 *
 * The address obeys `location.showExactLocation` (§6.1): a seller who has not
 * agreed to publish the door number gets the locality and a sentence saying so
 * — the street, the pincode and the coordinates appear nowhere on the page
 * (§7).
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 */
export default function TitleBlock({ property }) {
  if (!property) return null;

  const location = property.location ?? {};
  const exact = location.showExactLocation === true;
  const place = [location.locality?.name, location.city?.name].filter(Boolean).join(', ');
  // The seed carries a "Verified" badge in master data as well as the record's
  // own `isVerified` flag; printing both puts the word on screen twice. The
  // built-in chip wins here exactly as it does on the card, so the two surfaces
  // show the same green shield rather than one of each (`utils/propertyBadges`).
  const badges = visibleBadges(property);
  const listingLabel = LISTING_TYPES.labelOf(property.listingType);

  return (
    <header className={styles.block}>
      <div className={styles.head}>
        <div className={styles.headText}>
          {property.projectName && property.projectName !== property.title ? (
            <p className={styles.project}>{property.projectName}</p>
          ) : null}
          <h1 className={styles.title}>{property.title}</h1>
        </div>

        <div className={styles.actions}>
          <ShareButton title={property.title} context="property-details" />
          <ShortlistButton propertyId={property.id} title={property.title} />
        </div>
      </div>

      <div className={styles.badges}>
        {listingLabel ? (
          <Badge tone="primary">
            {listingLabel === 'Buy' ? 'For sale' : `For ${listingLabel.toLowerCase()}`}
          </Badge>
        ) : null}
        {property.isVerified ? (
          <Badge tone="success" icon={<Icon icon="mdi:shield-check-outline" aria-hidden="true" />}>
            Verified
          </Badge>
        ) : null}
        {badges.map((badge) => (
          <Badge key={badge.id} tone={badge.color || 'neutral'}>
            {badge.name}
          </Badge>
        ))}
      </div>

      <p className={styles.place}>
        <Icon icon="mdi:map-marker-outline" className={styles.placeIcon} aria-hidden="true" />
        <span>
          {exact && location.address ? `${location.address}, ` : ''}
          {place || EMPTY}
          {exact && location.pincode ? ` ${location.pincode}` : ''}
        </span>
      </p>

      {exact ? null : <p className={styles.approximate}>Exact location shared on request.</p>}

      <dl className={styles.meta}>
        {property.reraNumber ? (
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>
              <Icon
                icon={property.reraRegistered ? 'mdi:shield-check' : 'mdi:shield-outline'}
                className={property.reraRegistered ? styles.reraOn : styles.reraOff}
                aria-hidden="true"
              />
              RERA
            </dt>
            <dd className={styles.metaValue}>{property.reraNumber}</dd>
          </div>
        ) : null}

        {property.updatedAt ? (
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>
              <Icon icon="mdi:update" aria-hidden="true" />
              Updated
            </dt>
            <dd className={styles.metaValue}>{formatDate(property.updatedAt)}</dd>
          </div>
        ) : null}
      </dl>
    </header>
  );
}
