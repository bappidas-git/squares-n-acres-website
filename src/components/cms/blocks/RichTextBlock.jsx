import SafeHtml from '../../editor/SafeHtml';
import { Container, Section } from '../../ui';

import styles from './blocks.module.css';

/**
 * A band of CMS-authored prose (§6.10 `richText`).
 *
 * The markup is rendered inside `.prose` (`src/assets/styles/prose.css`), which
 * is what gives an editor's bare `<h2>` and `<ul>` the site's typography
 * without a single class name in the content.
 *
 * `SafeHtml` sanitises against the rich-text editor's own allow-list — the API
 * refuses a payload carrying a `<script` as well — and renders any block an
 * editor dropped into the prose as the live component.
 */
export default function RichTextBlock({ data = {}, background = 'bg' }) {
  if (!data.html) return null;

  return (
    <Section background={background} spacing="lg">
      <Container>
        <SafeHtml html={data.html} className={styles.prose} />
      </Container>
    </Section>
  );
}

RichTextBlock.isEmpty = (data) => !data?.html;
