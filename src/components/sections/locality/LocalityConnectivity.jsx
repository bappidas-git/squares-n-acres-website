import styles from './LocalitySections.module.css';

/**
 * "Metro — Purple Line, along Whitefield Main Road": the `{label, value}` rows
 * an editor keeps on a locality (§6.2), as a definition list.
 *
 * Two columns from 900 px, stacked below it — a table would force a phone into
 * horizontal scrolling, and the pairs are a description list, not tabular data.
 *
 * @param {object} props
 * @param {{label: string, value: string}[]} [props.items]
 */
export default function LocalityConnectivity({ items = [] }) {
  const rows = (Array.isArray(items) ? items : []).filter((row) => row?.label && row?.value);
  if (rows.length === 0) return null;

  return (
    <section className={styles.block} aria-labelledby="locality-connectivity">
      <h2 className={styles.blockTitle} id="locality-connectivity">
        Connectivity
      </h2>

      <dl className={styles.definitions}>
        {rows.map((row) => (
          <div key={`${row.label}-${row.value}`} className={styles.definitionRow}>
            <dt className={styles.definitionLabel}>{row.label}</dt>
            <dd className={styles.definitionValue}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
