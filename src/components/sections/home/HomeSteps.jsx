import styles from './HomeSteps.module.css';
import { Container, Section, SectionHeader } from '../../ui';

/**
 * TEMPORARY — the `steps` block of the `home` CMS page (D81).
 *
 * "How it works" used to be four objects hardcoded in a component (BUG-11); it
 * is now `pages/slug/home` → the block of type `steps`. Prompt 30 moves this
 * file to `components/cms/blocks/StepsBlock.jsx`, where the About page's
 * timeline and the service pages' processes render through the same markup.
 * Registered in `docs/PROJECT_STATE.md` → "Pending rewrites" (owner 30).
 *
 * @param {object} props
 * @param {{title?: string, subtitle?: string, items?: Array<{title: string,
 *   text?: string}>}} [props.data] the block's `data` (§6.10)
 */
export default function HomeSteps({ data }) {
  const items = Array.isArray(data?.items) ? data.items.filter((item) => item?.title) : [];

  if (items.length === 0) return null;

  return (
    <Section background="bg" spacing="lg">
      <Container>
        <SectionHeader title={data.title} subtitle={data.subtitle} align="center" />

        <ol className={styles.steps}>
          {items.map((item, index) => (
            <li key={item.title} className={styles.step}>
              <span className={styles.number} aria-hidden="true">
                {index + 1}
              </span>
              <h3 className={styles.title}>{item.title}</h3>
              {item.text ? <p className={styles.text}>{item.text}</p> : null}
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
