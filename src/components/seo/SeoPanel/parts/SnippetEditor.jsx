import { useMemo } from 'react';
import { Icon } from '@iconify/react';

import Button from '../../../ui/Button';
import SeoMeter from './SeoMeter';
import SlugField from '../../../admin/SlugField';
import VariableMenu from './VariableMenu';
import { TextField, TextareaField } from '../../../ui/FormField';
import { buildVariables, generateDefaults, measureSnippet, resolveTemplate } from '../../../../seo';
import { fieldId } from '../SeoPanel';
import { useSeoPanel } from '../SeoPanelContext';

import styles from '../SeoPanel.module.css';

/** What a snippet field will accept before the API refuses it (`validateSeo`). */
export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 320;

/** The path the slug hangs off, per entity type, when the host does not say. */
const SLUG_BASE = {
  property: '/properties/',
  article: '/insights/articles/',
  locality: '/localities/',
  developer: '/builders/',
  articleCategory: '/insights/category/',
  author: '/insights/author/',
  page: '/',
};

/**
 * The three fields a search result is made of: the title, the address and the
 * description.
 *
 * The title is a **template**, not a string: `%bhk% in %locality%` is a
 * perfectly good thing to type into it, so the field carries a variable menu
 * and prints what the variables resolve to underneath (§9.5). The address is
 * the entity's own slug rather than a copy of it — D34, one URL — which is why
 * editing it here moves the page.
 */
export default function SnippetEditor() {
  const {
    entityType,
    entity,
    seo,
    setField,
    setSeo,
    seoSettings,
    context,
    errors,
    disabled,
    resolved,
    setSlug,
    checkSlug,
    excludeId,
    slugBase,
  } = useSeoPanel();

  const titleId = fieldId('seo.title');
  const descriptionId = fieldId('seo.description');

  const variables = useMemo(
    () => buildVariables(entityType, entity, context),
    [entityType, entity, context]
  );

  const titlePreview = seo.title ? resolveTemplate(seo.title, variables) : resolved.title;
  const title = measureSnippet(titlePreview, 'title');
  const description = measureSnippet(seo.description || '', 'description');

  /** "Generate" — the record's own facts, and never over something written. */
  const generate = (key) => {
    const made = generateDefaults(entityType, entity, seoSettings, { context });
    const value = key === 'title' ? made.title : made.description;
    if (value) setField(key, value);
  };

  const base = slugBase ?? SLUG_BASE[entityType] ?? '/';

  return (
    <div className={styles.stack}>
      <div className={styles.stack}>
        <div className={styles.fieldHead}>
          <span className={styles.heading}>Search result</span>
          <span className={styles.fieldActions}>
            <VariableMenu
              inputId={titleId}
              value={seo.title}
              disabled={disabled}
              onInsert={(next) => setField('title', next)}
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              icon={<Icon icon="mdi:auto-fix" width="16" height="16" />}
              onClick={() => generate('title')}
            >
              Generate
            </Button>
          </span>
        </div>

        <TextField
          id={titleId}
          label="SEO title"
          value={seo.title ?? ''}
          error={errors['seo.title']}
          disabled={disabled}
          maxLength={TITLE_MAX_LENGTH}
          placeholder={resolved.title || 'The headline a search result prints'}
          onChange={(event) => setField('title', event.target.value)}
        />
        <SeoMeter kind="title" label="Title length" length={title.chars} pixels={title.pixels} />
        <p className={styles.resolvedLine}>
          {seo.title ? 'Resolves to' : 'Empty — the site template gives'}{' '}
          <span className={styles.resolvedValue}>{titlePreview || '—'}</span>
        </p>
      </div>

      <SlugField
        label="Permalink"
        base={base}
        path={entityType === 'page'}
        value={seo.slug || entity?.slug || ''}
        source={entity?.title ?? entity?.name ?? ''}
        error={errors['seo.slug'] ?? errors.slug}
        disabled={disabled || !setSlug}
        excludeId={excludeId}
        checkSlug={checkSlug}
        onChange={(next) => {
          // D34: `seo.slug` mirrors the entity slug, so both move together.
          setSlug?.(next);
          setSeo({ slug: next });
        }}
      />

      <div className={styles.stack}>
        <div className={styles.fieldHead}>
          <span className={styles.heading}>Meta description</span>
          <span className={styles.fieldActions}>
            <VariableMenu
              inputId={descriptionId}
              value={seo.description}
              disabled={disabled}
              onInsert={(next) => setField('description', next)}
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              icon={<Icon icon="mdi:auto-fix" width="16" height="16" />}
              onClick={() => generate('description')}
            >
              Generate
            </Button>
          </span>
        </div>

        <TextareaField
          id={descriptionId}
          label="Meta description"
          rows={3}
          value={seo.description ?? ''}
          error={errors['seo.description']}
          disabled={disabled}
          maxLength={DESCRIPTION_MAX_LENGTH}
          placeholder="A sentence somebody would click: what this page answers, and for whom."
          onChange={(event) => setField('description', event.target.value)}
        />
        <SeoMeter
          kind="description"
          label="Description length"
          length={description.chars}
          pixels={description.pixels}
        />
        {seo.description ? null : (
          <p className={styles.resolvedLine}>
            Empty — every page without one shares{' '}
            <span className={styles.resolvedValue}>the site-wide default</span>, which is the
            duplicate this panel exists to catch.
          </p>
        )}
      </div>
    </div>
  );
}
