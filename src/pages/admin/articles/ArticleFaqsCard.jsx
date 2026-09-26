import { Icon } from '@iconify/react';

import FormSection, { FormColumn } from '../../../components/admin/FormSection';
import RichTextField from '../../../components/editor/RichTextField';
import SortableList from '../../../components/admin/SortableList';
import { Button, IconButton, TextField } from '../../../components/ui';

import styles from './ArticleFormPage.module.css';

/**
 * The article's FAQ items (§6.8 `faqs`).
 *
 * Two reasons they are a field of the article rather than rows of the FAQ
 * library: they belong to this piece — "does a khata transfer need the seller
 * present?" is an answer to this guide, not a site-wide question — and they are
 * what prompt 38 turns into `FAQPage` structured data for this URL.
 *
 * The answer is the compact editor, so a link or a list is possible and a
 * paragraph is the default. The rows are reorderable because the order they are
 * asked in is editorial, and a row is keyed on its own identity rather than on
 * its index (§4.3) — otherwise removing the first question would move every
 * editor below it.
 *
 * @param {object} props
 * @param {ReturnType<import('./useArticleForm').default>} props.form
 */
export default function ArticleFaqsCard({ form }) {
  const { values, errors, readOnly, saving, addFaq, updateFaq, removeFaq, moveFaq } = form;
  const faqs = Array.isArray(values.faqs) ? values.faqs : [];
  const disabled = readOnly || saving;

  return (
    <FormSection
      id="article-faqs"
      title="FAQs"
      description="The questions this article leaves a reader with. They render as an accordion under the body and as FAQ structured data for search engines."
    >
      <FormColumn>
        {faqs.length === 0 ? (
          <p className={styles.emptyHint}>
            Nothing asked yet. Two or three questions a reader would still have after the last
            paragraph are worth more than a fourth section.
          </p>
        ) : (
          <SortableList
            label="FAQs in order"
            items={faqs}
            disabled={disabled}
            getId={(faq) => faq._key}
            getLabel={(faq, index) => faq.question || `Question ${index + 1}`}
            onReorder={(_next, { from, to }) => moveFaq(from, to)}
            renderItem={(faq, index) => (
              <div className={styles.faqRow}>
                <div className={styles.faqHead}>
                  <TextField
                    label={`Question ${index + 1}`}
                    value={faq.question ?? ''}
                    error={errors[`faqs.${index}.question`]}
                    disabled={disabled}
                    maxLength={300}
                    placeholder="e.g. Does a khata transfer need the seller to be present?"
                    onChange={(event) => updateFaq(faq._key, { question: event.target.value })}
                  />
                  <IconButton
                    label={`Remove question ${index + 1}`}
                    size="sm"
                    disabled={disabled}
                    onClick={() => removeFaq(faq._key)}
                  >
                    <Icon icon="mdi:close" width="18" height="18" />
                  </IconButton>
                </div>
                <RichTextField
                  label="Answer"
                  variant="compact"
                  minHeight={120}
                  value={faq.answer ?? ''}
                  error={errors[`faqs.${index}.answer`]}
                  disabled={disabled}
                  placeholder="Answer it in two or three sentences."
                  onChange={(html) => updateFaq(faq._key, { answer: html })}
                />
              </div>
            )}
          />
        )}

        {readOnly ? null : (
          <Button
            variant="outline"
            size="sm"
            className={styles.faqAdd}
            disabled={disabled}
            icon={<Icon icon="mdi:plus" width="16" height="16" />}
            onClick={addFaq}
          >
            Add a question
          </Button>
        )}
      </FormColumn>
    </FormSection>
  );
}
