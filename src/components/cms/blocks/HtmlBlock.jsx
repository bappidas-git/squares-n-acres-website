import LegacyHtml from '../../common/LegacyHtml';
import { Container, Section } from '../../ui';

import styles from './blocks.module.css';

/**
 * Raw markup an editor pasted (§6.10 `html`).
 *
 * The same renderer as `richText` — the two differ only in what an editor is
 * expected to put in them, which is why they are separate types in the picker.
 */
export default function HtmlBlock({ data = {}, background = 'bg' }) {
  if (!data.html) return null;

  return (
    <Section background={background} spacing="lg">
      <Container>
        <LegacyHtml html={data.html} className={`prose proseWide ${styles.prose}`} />
      </Container>
    </Section>
  );
}

HtmlBlock.isEmpty = (data) => !data?.html;
