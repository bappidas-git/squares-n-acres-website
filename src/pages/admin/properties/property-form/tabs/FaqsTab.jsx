import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import SortableList from '../../../../../components/admin/SortableList';
import RichTextField from '../../../../../components/editor/RichTextField';
import { Alert, Button, IconButton, Modal, TextField } from '../../../../../components/ui';
import { makeFaq } from '../initialState';
import { FAQ_QUESTION_MAX, FAQ_QUESTION_MIN, plainText } from '../validators';
import { useMasterData } from '../../../../../contexts/MasterDataContext';
import suggestFaqs, { SUGGESTION_LIMIT } from '../suggestFaqs';
import { propertyFieldId } from '../fieldFocus';
import { usePropertyFormContext } from '../PropertyFormContext';

import styles from './PropertyTabs.module.css';

/**
 * Tab 12 — FAQs.
 *
 * Questions and answers, in the order they are asked. The answer is HTML
 * (§6.1), written in the compact rich-text editor: the same field, the same
 * validator key and the same payload as the box it replaced.
 *
 * "Generate suggested FAQs" is the reason the tab exists in this shape. Every
 * listing owes a visitor the same six answers — price, possession, RERA,
 * amenities, location, configurations — and every one of them is already
 * somewhere on this form. `suggestFaqs` writes them out of the record, the
 * dialog shows exactly what would be added, and nothing is written until
 * somebody has read it.
 */
export default function FaqsTab() {
  const { values, errors, addItem, removeItem, moveItem, updateItem, disabled } =
    usePropertyFormContext();
  const { byId, amenities } = useMasterData();

  const faqs = values.faqs ?? [];
  const [preview, setPreview] = useState(null);
  const [chosen, setChosen] = useState([]);

  const context = useMemo(
    () => ({
      locality: byId('localities', values.location?.localityId),
      city: byId('cities', values.location?.cityId),
      propertyType: byId('propertyTypes', values.propertyTypeId),
      developer: byId('developers', values.project?.developerId),
      amenities,
    }),
    [
      byId,
      amenities,
      values.location?.localityId,
      values.location?.cityId,
      values.propertyTypeId,
      values.project?.developerId,
    ]
  );

  const openSuggestions = () => {
    const suggestions = suggestFaqs(values, context);
    setChosen(suggestions.map((_row, index) => index));
    setPreview(suggestions);
  };

  const addChosen = () => {
    (preview ?? []).forEach((suggestion, index) => {
      if (!chosen.includes(index)) return;
      addItem('faqs', makeFaq({ question: suggestion.question, answer: suggestion.answer }));
    });
    setPreview(null);
  };

  return (
    <>
      <FormSection
        title="FAQs"
        description="The questions a buyer would otherwise have to ring up to ask. They render as an accordion on the listing page and as FAQ structured data for search engines (§9)."
      >
        <FormColumn>
          {faqs.length === 0 ? (
            <p className={styles.counter}>
              Nothing answered yet. “Generate suggested FAQs” writes up to {SUGGESTION_LIMIT}{' '}
              questions this listing can already answer from what it holds — read them, keep what is
              right, edit the rest.
            </p>
          ) : (
            <SortableList
              label="FAQs in order"
              items={faqs}
              disabled={disabled}
              getLabel={(faq, index) => faq.question || `Question ${index + 1}`}
              onReorder={(_next, { from, to }) => moveItem('faqs', from, to)}
              renderItem={(faq, index) => {
                const path = `faqs.${index}`;
                return (
                  <div className={styles.faqRow}>
                    <div className={styles.faqHead}>
                      <TextField
                        id={propertyFieldId(`${path}.question`)}
                        label={`Question ${index + 1}`}
                        value={faq.question ?? ''}
                        error={errors[`${path}.question`]}
                        disabled={disabled}
                        maxLength={FAQ_QUESTION_MAX}
                        placeholder="e.g. Is the project RERA registered?"
                        onChange={(event) =>
                          updateItem('faqs', faq.id, { question: event.target.value })
                        }
                      />
                      <span className={styles.rowAction}>
                        <IconButton
                          label={`Remove question ${index + 1}`}
                          size="sm"
                          disabled={disabled}
                          onClick={() => removeItem('faqs', faq.id)}
                        >
                          <Icon icon="mdi:close" width="18" height="18" />
                        </IconButton>
                      </span>
                    </div>
                    <div id={propertyFieldId(`${path}.answer`)}>
                      <RichTextField
                        label="Answer"
                        variant="compact"
                        minHeight={140}
                        value={faq.answer ?? ''}
                        error={errors[`${path}.answer`]}
                        disabled={disabled}
                        helper="A paragraph or a short list — answer the question and stop."
                        onChange={(html) => updateItem('faqs', faq.id, { answer: html })}
                      />
                    </div>
                  </div>
                );
              }}
            />
          )}
        </FormColumn>

        <FormColumn>
          <p className={styles.counter}>
            <span>
              {faqs.length} {faqs.length === 1 ? 'question' : 'questions'}
            </span>
            <span>
              A question is {FAQ_QUESTION_MIN}–{FAQ_QUESTION_MAX} characters.
            </span>
          </p>
          <div className={[styles.actions, styles.actionsEnd].join(' ')}>
            <Button
              // "No FAQs answered" from the SEO tab lands here.
              id={propertyFieldId('faqs')}
              variant="ghost"
              disabled={disabled}
              onClick={openSuggestions}
              icon={<Icon icon="mdi:lightbulb-on-outline" width="18" height="18" />}
            >
              Generate suggested FAQs
            </Button>
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => addItem('faqs', makeFaq())}
              icon={<Icon icon="mdi:plus" width="18" height="18" />}
            >
              Add FAQ
            </Button>
          </div>
        </FormColumn>
      </FormSection>

      <Modal
        open={Array.isArray(preview)}
        onClose={() => setPreview(null)}
        title="Suggested questions"
        description="Written from what this listing already holds. Nothing is added until you say so, and nothing you have already answered is offered again."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              Cancel
            </Button>
            <Button onClick={addChosen} disabled={chosen.length === 0}>
              Add selected ({chosen.length})
            </Button>
          </>
        }
      >
        {preview?.length === 0 ? (
          <Alert tone="info" title="Nothing left to suggest">
            Every question this listing can answer from its own fields is already here. Fill in more
            of the form — a price, a possession date, the amenities — and the suggestions come back.
          </Alert>
        ) : (
          <ul className={styles.suggestions}>
            {(preview ?? []).map((suggestion, index) => (
              <li key={suggestion.question} className={styles.suggestion}>
                <label className={styles.suggestionLabel}>
                  <input
                    type="checkbox"
                    className={styles.suggestionCheckbox}
                    checked={chosen.includes(index)}
                    onChange={(event) =>
                      setChosen((current) =>
                        event.target.checked
                          ? [...current, index]
                          : current.filter((entry) => entry !== index)
                      )
                    }
                  />
                  <span className={styles.suggestionQuestion}>{suggestion.question}</span>
                </label>
                <p className={styles.suggestionAnswer}>{plainText(suggestion.answer)}</p>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
