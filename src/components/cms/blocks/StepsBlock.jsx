import { Container, Section, SectionHeader } from '../../ui';

import styles from './blocks.module.css';

/**
 * A numbered sequence (§6.10 `steps`) — "How it works", a service's process,
 * the About page's timeline. The numbers come from the list, so inserting a
 * step renumbers the rest for free.
 */
export default function StepsBlock({ data = {}, background = 'bg' }) {
  const items = (Array.isArray(data.items) ? data.items : []).filter((item) => item?.title);
  if (items.length === 0) return null;

  return (
    <Section background={background} spacing="lg">
      <Container>
        {data.title ? (
          <SectionHeader title={data.title} subtitle={data.subtitle} align="center" />
        ) : null}

        <ol className={styles.steps}>
          {items.map((item, index) => (
            <li key={`${item.title}-${index}`} className={styles.step}>
              <span className={styles.stepNumber} aria-hidden="true">
                {index + 1}
              </span>
              <h3 className={styles.stepTitle}>{item.title}</h3>
              {item.text ? <p className={styles.stepText}>{item.text}</p> : null}
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

StepsBlock.isEmpty = (data) =>
  !(Array.isArray(data?.items) ? data.items : []).some((item) => item?.title);
