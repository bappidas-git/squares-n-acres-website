import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import Card from '../../../components/ui/Card';
import IconButton from '../../../components/ui/IconButton';
import PATHS from '../../../routes/paths';
import { Button } from '../../../components/ui';
import { formatNumber } from '../../../utils/format';
import { publicUrlOf } from '../properties/publicUrl';

import styles from './DashboardPage.module.css';
import { DASHBOARD } from '../../../config/adminCopy';

/**
 * The five listings doing the most work (§6.16 `topProperties`).
 *
 * Ranked by views weighted with enquiries, because a page that is opened a
 * thousand times and asked about never is a different kind of success from one
 * that is opened fifty times and asked about five.
 *
 * @param {object} props
 * @param {Array<object>} props.properties
 * @param {boolean} [props.canEdit]
 */
export default function TopPropertiesCard({ properties = [], canEdit = false }) {
  return (
    <Card as="section" className={styles.card} aria-labelledby="top-properties-heading">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="top-properties-heading">
          Top listings
        </h2>
        <Button variant="link" size="sm" to={PATHS.adminProperties}>
          All properties
        </Button>
      </div>

      {properties.length === 0 ? (
        <p className={styles.emptyLine}>{DASHBOARD.propertiesEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {properties.map((property) => (
            <li key={property.id} className={styles.listRow}>
              <div className={styles.listBody}>
                {canEdit ? (
                  <Link className={styles.rowLink} to={PATHS.adminPropertyEdit(property.id)}>
                    {property.title}
                  </Link>
                ) : (
                  <span className={styles.rowLink}>{property.title}</span>
                )}
                <span className={styles.rowMeta}>
                  {`${formatNumber(property.viewCount)} views · `}
                  {/* The enquiries are leads: the count opens them (prompt 51). */}
                  <Link
                    className={styles.countLink}
                    to={`${PATHS.adminLeads}?propertyId=${property.id}`}
                  >
                    {`${formatNumber(property.enquiryCount)} enquiries`}
                  </Link>
                </span>
              </div>
              {property.isActive === false ? (
                // An inactive listing's public page answers 404: its form is
                // where it can be looked at and switched back on.
                canEdit ? (
                  <IconButton
                    label={`${property.title} is not live — open its form`}
                    size="sm"
                    to={PATHS.adminPropertyEdit(property.id)}
                  >
                    <Icon icon="mdi:pencil-outline" width="18" height="18" />
                  </IconButton>
                ) : null
              ) : (
                <IconButton
                  label={`View ${property.title} on the site`}
                  size="sm"
                  href={publicUrlOf(property.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon icon="mdi:open-in-new" width="18" height="18" />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
