import { Icon } from '@iconify/react';

import { Button, Container, Section } from '../../ui';
import { useLeadCapture } from '../../../contexts/LeadCaptureContext';

import styles from './blocks.module.css';

/**
 * The band with one button (§6.10 `cta`).
 *
 * When the block names a `leadSource` the button opens the shared enquiry
 * dialog (prompt 28) rather than navigating: "Post your requirement" is a
 * question, and the answer belongs in a form, not on another page. With no
 * source it is an ordinary link, internal or external.
 */
export default function CtaBlock({ data = {}, page = {} }) {
  const { openLeadModal, leadTriggerProps } = useLeadCapture();

  if (!data.title && !data.text) return null;

  const entry = data.leadSource || null;
  const label = data.buttonLabel?.trim();
  const href = data.buttonHref?.trim();

  return (
    <Section background="charcoal" spacing="lg">
      <Container className={styles.cta}>
        <div className={styles.ctaText}>
          {data.title ? <h2 className={styles.ctaTitle}>{data.title}</h2> : null}
          {data.text ? <p className={styles.ctaBody}>{data.text}</p> : null}
        </div>

        {label ? (
          <Button
            variant="primary"
            size="lg"
            {...(entry
              ? {
                  onClick: () => openLeadModal({ entry, pageSlug: page.slug }),
                  ...leadTriggerProps,
                }
              : href?.startsWith('/')
                ? { to: href }
                : { href: href || undefined })}
            iconRight={<Icon icon="mdi:arrow-right" width="18" height="18" />}
          >
            {label}
          </Button>
        ) : null}
      </Container>
    </Section>
  );
}

CtaBlock.isEmpty = (data) => !data?.title && !data?.text;
