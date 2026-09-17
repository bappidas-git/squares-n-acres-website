import { useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../../../../components/ui/Button';
import ConfirmDialog from '../../../../components/ui/ConfirmDialog';
import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
import seoService from '../../../../services/seoService';
import styles from '../SeoSettingsPage.module.css';
import { TextareaField } from '../../../../components/ui/FormField';
import { buildUrl } from '../../../../services/http';
import { endpoints } from '../../../../services/endpoints';
import { firstFieldMessage } from '../../../../services/apiError';
import { useToast } from '../../../../components/common/ToastProvider';

/**
 * llms.txt (§9.8).
 *
 * A plain-Markdown map of the site for the assistants that now answer a
 * proportion of property questions without anybody visiting a page: the
 * localities, the property types, the featured listings, the guides and how to
 * get in touch.
 *
 * "Regenerate from data" asks the API what the document **would** say about the
 * data as it stands today and puts that in the field. It is deliberately not a
 * save: an editor sees the diff in front of them and decides.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {boolean} [props.disabled]
 */
export default function LlmsTab({ form, disabled = false }) {
  const toast = useToast();
  const { values, setField, getError } = form;
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState(null);

  const regenerate = async () => {
    setBusy(true);
    try {
      const { data } = await seoService.llmsPreview();
      const next = data?.llmsTxt ?? '';
      if (!next.trim()) {
        toast.error('The generated document came back empty.');
        return;
      }
      if ((values.llmsTxt ?? '').trim()) setGenerated(next);
      else {
        setField('llmsTxt', next);
        toast.success('The document is regenerated. Save to publish it.');
      }
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The document could not be generated.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.tab}>
      <p className={styles.notice}>
        Assistants read this file to learn what the site covers. Regenerate it after a batch of new
        listings or guides, so what it lists is what exists.
      </p>

      <FormSection
        title="llms.txt"
        description="Served at /llms.txt. Leave it empty and the API generates one from the data on every request."
        action={
          <div className={styles.linkRow}>
            <Button
              variant="ghost"
              size="sm"
              href={buildUrl(endpoints.sitemap.llms)}
              target="_blank"
              rel="noopener noreferrer"
              icon={<Icon icon="mdi:open-in-new" width="16" height="16" />}
            >
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={regenerate}
              loading={busy}
              disabled={disabled}
              icon={<Icon icon="mdi:refresh" width="16" height="16" />}
            >
              Regenerate from data
            </Button>
          </div>
        }
      >
        <FormColumn>
          <TextareaField
            label="Document"
            rows={22}
            className={styles.mono}
            value={values.llmsTxt ?? ''}
            onChange={(event) => setField('llmsTxt', event.target.value)}
            error={getError('llmsTxt')}
            hint="Markdown: a heading, a paragraph of what the site is, then linked lists of localities, property types, listings and guides."
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <ConfirmDialog
        open={generated !== null}
        title="Replace the stored llms.txt?"
        message="The document currently in the field is replaced by the freshly generated one. The change is applied when you save."
        confirmLabel="Replace"
        onConfirm={() => {
          setField('llmsTxt', generated);
          setGenerated(null);
          toast.success('The document is regenerated. Save to publish it.');
        }}
        onClose={() => setGenerated(null)}
      />
    </div>
  );
}
