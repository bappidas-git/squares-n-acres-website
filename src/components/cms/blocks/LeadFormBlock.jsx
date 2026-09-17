import LeadForm from '../../common/LeadForm';
import { Container, Section } from '../../ui';
import { DEFAULT_FIELDS } from '../../../utils/leadSources';

import styles from './blocks.module.css';

/**
 * An enquiry form on the page (§6.10 `leadForm`).
 *
 * The block carries the boxes, the canonical source (§6.17) and the thank-you
 * message; everything else — the visible labels, the honeypot, the ten-second
 * throttle (D43), the consent box, the campaign that brought the visit — comes
 * from the one `LeadForm` of prompt 28. The page's slug travels with the lead,
 * so "which page was this filled in on" is a field rather than a guess.
 */
export default function LeadFormBlock({ data = {}, page = {}, background = 'surface' }) {
  const fields =
    Array.isArray(data.fields) && data.fields.length > 0 ? data.fields : DEFAULT_FIELDS;
  const source = data.leadSource || page.leadSource || 'contact-page';

  return (
    <Section background={background} spacing="lg" id="enquiry">
      <Container size="narrow">
        <LeadForm
          source={source}
          pageSlug={page.slug ?? null}
          title={data.title || ''}
          subtitle={data.subtitle || ''}
          fields={fields}
          successMessage={data.successMessage || undefined}
          submitLabel="Send"
          className={styles.leadForm}
        />
      </Container>
    </Section>
  );
}
