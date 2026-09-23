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
import useGatedFiles from '../../../hooks/useGatedFiles';

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
 * The documents in `order`, with anything that has no file dropped.
 *
 * A public read leaves a gated paper without its address and marks it
 * `hasFile` instead, so that row stays: its address is fetched once the
 * visitor has shared their details (docs/backend-notes → "Gated files").
 *
 * A document whose address is the brochure's own is dropped too: §6.1 keeps
 * `brochureUrl` beside `documents[]`, and an editor who attaches the brochure
 * in both places means one file, not two rows of the same download. (A public
 * read has already dropped it — this is for the admin preview, which reads the
 * record as stored.)
 *
 * @param {Array<object>} documents
 * @param {string|null} [brochureUrl] the file the brochure card already offers
 * @returns {Array<object>}
 */
export function orderedDocuments(documents, brochureUrl = null) {
  return (Array.isArray(documents) ? documents : [])
    .filter(
      (document) =>
        document && filled(document.title) && (filled(document.url) || document.hasFile === true)
    )
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
 * A row's address: its own, or the one the API handed over for it
 * (`useGatedFiles`).
 */
function addressOf(row, files) {
  if (row.url) return row.url;
  if (!files) return null;
  return (row.documentId ? files.documents[row.documentId] : files.brochureUrl) ?? null;
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
 * A gated file's address is not in the record the page reads (QA-51 OPEN-1):
 * the lead is answered with a token, and the addresses are fetched with it —
 * straight after the form, or as soon as the section finds the gate already
 * open, so the next click opens its file at once.
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
  const hasBrochure = Boolean(brochureUrl) || property?.hasBrochure === true;
  const documents = useMemo(
    () => orderedDocuments(property?.documents, brochureUrl),
    [property, brochureUrl]
  );

  // An open gate with an address the record lacks — the form was filled in
  // elsewhere on the page, or earlier in this visit — fetches the listing's
  // addresses now, so the row's click opens its file directly.
  const needsFiles =
    (hasBrochure && !brochureUrl) || documents.some((document) => !filled(document.url));
  const { files, fetchFiles } = useGatedFiles(propertyId, { enabled: unlocked && needsFiles });

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

  // A brochure the public read carries no address for is a gated one, whatever
  // the flag beside it says.
  const brochureGated = hasBrochure ? !brochureUrl || property.brochureLeadGated !== false : false;

  if (documents.length === 0 && !hasBrochure) return null;

  /**
   * Open the file now when its address is known and the visitor may have it;
   * otherwise ask who is asking — or, for a visitor we already know, fetch the
   * address — and open it afterwards.
   */
  const request = (item) => {
    const url = addressOf(item, files);
    if (url && (!item.gated || unlocked)) {
      deliver(url, item.title);
      if (item.event) track(item.event, { propertyId, document: item.title });
      return;
    }
    setAsking(item);
  };

  const rows = [
    ...(hasBrochure
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
      documentId: String(document.id),
      title: document.title,
      typeLabel: DOCUMENT_TYPES.labelOf(document.type) || DOCUMENT_TYPES.labelOf('other'),
      icon: TYPE_ICON[document.type] ?? TYPE_ICON.other,
      url: filled(document.url) ? document.url : null,
      gated: !filled(document.url) || document.leadGated !== false,
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
            fileUrl: addressOf(asking, files) ?? undefined,
            fileLabel: asking.title,
            // Asked once the lead is filed, or straight away for a visitor
            // the dialog does not ask again (P28).
            resolveUrl: () => fetchFiles().then((found) => addressOf(asking, found)),
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
