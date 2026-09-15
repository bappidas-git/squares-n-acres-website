import { formatPrice, formatPriceRange } from '../../utils/format';

import styles from './Price.module.css';

/**
 * A price, formatted the Indian way by `utils/format` (D33).
 *
 * Pass `value`, or `min`/`max` for a range. `listingType: 'rent' | 'lease'`
 * appends `/month`; `onRequest` renders "Price on Request".
 *
 * @param {object} props
 * @param {number|string|null} [props.value]
 * @param {number|string|null} [props.min]
 * @param {number|string|null} [props.max]
 * @param {string} [props.listingType]
 * @param {boolean} [props.onRequest]
 * @param {boolean} [props.perMonth]
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {boolean} [props.accent] render in brand red instead of charcoal
 * @param {string} [props.prefix] small label above the amount, e.g. "Starting at"
 */
export default function Price({
  value,
  min,
  max,
  listingType,
  onRequest = false,
  perMonth = false,
  size = 'md',
  accent = false,
  prefix,
  as: Tag = 'span',
  className = '',
  ...rest
}) {
  const options = { priceOnRequest: onRequest, listingType, perMonth };
  const text =
    min !== undefined || max !== undefined
      ? formatPriceRange(min, max, options)
      : formatPrice(value, options);

  return (
    <Tag
      className={[styles.price, styles[size] || styles.md, accent ? styles.accent : '', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {prefix ? <span className={styles.prefix}>{prefix}</span> : null}
      {text}
    </Tag>
  );
}
