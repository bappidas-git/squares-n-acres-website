import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import PATHS from '../../routes/paths';
import recentlyViewed from '../../utils/recentlyViewed';
import { formatBhk, formatPrice } from '../../utils/format';

import styles from './RecentlyViewed.module.css';

/**
 * The listings this visitor has opened, newest first.
 *
 * It reads `sna_recent_properties` (localStorage) rather than the API, so the
 * strip costs no request and works on a page that has fetched nothing. The
 * stored entry is what a card needs and no more (`utils/recentlyViewed.js`) —
 * a price kept in a browser goes stale, so the card links to the live page and
 * the figures it prints are the ones the visitor saw.
 *
 * The property page shows it under the similar row and the listing page shows
 * it in the sidebar (prompt 26), which is why it lives in `common/`.
 *
 * @param {object} props
 * @param {number|string|null} [props.exclude] the listing whose own page is asking
 * @param {number} [props.limit]
 * @param {'row'|'stack'} [props.layout] a scrolling row, or a vertical list
 * @param {React.ReactNode} [props.heading] wraps the strip in a titled section;
 *   the title disappears with the strip, so an empty history is no heading
 * @param {string} [props.className]
 */
export default function RecentlyViewed({
  exclude = null,
  limit = 8,
  layout = 'row',
  heading,
  className,
}) {
  // The list is read after mount: it is per-browser, and a server-rendered or
  // prerendered page (prompt 41) must not bake one visitor's history into the
  // HTML every other visitor is served.
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(recentlyViewed.list({ exclude }).slice(0, limit));
  }, [exclude, limit]);

  if (items.length === 0) return null;

  const strip = (
    <ul
      className={[styles.list, layout === 'stack' ? styles.stack : styles.row, className]
        .filter(Boolean)
        .join(' ')}
    >
      {items.map((item) => (
        <li key={item.id} className={styles.item}>
          <Link to={PATHS.propertyDetails(item.slug)} className={styles.card}>
            <span className={styles.thumb}>
              {item.coverUrl ? (
                <img src={item.coverUrl} alt="" loading="lazy" className={styles.image} />
              ) : null}
            </span>
            <span className={styles.body}>
              <span className={styles.title}>{item.title}</span>
              {item.locality ? <span className={styles.place}>{item.locality}</span> : null}
              <span className={styles.price}>
                {formatPrice(item.price, {
                  priceOnRequest: item.priceOnRequest,
                  listingType: item.listingType,
                })}
                {item.bedrooms !== null && item.bedrooms !== undefined
                  ? ` · ${formatBhk(item.bedrooms)}`
                  : ''}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  if (!heading) return strip;

  return (
    <section className={styles.section} aria-labelledby="recently-viewed">
      <h2 className={styles.heading} id="recently-viewed">
        {heading}
      </h2>
      {strip}
    </section>
  );
}
