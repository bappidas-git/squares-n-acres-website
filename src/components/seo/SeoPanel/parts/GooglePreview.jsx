import { useState } from 'react';
import { Icon } from '@iconify/react';

import { BRAND } from '../../../../config/site';
import { DESCRIPTION_MAX_PX, TITLE_MAX_PX, truncateToWidth, urls } from '../../../../seo';
import { formatDate } from '../../../../utils/format';
import { useSeoPanel } from '../SeoPanelContext';

import styles from '../SeoPanel.module.css';

/** The two widths Google gives a result (§6 of prompt 36). */
const FRAMES = {
  desktop: { width: 600, className: styles.serpDesktop, icon: 'mdi:monitor', label: 'Desktop' },
  mobile: { width: 380, className: styles.serpMobile, icon: 'mdi:cellphone', label: 'Mobile' },
};

/** A mobile result has less room, so the title is cut sooner. */
const TITLE_PX = { desktop: TITLE_MAX_PX, mobile: 480 };
const DESCRIPTION_PX = { desktop: DESCRIPTION_MAX_PX, mobile: 680 };

/** `squaresnacres.com › properties › lakeview-heights` — how a result prints a URL. */
export function breadcrumbUrl(siteUrl, path) {
  const host = String(siteUrl ?? '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');

  const segments = String(path ?? '')
    .split('/')
    .filter(Boolean);

  return [host || 'squaresnacres.com', ...segments].join(' › ');
}

/**
 * What this record looks like in a search result.
 *
 * The frame is the real thing as far as it can be: Arial at 20 px and 14 px,
 * Google's own link and URL colours, and — the part that matters — the title
 * and the description cut **by pixel width** rather than by character count,
 * because that is what Google does and it is why a title of exactly sixty
 * characters is sometimes still truncated (§9.1, D85).
 */
export default function GooglePreview() {
  const [device, setDevice] = useState('desktop');
  const { entityType, entity, resolved, siteUrl } = useSeoPanel();

  const frame = FRAMES[device];
  const path = urls.publicPathFor(entityType, entity) ?? '';
  const title = truncateToWidth(resolved.title, TITLE_PX[device], 20);
  const description = truncateToWidth(resolved.description, DESCRIPTION_PX[device], 14);

  // Google prints a date in front of an article's snippet; it prints nothing in
  // front of a listing's. `formatDate` answers with an em dash for a record
  // that has not been published yet, which is not a date to print.
  const published = entityType === 'article' ? formatDate(entity?.publishedAt ?? null) : '';
  const date = published && published !== '—' ? published : null;

  return (
    <section className={styles.preview} aria-label="Search result preview">
      <div className={styles.previewHead}>
        {/* h2: the SEO panel sits inside a `<fieldset>` whose `<legend>`
            names the group but is not a heading, so on the page, locality and
            developer forms this was the first heading under the `<h1>` and an
            h3 left a level empty. `SeoSummaryCard` already uses h2. */}
        <h2 className={styles.heading}>Search preview</h2>
        <div className={styles.deviceToggle} role="group" aria-label="Preview width">
          {Object.entries(FRAMES).map(([key, option]) => (
            <button
              key={key}
              type="button"
              className={styles.deviceButton}
              aria-pressed={device === key}
              onClick={() => setDevice(key)}
            >
              <Icon icon={option.icon} width="14" height="14" aria-hidden="true" />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.serp}>
        <div className={[styles.serpFrame, frame.className].join(' ')}>
          <div className={styles.serpSite}>
            <img className={styles.serpFavicon} src={BRAND.iconUrl} alt="" width="26" height="26" />
            <span>
              <span className={styles.serpSiteName}>{resolved.og.siteName || BRAND.name}</span>
              <br />
              <span className={styles.serpUrl}>{breadcrumbUrl(siteUrl, path)}</span>
            </span>
          </div>

          <p className={styles.serpTitle}>
            {title || <span className={styles.serpEmpty}>This page has no title yet</span>}
          </p>
          <p className={styles.serpDescription}>
            {date ? <span className={styles.serpDate}>{date} — </span> : null}
            {description || (
              <span className={styles.serpEmpty}>
                No description yet — Google will print a sentence of its own choosing.
              </span>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
