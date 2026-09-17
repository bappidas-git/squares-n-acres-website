import { Icon } from '@iconify/react';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Chip from '../../../components/ui/Chip';
import StatusChip from '../../../components/admin/StatusChip';
import { LEAD_SOURCES } from '../../../config/enums';
import { formatDateTime } from '../../../utils/format';
import { leadTelLink, leadWhatsappLink } from './leadColumns';

import styles from './LeadDetailPage.module.css';

/** The five `utm_*` parameters of §6.7, in the order a campaign reads them. */
const UTM_KEYS = [
  ['source', 'Source'],
  ['medium', 'Medium'],
  ['campaign', 'Campaign'],
  ['term', 'Term'],
  ['content', 'Content'],
];

/**
 * Who enquired, and the three ways to answer them.
 *
 * Call, WhatsApp and Mail are the whole point of the screen, so they are
 * buttons at the top rather than links inside a table of fields; everything
 * below them is context for the conversation those buttons start — where the
 * enquiry came from, which page it was made on, and whether the visitor agreed
 * to be contacted.
 *
 * @param {object} props
 * @param {object} props.lead
 */
export default function LeadContactCard({ lead }) {
  const tel = leadTelLink(lead);
  const wa = leadWhatsappLink(lead);
  const utm = lead.utm ?? {};
  const utmChips = UTM_KEYS.filter(([key]) => Boolean(utm[key]));

  return (
    <Card as="section" className={styles.card} aria-labelledby="lead-contact-heading">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="lead-contact-heading">
          {lead.name}
        </h2>
        <StatusChip label={LEAD_SOURCES.labelOfAny(lead.source) || 'Unknown source'} />
      </div>

      <div className={styles.contactActions}>
        {tel ? (
          <Button
            variant="outline"
            href={tel}
            icon={<Icon icon="mdi:phone-outline" width="18" height="18" />}
          >
            {lead.phone}
          </Button>
        ) : null}
        {wa ? (
          <Button
            variant="outline"
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            icon={<Icon icon="mdi:whatsapp" width="18" height="18" />}
          >
            WhatsApp
          </Button>
        ) : null}
        {lead.email ? (
          <Button
            variant="outline"
            href={`mailto:${lead.email}`}
            icon={<Icon icon="mdi:email-outline" width="18" height="18" />}
          >
            {lead.email}
          </Button>
        ) : null}
      </div>

      {lead.message ? <p className={styles.message}>{lead.message}</p> : null}

      <dl className={styles.facts}>
        <div>
          <dt>Received</dt>
          <dd>{formatDateTime(lead.createdAt)}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{formatDateTime(lead.updatedAt)}</dd>
        </div>
        <div>
          <dt>Consent</dt>
          <dd>
            {lead.consent ? (
              <StatusChip tone="success" icon="mdi:check" label="Given" />
            ) : (
              <StatusChip tone="warning" icon="mdi:alert-outline" label="Not given" />
            )}
          </dd>
        </div>
        {lead.pageUrl ? (
          <div className={styles.factWide}>
            <dt>Submitted from</dt>
            <dd>
              <a
                className={styles.link}
                href={lead.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {lead.pageUrl}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      {utmChips.length > 0 ? (
        <div className={styles.utm}>
          <span className={styles.utmLabel}>Campaign</span>
          {utmChips.map(([key, label]) => (
            <Chip key={key} tone="info">{`${label}: ${utm[key]}`}</Chip>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
