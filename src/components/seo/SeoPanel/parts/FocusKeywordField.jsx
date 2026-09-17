import { useMemo } from 'react';
import { Icon } from '@iconify/react';

import MultiSelect from '../../../admin/MultiSelect';
import { TextField } from '../../../ui/FormField';
import { suggestKeywords } from '../../../../seo';
import { fieldId } from '../SeoPanel';
import { useSeoPanel } from '../SeoPanelContext';

import styles from '../SeoPanel.module.css';

/** How many phrases a page may target beyond its focus keyword (SEO-05). */
export const MAX_SECONDARY = 4;

/** What a focus keyword will accept before `validateSeo` refuses it. */
export const FOCUS_KEYWORD_MAX = 120;

/** One array, so a record with no secondary keywords does not make a new one a render. */
const EMPTY = [];

/**
 * The phrase this page is trying to rank for, and the four it also answers.
 *
 * The suggestions are the reason this is not a plain text field: the hardest
 * part of writing SEO for a listing is not the writing but picking the phrase,
 * and the phrase is nearly always built from what the record already says —
 * the configuration, the type and the locality. `suggestKeywords` reads those,
 * so every chip is a search the page can actually answer.
 */
export default function FocusKeywordField() {
  const { entityType, entity, seo, setField, context, errors, disabled } = useSeoPanel();

  const suggestions = useMemo(
    () => suggestKeywords(entityType, entity, context),
    [entityType, entity, context]
  );

  const focus = String(seo.focusKeyword ?? '');
  const secondary = useMemo(
    () => (Array.isArray(seo.secondaryKeywords) ? seo.secondaryKeywords : EMPTY),
    [seo.secondaryKeywords]
  );

  const unused = useMemo(
    () => suggestions.filter((phrase) => phrase !== focus && !secondary.includes(phrase)),
    [suggestions, focus, secondary]
  );

  const options = useMemo(
    () =>
      [...new Set([...secondary, ...unused])].map((phrase) => ({ value: phrase, label: phrase })),
    [secondary, unused]
  );

  return (
    <div className={styles.stack}>
      <TextField
        id={fieldId('seo.focusKeyword')}
        label="Focus keyword"
        value={focus}
        error={errors['seo.focusKeyword']}
        disabled={disabled}
        maxLength={FOCUS_KEYWORD_MAX}
        hint="The one phrase this page should rank for. Every test below is asked about it."
        placeholder="3 bhk apartment in whitefield"
        onChange={(event) => setField('focusKeyword', event.target.value)}
      />

      {unused.length > 0 && !disabled ? (
        <div className={styles.suggestions}>
          <span className={styles.note}>Suggestions</span>
          {unused.map((phrase) => (
            <button
              key={phrase}
              type="button"
              className={styles.suggestion}
              onClick={() => setField('focusKeyword', phrase)}
            >
              <Icon icon="mdi:plus" width="14" height="14" aria-hidden="true" />
              {phrase}
              <span className={styles.srOnly}> — use as the focus keyword</span>
            </button>
          ))}
        </div>
      ) : null}

      <MultiSelect
        label="Secondary keywords"
        value={secondary}
        options={options}
        max={MAX_SECONDARY}
        creatable
        disabled={disabled}
        error={errors['seo.secondaryKeywords']}
        hint={`Up to ${MAX_SECONDARY} phrases the same page also answers. Type one and press Enter.`}
        placeholder="apartments near itpl"
        onCreate={(text) => {
          const phrase = String(text ?? '')
            .trim()
            .toLowerCase();
          return phrase ? { value: phrase, label: phrase } : null;
        }}
        onChange={(next) => setField('secondaryKeywords', next.slice(0, MAX_SECONDARY))}
      />
    </div>
  );
}
