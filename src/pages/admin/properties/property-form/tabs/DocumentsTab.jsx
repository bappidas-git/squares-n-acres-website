import { Icon } from '@iconify/react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import ImageField from '../../../../../components/admin/ImageField';
import SortableList from '../../../../../components/admin/SortableList';
import {
  Button,
  IconButton,
  SelectField,
  SwitchField,
  TextField,
} from '../../../../../components/ui';
import { DOCUMENT_TYPES } from '../../../../../config/enums';
import { makeDocument } from '../initialState';
import { usePropertyFormContext } from '../PropertyFormContext';

import styles from './PropertyTabs.module.css';

/**
 * Tab 10 — Documents.
 *
 * The files a buyer asks for: the price list, the approvals, the khata, the
 * legal opinion. Each row decides for itself whether a visitor has to leave a
 * phone number first — `leadGated` defaults to on, because a document is the
 * strongest reason anybody gives one (§6.1, LEAD-01).
 *
 * The brochure is not a row here: it is a field of its own on the record and a
 * field of its own on Media (§6.1). The card at the top says what that field
 * holds so nobody adds the brochure twice.
 *
 * Every row's file comes from the same three places as every picture in the
 * admin — the library, an upload, or a pasted address (prompt 39 §4.6) — with
 * the picker limited to documents, because a JPEG is not a price list.
 */
export default function DocumentsTab() {
  const { values, errors, addItem, removeItem, moveItem, updateItem, goToTab, disabled } =
    usePropertyFormContext();

  const documents = values.documents ?? [];
  const brochure = String(values.brochureUrl ?? '').trim();
  const gatedCount = documents.filter((row) => row.leadGated !== false).length;

  return (
    <>
      <FormSection
        title="Brochure"
        description="The brochure lives with the rest of the media, and is offered on the listing page on its own."
      >
        <FormColumn>
          <div className={styles.summary}>
            <p className={styles.summaryText}>
              {brochure ? (
                <>
                  A brochure is attached:{' '}
                  <a className={styles.link} href={brochure} target="_blank" rel="noreferrer">
                    {brochure}
                  </a>
                  <br />
                  {values.brochureLeadGated !== false
                    ? 'A visitor gives their details before downloading it.'
                    : 'It downloads without asking for any details.'}
                </>
              ) : (
                'No brochure is attached to this listing yet.'
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToTab?.('media')}
              icon={<Icon icon="mdi:image-multiple-outline" width="16" height="16" />}
            >
              {brochure ? 'Change it on Media' : 'Add one on Media'}
            </Button>
          </div>
        </FormColumn>
      </FormSection>

      <FormSection
        title="Documents"
        description="Everything else a buyer downloads. Order them the way you want them listed."
      >
        <FormColumn>
          {documents.length === 0 ? (
            <p className={styles.counter}>
              Nothing attached yet. The price list, the RERA certificate and the approved plan are
              the three most often asked for.
            </p>
          ) : (
            <>
              <p className={styles.counter}>
                <span>
                  {documents.length} {documents.length === 1 ? 'document' : 'documents'}
                </span>
                <span>
                  {gatedCount} behind the lead form, {documents.length - gatedCount} open
                </span>
              </p>
              <SortableList
                label="Documents in order"
                items={documents}
                disabled={disabled}
                getLabel={(row, index) => row.title || `Document ${index + 1}`}
                onReorder={(_next, { from, to }) => moveItem('documents', from, to)}
                renderItem={(row, index) => {
                  const path = `documents.${index}`;
                  return (
                    <div className={styles.documentRow}>
                      <TextField
                        label="Title"
                        required
                        value={row.title ?? ''}
                        error={errors[`${path}.title`]}
                        disabled={disabled}
                        maxLength={150}
                        placeholder="e.g. Price list — March 2027"
                        onChange={(event) =>
                          updateItem('documents', row.id, { title: event.target.value })
                        }
                      />
                      <ImageField
                        label="File"
                        accept="document"
                        folder="documents"
                        preview={false}
                        required
                        value={row.url ?? ''}
                        error={errors[`${path}.url`]}
                        disabled={disabled}
                        placeholder="https://… (PDF, DOC or DOCX)"
                        onChange={(url) => updateItem('documents', row.id, { url })}
                      />
                      <SelectField
                        label="Type"
                        options={DOCUMENT_TYPES.options}
                        value={row.type || 'other'}
                        error={errors[`${path}.type`]}
                        disabled={disabled}
                        onChange={(event) =>
                          updateItem('documents', row.id, { type: event.target.value })
                        }
                      />
                      <SwitchField
                        label="Ask for details first"
                        checked={row.leadGated !== false}
                        disabled={disabled}
                        hint="Off means anyone can download it."
                        onChange={(checked) =>
                          updateItem('documents', row.id, { leadGated: checked })
                        }
                      />
                      <span className={styles.rowAction}>
                        <IconButton
                          label={`Remove ${row.title || `document ${index + 1}`}`}
                          size="sm"
                          disabled={disabled}
                          onClick={() => removeItem('documents', row.id)}
                        >
                          <Icon icon="mdi:close" width="18" height="18" />
                        </IconButton>
                      </span>
                    </div>
                  );
                }}
              />
            </>
          )}
        </FormColumn>

        <FormColumn>
          <div className={[styles.actions, styles.actionsEnd].join(' ')}>
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => addItem('documents', makeDocument())}
              icon={<Icon icon="mdi:plus" width="18" height="18" />}
            >
              Add document
            </Button>
          </div>
        </FormColumn>
      </FormSection>
    </>
  );
}
