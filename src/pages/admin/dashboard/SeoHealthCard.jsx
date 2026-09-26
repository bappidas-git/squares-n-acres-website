import { Link } from 'react-router-dom';

import Card from '../../../components/ui/Card';
import PATHS from '../../../routes/paths';
import StatusChip from '../../../components/admin/StatusChip';
import { Button } from '../../../components/ui';
import { SEO_SCORE_BANDS } from '../../../config/enums';
import { formatNumber } from '../../../utils/format';

import styles from './DashboardPage.module.css';

/** The circumference of the gauge's circle (r = 52), for the dash offset. */
const CIRCUMFERENCE = 2 * Math.PI * 52;

/**
 * How the site is scoring (§6.16 `seoHealth`).
 *
 * The average is a gauge because it is a number out of a hundred and reads
 * faster as a shape; the three bands and the two "missing" counts are the work
 * list behind it, and every one of them is a link into the SEO dashboard,
 * where the rows can actually be fixed.
 *
 * @param {object} props
 * @param {object} props.health
 */
export default function SeoHealthCard({ health = {} }) {
  const average = Number.isFinite(health.averageScore) ? health.averageScore : 0;
  const band = SEO_SCORE_BANDS.bandOf(average);
  const offset = CIRCUMFERENCE * (1 - Math.min(Math.max(average, 0), 100) / 100);

  return (
    <Card as="section" className={styles.card} aria-labelledby="seo-health-heading">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="seo-health-heading">
          SEO health
        </h2>
        <Button variant="link" size="sm" to={PATHS.adminSeo}>
          Open SEO
        </Button>
      </div>

      <div className={styles.seoBody}>
        <div className={styles.gauge}>
          <svg
            viewBox="0 0 120 120"
            role="img"
            aria-label={`Average SEO score ${average} out of 100`}
          >
            <circle className={styles.gaugeTrack} cx="60" cy="60" r="52" />
            <circle
              className={[styles.gaugeValue, styles[`gauge-${band}`]].join(' ')}
              cx="60"
              cy="60"
              r="52"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
            />
          </svg>
          <span className={styles.gaugeNumber} aria-hidden="true">
            {formatNumber(average, { maximumFractionDigits: 1 })}
          </span>
        </div>

        <dl className={styles.seoCounts}>
          {SEO_SCORE_BANDS.entries
            .filter((entry) => entry.value !== 'none')
            .map((entry) => (
              <div key={entry.value}>
                <dt>
                  <StatusChip tone={entry.tone ?? 'neutral'} label={entry.label} />
                </dt>
                <dd>
                  <Link
                    className={styles.countLink}
                    to={`${PATHS.adminSeo}?scoreBand=${entry.value}`}
                    aria-label={`${formatNumber(health[entry.value])} records scoring ${entry.label}`}
                  >
                    {formatNumber(health[entry.value])}
                  </Link>
                </dd>
              </div>
            ))}
          <div>
            <dt>No focus keyword</dt>
            <dd>
              <Link
                className={styles.countLink}
                to={`${PATHS.adminSeo}?missing=focusKeyword`}
                aria-label={`${formatNumber(health.missingFocusKeyword)} records without a focus keyword`}
              >
                {formatNumber(health.missingFocusKeyword)}
              </Link>
            </dd>
          </div>
          <div>
            <dt>No meta description</dt>
            <dd>
              <Link
                className={styles.countLink}
                to={`${PATHS.adminSeo}?missing=description`}
                aria-label={`${formatNumber(health.missingMetaDescription)} records without a meta description`}
              >
                {formatNumber(health.missingMetaDescription)}
              </Link>
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}
