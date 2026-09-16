import { Icon } from '@iconify/react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import { Alert, Button, TextField, TextareaField } from '../../../../../components/ui';
import { usePropertyFormContext } from '../PropertyFormContext';

import styles from './PropertyTabs.module.css';

/** The character guides of §9.1 — what a search result has room to print. */
export const TITLE_GUIDE = { min: 50, max: 60 };
export const DESCRIPTION_GUIDE = { min: 120, max: 160 };

/**
 * `muted` while empty, `ok` inside the guide, `warn` outside it.
 *
 * Neither end is an error: a long title is truncated in the result, not
 * refused, and `validateSeo` keeps the only limits that would fail a save.
 */
export const counterTone = (length, { min, max }) => {
  if (length === 0) return 'muted';
  if (length >= min && length <= max) return 'ok';
  return 'warn';
};

const CLASS_OF = { ok: styles.counterOk, warn: styles.counterWarn, muted: '' };

/** "48 / 60 characters", coloured. */
function Counter({ value, guide, label }) {
  const length = String(value ?? '').length;
  const tone = counterTone(length, guide);

  return (
    <span className={[styles.counter, CLASS_OF[tone]].filter(Boolean).join(' ')} aria-live="polite">
      <span>
        {length} / {guide.max} characters
      </span>
      <span>
        {tone === 'muted'
          ? `${label} is empty — the site template is used instead.`
          : tone === 'ok'
            ? 'Inside the length a search result prints.'
            : length < guide.min
              ? `Short — aim for ${guide.min}–${guide.max}.`
              : `Long — a result cuts it near ${guide.max}.`}
      </span>
    </span>
  );
}

/**
 * Tab 16 — SEO, until the panel arrives (D87).
 *
 * The full `SeoPanel` — the analysis, the search and social previews, the
 * robots directives, the schema and the redirect — is prompt 36. This tab is
 * the four fields an editor needs before then, written straight into the same
 * `seo` branch the panel will read (§9.6), so a title set today is the title
 * the panel opens with. Everything else the branch carries is saved untouched.
 */
export default function SeoPlaceholderTab() {
  const { values, errors, setField, goToTab, disabled } = usePropertyFormContext();
  const seo = values.seo ?? {};

  return (
    <>
      <FormSection
        title="Search result"
        description="What Google prints for this listing. Leave a field empty and the site-wide template fills it in (§9.5)."
      >
        <FormColumn>
          <TextField
            label="Title"
            value={seo.title ?? ''}
            error={errors['seo.title']}
            disabled={disabled}
            maxLength={200}
            placeholder="3 BHK Apartment for Sale in Whitefield, Bengaluru"
            onChange={(event) => setField('seo.title', event.target.value)}
          />
          <Counter value={seo.title} guide={TITLE_GUIDE} label="The title" />
        </FormColumn>

        <FormColumn>
          <TextareaField
            label="Meta description"
            rows={3}
            value={seo.description ?? ''}
            error={errors['seo.description']}
            disabled={disabled}
            maxLength={320}
            placeholder="A sentence a buyer would click: the configuration, the locality, the price and what makes this one different."
            onChange={(event) => setField('seo.description', event.target.value)}
          />
          <Counter value={seo.description} guide={DESCRIPTION_GUIDE} label="The description" />
        </FormColumn>

        <FormColumn half>
          <TextField
            label="Focus keyword"
            value={seo.focusKeyword ?? ''}
            error={errors['seo.focusKeyword']}
            disabled={disabled}
            maxLength={120}
            hint="The one phrase this page should rank for. The analysis in the full panel is built around it."
            placeholder="3 bhk apartment whitefield"
            onChange={(event) => setField('seo.focusKeyword', event.target.value)}
          />
        </FormColumn>

        <FormColumn half>
          <div className={styles.summary}>
            <p className={styles.summaryText}>
              The address is{' '}
              <span className={styles.summaryValue}>/properties/{values.slug || '…'}</span>
              <br />
              It is one URL: editing the slug on Basics moves the page and this field with it (D34).
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => goToTab?.('basics')}
              icon={<Icon icon="mdi:link-variant" width="16" height="16" />}
            >
              Edit on Basics
            </Button>
          </div>
        </FormColumn>
      </FormSection>

      <Alert
        tone="info"
        title="The rest of the SEO panel arrives in a later step"
        icon={<Icon icon="mdi:progress-wrench" width="20" height="20" />}
      >
        The full SEO panel (analysis, previews, social, advanced) is added in a later step. The
        keywords, canonical, Open Graph, Twitter, schema, sitemap and redirect this listing already
        holds are carried through every save untouched in the meantime.
      </Alert>
    </>
  );
}
