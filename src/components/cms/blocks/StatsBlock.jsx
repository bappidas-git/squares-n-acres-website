import { Container, Section, StatCard } from '../../ui';
import useCountUp from '../../../hooks/useCountUp';
import useInView from '../../../hooks/useInView';

import styles from './blocks.module.css';

/**
 * Figures with labels (§6.10 `stats`).
 *
 * "Rendered only when `items.length > 0`" is the whole point of the block: §14
 * seeds every stats block empty, because a count of completed transactions is
 * a claim we cannot make on the client's behalf. An editor fills it in and the
 * band appears; until then the page simply does not have one.
 *
 * A purely numeric value counts up once the band is on screen; "₹1,200 Cr"
 * and "Escrow" are printed as they are, because a count-up needs a number to
 * count to.
 */
export default function StatsBlock({ data = {}, background = 'surface' }) {
  const items = (Array.isArray(data.items) ? data.items : []).filter(
    (item) => item?.value !== undefined && item?.value !== null && item?.value !== ''
  );
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  if (items.length === 0) return null;

  return (
    <Section background={background} spacing="lg">
      <Container>
        <ul className={styles.statGrid} ref={ref}>
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`}>
              <StatCard
                value={<StatValue value={item.value} suffix={item.suffix} active={inView} />}
                label={item.label}
              />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

StatsBlock.isEmpty = (data) =>
  !(Array.isArray(data?.items) ? data.items : []).some(
    (item) => item?.value !== undefined && item?.value !== null && item?.value !== ''
  );

/** The figure, counted up when it is one and printed when it is not. */
function StatValue({ value, suffix, active }) {
  const numeric = Number(String(value).replace(/,/g, ''));
  const countable = Number.isFinite(numeric) && String(value).trim() !== '';
  const counted = useCountUp(countable ? numeric : 0, { enabled: active && countable });

  return (
    <>
      {countable ? counted.toLocaleString('en-IN') : value}
      {suffix ? <span className={styles.statSuffix}>{suffix}</span> : null}
    </>
  );
}
