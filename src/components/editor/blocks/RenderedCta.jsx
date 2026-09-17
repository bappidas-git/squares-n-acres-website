import { Icon } from '@iconify/react';

import Button from '../../ui/Button';
import { useLeadCapture } from '../../../contexts/LeadCaptureContext';

import styles from './rendered.module.css';

/**
 * The `data-sna-block="cta"` placeholder, as the reader sees it.
 *
 * Naming a lead source turns the button into the shared enquiry dialog — the
 * same one the header CTA and every price card open — because a call to action
 * inside an article is a question, and the answer belongs in a form rather than
 * on another page (prompt 28).
 *
 * @param {object} props the block's data attributes
 */
export default function RenderedCta({ title, text, buttonLabel, buttonHref, leadSource }) {
  const { openLeadModal } = useLeadCapture();

  if (!title && !text) return null;

  const label = buttonLabel?.trim();
  const href = buttonHref?.trim();

  return (
    <aside className={styles.cta}>
      <div className={styles.ctaText}>
        {title ? <p className={styles.ctaTitle}>{title}</p> : null}
        {text ? <p className={styles.ctaBody}>{text}</p> : null}
      </div>

      {label ? (
        <Button
          variant="primary"
          {...(leadSource
            ? { onClick: () => openLeadModal({ entry: leadSource }) }
            : href?.startsWith('/')
              ? { to: href }
              : { href: href || undefined })}
          iconRight={<Icon icon="mdi:arrow-right" width="18" height="18" />}
        >
          {label}
        </Button>
      ) : null}
    </aside>
  );
}
