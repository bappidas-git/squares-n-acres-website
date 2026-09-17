import { Container, LazyImage, Section } from '../../ui';

import styles from './blocks.module.css';

/**
 * One picture with an optional caption (§6.10 `image`).
 *
 * `alt` is whatever the editor wrote; the admin form marks it compulsory,
 * because a photograph nobody can describe is a photograph a screen reader
 * announces as a file name (§8.3).
 */
export default function ImageBlock({ data = {}, background = 'bg' }) {
  if (!data.url) return null;

  return (
    <Section background={background} spacing="lg">
      <Container>
        <figure className={styles.figure}>
          <LazyImage
            src={data.url}
            alt={data.alt || ''}
            ratio="16/9"
            className={styles.figureImage}
          />
          {data.caption ? <figcaption className={styles.caption}>{data.caption}</figcaption> : null}
        </figure>
      </Container>
    </Section>
  );
}

ImageBlock.isEmpty = (data) => !data?.url;
