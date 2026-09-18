import { useCallback, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import { Button, Chip } from '../../ui';
import { DOCUMENT_TYPES } from '../../../config/enums';
import LeadCaptureModal, { openFile } from '../../common/LeadCaptureModal';
import SectionShell from './SectionShell';
import { leadFormProps } from '../../../utils/leadSources';
import { track } from '../../../utils/analytics';
import { useToast } from '../../common/ToastProvider';
import useGatedContent from '../../../hooks/useGatedContent';

import styles from './DocumentsSection.module.css';

/** The mark each document type gets in the row. */
const TYPE_ICON = {
  brochure: 'mdi:book-open-variant-outline',
  approval: 'mdi:certificate-outline',
  legal: 'mdi:gavel',
  'floor-plan': 'mdi:floor-plan',
  'price-list': 'mdi:currency-inr',
  other: 'mdi:file-document-outline',
};

const filled = (value) => value !== null && value !== undefined && String(value).trim() !== '';

/**
 * The documents in `order`, with anything that has no address dropped.
 *
 * A document whose address is the brochure's own is dropped too: §6.1 keeps
 * `brochureUrl` beside `documents[]`, and an editor who attaches the brochure
 * in both places means one file, not two rows of the same download.
 *
 * @param {Array<object>} documents
 * @param {string|null} [brochureUrl] the file the brochure card already offers
 * @returns {Array<object>}
 */
export function orderedDocuments(documents, brochureUrl = null) {
  return (Array.isArray(documents) ? documents : [])
    .filter((document) => document && filled(document.url) && filled(document.title))
    .filter((document) => !filled(brochureUrl) || document.url !== brochureUrl)
    .map((document, index) => ({ document, index }))
    .sort((a, b) => {
      const order = (entry) =>
        filled(entry.document.order) ? Number(entry.document.order) : Number.POSITIVE_INFINITY;
      return order(a) - order(b) || a.index - b.index;
    })
    .map((entry) => entry.document);
}

/**
 * The brochure and the papers, actually delivered.
 *
 * The boilerplate printed a row per document with a tick, the word "Available"
 * and a download button that called a handler nobody had passed, so the file
 * was never delivered at all (BUG-08). Here a row that the editor left open
 * opens its file on the first click; a row they gated asks for a name and a
 * phone number first, files the lead, remembers the unlock for the rest of the
 * visit (`sna_lead`) and *then* opens the file — from inside the success
 * handler, so the browser still treats it as the visitor's own click.
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export default function DocumentsSection({ property, background = 'bg' }) {
  const propertyId = property?.id ?? null;
  const { unlocked, unlock } = useGatedContent(propertyId, 'documents');
  const toast = useToast();
  const [asking, setAsking] = useState(null);

  const brochureUrl = filled(property?.brochureUrl) ? property.brochureUrl : null;
  const documents = useMemo(
    () => orderedDocuments(property?.documents, brochureUrl),
    [property, brochureUrl]
  );

  const deliver = useCallback(
    (url, title) => {
      if (openFile(url) === null) {
        toast.info(
          <>
            Your browser blocked the new tab.{' '}
            <a href={url} target="_blank" rel="noopener noreferrer" className={styles.toastLink}>
              Open {title}
            </a>
          </>,
          8000
        );
      }
    },
    [toast]
  );

  const brochureGated = brochureUrl ? property.brochureLeadGated !== false : false;

  if (documents.length === 0 && !brochureUrl) return null;

  /** Either open the file now, or ask who is asking and open it afterwards. */
  const request = (item) => {
    if (!item.gated || unlocked) {
      deliver(item.url, item.title);
      if (item.event) track(item.event, { propertyId, document: item.title });
      return;
    }
    setAsking(item);
  };

  const rows = [
    ...(brochureUrl
      ? [
          {
            id: 'brochure',
            title: 'Project brochure (PDF)',
            typeLabel: DOCUMENT_TYPES.labelOf('brochure'),
            icon: TYPE_ICON.brochure,
            url: brochureUrl,
            gated: brochureGated,
            entry: 'brochure-download',
            event: 'brochure_download',
            action: 'Download brochure',
            // The name begins with the words on the button (WCAG 2.5.3,
            // NEW-45) and then says which file it is.
            // Four rows whose buttons all read "Open" sound identical to a
            // screen reader, so each button is named after its own file.
            actionLabel: 'Download brochure — project brochure (PDF)',
            highlight: true,
          },
        ]
      : []),
    ...documents.map((document) => ({
      id: `document-${document.id}`,
      title: document.title,
      typeLabel: DOCUMENT_TYPES.labelOf(document.type) || DOCUMENT_TYPES.labelOf('other'),
      icon: TYPE_ICON[document.type] ?? TYPE_ICON.other,
      url: document.url,
      gated: document.leadGated !== false,
      entry: 'document-request',
      event: 'document_download',
      action: 'Open',
      actionLabel: `Open ${document.title}`,
    })),
  ];

  return (
    <SectionShell
      id="documents"
      title="Documents & brochure"
      subtitle={
        rows.some((row) => row.gated) && !unlocked
          ? 'Share your name and phone number once to open the papers for this listing.'
          : 'The papers this project publishes.'
      }
      background={background}
    >
      <ul className={styles.list}>
        {rows.map((row) => {
          const locked = row.gated && !unlocked;

          return (
            <li
              key={row.id}
              className={[styles.row, row.highlight ? styles.highlight : '']
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles.icon} aria-hidden="true">
                <Icon icon={row.icon} width="22" height="22" />
              </span>

              <span className={styles.text}>
                <span className={styles.title}>{row.title}</span>
                <span className={styles.meta}>
                  <Chip tone="neutral" size="sm">
                    {row.typeLabel}
                  </Chip>
                  {locked ? (
                    <span className={styles.locked}>
                      <Icon icon="mdi:lock-outline" aria-hidden="true" /> Shared on request
                    </span>
                  ) : null}
                </span>
              </span>

              <Button
                variant={row.highlight ? 'primary' : 'outline'}
                size="sm"
                aria-label={row.actionLabel}
                onClick={() => request(row)}
                icon={
                  <Icon
                    icon={locked ? 'mdi:lock-open-variant-outline' : 'mdi:open-in-new'}
                    aria-hidden="true"
                  />
                }
              >
                {row.action}
              </Button>
            </li>
          );
        })}
      </ul>

      {asking ? (
        <LeadCaptureModal
          key={asking.id}
          {...leadFormProps(asking.entry)}
          open
          onClose={() => setAsking(null)}
          propertyId={propertyId}
          propertyTitle={property?.title ?? ''}
          // The gated forms ask for a name and a number only, so what was
          // asked for travels as a hidden field rather than a box to fill in.
          hiddenFields={{ message: `Requested: ${asking.title}` }}
          deliver={{
            kind: 'file',
            unlockKind: 'documents',
            fileUrl: asking.url,
            fileLabel: asking.title,
          }}
          agent={property?.agent?.showOnListing ? property.agent : null}
          onSuccess={() => {
            unlock();
            // The file itself is opened by the dialog, inside the click that
            // submitted the form, so the browser still lets the tab through.
            track(asking.event, { propertyId, document: asking.title });
          }}
        />
      ) : null}
    </SectionShell>
  );
}
