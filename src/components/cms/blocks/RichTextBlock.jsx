import LegacyHtml from '../../common/LegacyHtml';
import { Container, Section } from '../../ui';

import styles from './blocks.module.css';

/**
 * A band of CMS-authored prose (§6.10 `richText`).
 *
 * The markup is rendered inside `.prose` (`src/assets/styles/prose.css`), which
 * is what gives an editor's bare `<h2>` and `<ul>` the site's typography
 * without a single class name in the content.
 *
 * `LegacyHtml` is temporary: prompt 32 replaces it with `SafeHtml`, which
 * sanitises against the rich-text editor's own allow-list. The API already
 * refuses a payload carrying a `<script`.
 */
export default function RichTextBlock({ data = {}, background = 'bg' }) {
  if (!data.html) return null;

  return (
    <Section background={background} spacing="lg">
      <Container>
        <LegacyHtml html={data.html} className={`prose ${styles.prose}`} />
      </Container>
    </Section>
  );
}

RichTextBlock.isEmpty = (data) => !data?.html;
