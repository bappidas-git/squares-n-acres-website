import { Icon } from '@iconify/react';

import PATHS from '../../../routes/paths';
import styles from './CtaBand.module.css';
import { Button, Container, Section } from '../../ui';
import { CTA_BAND } from '../../../config/copy';

/**
 * The band that invites the other half of the market: the people with a
 * property rather than the people looking for one.
 *
 * It links to `/sell-let`, the CMS page whose `leadForm` block captures the
 * details (§6.10), rather than opening a modal — telling us about a property
 * takes more than a phone number, and that page is where the fields live.
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.text]
 * @param {string} [props.buttonLabel]
 * @param {string} [props.href]
 */
export default function CtaBand({
  title = CTA_BAND.title,
  text = CTA_BAND.text,
  buttonLabel = CTA_BAND.buttonLabel,
  href = PATHS.sellLet,
}) {
  return (
    <Section background="none" spacing="lg" className={styles.section}>
      <Container>
        <div className={styles.band}>
          <div className={styles.copy}>
            <span className={styles.eyebrow}>{CTA_BAND.eyebrow}</span>
            <h2 className={styles.title}>{title}</h2>
            {text ? <p className={styles.text}>{text}</p> : null}
          </div>

          <Button
            to={href}
            variant="primary"
            size="lg"
            className={styles.button}
            iconRight={<Icon icon="mdi:arrow-right" aria-hidden="true" />}
          >
            {buttonLabel}
          </Button>
        </div>
      </Container>
    </Section>
  );
}
