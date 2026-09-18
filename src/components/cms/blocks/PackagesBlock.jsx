import { Icon } from '@iconify/react';

import { Button, Container, Section, SectionHeader } from '../../ui';
import { useLeadCapture } from '../../../contexts/LeadCaptureContext';

import styles from './blocks.module.css';

/**
 * Pricing cards (§6.10 `packages`, D27) — the interior-design tiers.
 *
 * Every price here is the client's to set and is written as text rather than a
 * number, because "from ₹3.5 lakh for a 2 BHK" is a starting point, not a
 * price: formatting it as one would make a claim the record does not make
 * (§14).
 *
 * A card's button opens the shared enquiry dialog under the page's own lead
 * source, with the package named in `meta` (D56), so the sales desk knows which
 * tier the enquiry came from.
 */
export default function PackagesBlock({ data = {}, page = {}, background = 'surface' }) {
  const { openLeadModal, leadTriggerProps } = useLeadCapture();

  const items = (Array.isArray(data.items) ? data.items : []).filter((item) => item?.name);
  if (items.length === 0) return null;

  const entry = page.leadSource || 'contact-page';

  return (
    <Section background={background} spacing="lg">
      <Container>
        {data.title ? <SectionHeader title={data.title} align="center" /> : null}

        <ul className={styles.packages}>
          {items.map((item, index) => (
            <li
              key={`${item.name}-${index}`}
              className={[styles.package, item.highlighted ? styles.packageHighlighted : '']
                .filter(Boolean)
                .join(' ')}
            >
              {item.highlighted ? <span className={styles.packageFlag}>Most chosen</span> : null}

              <h3 className={styles.packageName}>{item.name}</h3>
              {item.price ? <p className={styles.packagePrice}>{item.price}</p> : null}
              {item.unit ? <p className={styles.packageUnit}>{item.unit}</p> : null}

              {(item.features ?? []).length > 0 ? (
                <ul className={styles.packageFeatures}>
                  {item.features.map((feature, at) => (
                    <li key={`${feature}-${at}`}>
                      <Icon
                        icon="mdi:check"
                        width="16"
                        height="16"
                        aria-hidden="true"
                        className={styles.packageTick}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              ) : null}

              <Button
                variant={item.highlighted ? 'primary' : 'outline'}
                fullWidth
                onClick={() =>
                  openLeadModal({
                    entry,
                    pageSlug: page.slug ?? null,
                    title: `${item.name} — tell us about the space`,
                    meta: { package: item.name },
                  })
                }
                {...leadTriggerProps}
              >
                {item.ctaLabel || `Ask about ${item.name}`}
              </Button>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

PackagesBlock.isEmpty = (data) =>
  !(Array.isArray(data?.items) ? data.items : []).some((item) => item?.name);
