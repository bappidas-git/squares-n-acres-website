import { Icon } from '@iconify/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import AdminTabs, { AdminTabPanel } from '../../../components/admin/AdminTabs';
import ArticleChecksCard from './ArticleChecksCard';
import ArticleFaqsCard from './ArticleFaqsCard';
import ArticleImageCard from './ArticleImageCard';
import ArticleRelatedCard from './ArticleRelatedCard';
import ArticleStatusCard from './ArticleStatusCard';
import ArticleTaxonomyCard from './ArticleTaxonomyCard';
import FormSection, { FormColumn } from '../../../components/admin/FormSection';
import PATHS from '../../../routes/paths';
import SeoPanel from '../../../components/seo/SeoPanel';
import SeoSummaryCard from '../../../components/seo/SeoPanel/SeoSummaryCard';
import PageHeader from '../../../components/admin/PageHeader';
import RichTextField from '../../../components/editor/RichTextField';
import SlugField from '../../../components/admin/SlugField';
import { toSeoPaths } from '../../../components/seo/seoValues';
import articleService from '../../../services/articleService';
import useApi from '../../../hooks/useApi';
import useArticleForm, { EXCERPT_MAX_LENGTH, TITLE_MAX_LENGTH } from './useArticleForm';
import useArticleTaxonomy from './useArticleTaxonomy';
import useBreakpoint from '../../../hooks/useBreakpoint';
import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Skeleton,
  TextField,
  TextareaField,
} from '../../../components/ui';
import { generateExcerpt } from '../../../utils/articleUtils';
import { SEO } from '../../../config/adminCopy';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './ArticleFormPage.module.css';

/**
 * `SlugField`'s availability check, in the shape it hands over.
 *
 * Module level so its identity is stable: the field debounces on it, and a new
 * arrow on every render would ask the API after every keystroke of the title.
 */
const checkArticleSlug = (slug, { excludeId, signal } = {}) =>
  articleService.checkSlug({ slug, excludeId }, { signal });

/** The character guides of §9.1 — what a search result has room to print. */
const TITLE_GUIDE = { min: 50, max: 60 };

/** The two halves of the form. */
const FORM_TABS = [
  { key: 'content', label: 'Content', icon: 'mdi:text-box-outline' },
  { key: 'seo', label: 'SEO', icon: 'mdi:magnify' },
];

/**
 * What the SEO analysers call a field, and where it is on this screen.
 *
 * A hint that names the body scrolls to the editor; one that names the category
 * scrolls to the Classification card in the rail. The images an article is
 * measured on are the ones in its body, so `images` is the editor too. Anything
 * not listed still opens the Content tab, which is where everything about the
 * article is — and anything under `seo.` is the SEO panel's, reached through
 * its own `focusRequest`.
 */
const FIELD_TARGET = {
  content: 'article-content',
  images: 'article-content',
  excerpt: 'article-excerpt',
  slug: 'article-slug',
  faqs: 'article-faqs',
  featuredImage: 'article-image',
  categoryId: 'article-taxonomy',
  tagIds: 'article-taxonomy',
  relatedArticleIds: 'article-related',
  tableOfContents: 'article-status',
};

/** What "focus this field" means when the id is on a block rather than a control. */
const FOCUSABLE = 'input, textarea, select, [contenteditable="true"]';

/**
 * Admin → Articles → add / edit
 * (`/admin/articles/add`, `/admin/articles/edit/:id`).
 *
 * Two columns: the piece itself on the left — headline, URL, excerpt, body —
 * and everything *about* it in the rail on the right, because an editor writing
 * an article should be looking at the article. Below 1200 px the rail folds
 * above the body and the two writes an editor actually reaches for follow the
 * page in a sticky bar (§6).
 *
 * The screen owns the fetch and the four states of §8.2; everything the record
 * does afterwards belongs to `useArticleForm`.
 *
 * What the boilerplate's form was: a plain-text box with a syntax-help modal,
 * a free-text author box, category and tag pickers made of hardcoded strings,
 * and no way to schedule anything (ADD-20). Every one of those is now
 * the real field behind it — `content` is sanitised HTML from the one editor,
 * `authorId` and `categoryId` are foreign keys, tags are records, and a
 * publication date is a moment the API enforces.
 */
export default function ArticleFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { can } = useAdminAuth();
  const { width } = useBreakpoint();
  const beside = width === 'lg';

  const readOnly = !can('articles', isEdit ? 'edit' : 'create');

  const {
    data: record,
    loading,
    error,
    refetch,
  } = useApi((signal) => articleService.adminGet(id, { signal }), [id], { enabled: isEdit });

  const taxonomy = useArticleTaxonomy();
  const form = useArticleForm({ articleId: id ?? null, record, readOnly });

  const [activeTab, setActiveTab] = useState('content');
  // "Generate from content" over an excerpt somebody wrote asks first: the
  // box takes the new text wholesale, and its own undo cannot bring the old
  // one back (QA-55).
  const [replaceExcerpt, setReplaceExcerpt] = useState(false);
  // Focusing a control the SEO tab has just hidden has to wait for the render
  // that brings it back, which is what this ref and the callback below are for.
  const pendingFocus = useRef(null);
  // A field of the SEO panel the rail's "Fix SEO" (or a hint) asked for: the
  // panel mounts with the tab and opens its own sub-tab on it. A new object
  // asks again, so the same field can be asked for twice.
  const [seoFocusRequest, setSeoFocusRequest] = useState(null);
  const toast = useToast();

  // A request is spent once the editor leaves the SEO tab: left in place, the
  // panel — which mounts with the tab — put the cursor back in that field every
  // time the tab was opened again.
  useEffect(() => {
    if (activeTab !== 'seo') setSeoFocusRequest(null);
  }, [activeTab]);

  /**
   * The SEO panel's fix hints and the rail's "Fix SEO": open the half of the
   * form that holds the field, then put the cursor in it. A path under `seo.`
   * lives on the SEO tab (the first failure of most articles is one — "The
   * title does not carry the focus keyword" is `seo.title`), everything else on
   * Content.
   */
  const focusField = useCallback((path) => {
    if (!path) return;
    if (String(path).startsWith('seo.')) {
      setActiveTab('seo');
      setSeoFocusRequest((previous) => ({ path, nonce: (previous?.nonce ?? 0) + 1 }));
      return;
    }

    const target = FIELD_TARGET[path];
    setActiveTab('content');
    pendingFocus.current = target ?? null;

    window.requestAnimationFrame(() => {
      const elementId = pendingFocus.current;
      pendingFocus.current = null;
      if (!elementId) return;

      const element = document.getElementById(elementId);
      if (!element) return;
      const control = element.matches(FOCUSABLE) ? element : element.querySelector(FOCUSABLE);
      (control ?? element).focus?.();
      element.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    });
  }, []);

  const {
    values,
    errors,
    setField,
    handleBlur,
    saving,
    previewing,
    editorRef,
    save,
    draftOffer,
    restoreDraft,
    discardDraft,
  } = form;

  // An article that is already live has one obvious write — save it — so "Save"
  // is the primary button and there is no second one that means the same thing.
  const live = values.status === 'published';

  const title = isEdit ? (record?.title ?? 'Edit article') : 'New article';
  const breadcrumbs = [
    { label: 'Articles', to: PATHS.adminArticles },
    { label: isEdit ? (record?.title ?? 'Edit article') : 'New article' },
  ];

  const actions = readOnly ? (
    <Button variant="ghost" to={PATHS.adminArticles}>
      Back to articles
    </Button>
  ) : (
    <>
      <Button variant="ghost" to={PATHS.adminArticles} disabled={saving}>
        Cancel
      </Button>
      {values.status === 'draft' ? null : (
        <Button variant="outline" disabled={saving || previewing} onClick={() => save('draft')}>
          Save as draft
        </Button>
      )}
      <Button
        variant={live ? 'primary' : 'outline'}
        loading={live && saving}
        disabled={previewing || (!live && saving)}
        onClick={() => save('save')}
      >
        Save
      </Button>
      {live ? null : <PrimaryAction form={form} />}
    </>
  );

  if (isEdit && loading) {
    return (
      <>
        <PageHeader title="Edit article" breadcrumbs={breadcrumbs} />
        <div className={styles.loading} role="status" aria-busy="true" aria-live="polite">
          <span className={styles.srOnly}>Loading the article…</span>
          <Skeleton variant="rounded" height={48} />
          <div className={styles.layout}>
            <Skeleton variant="rounded" height={480} />
            <Skeleton variant="rounded" height={480} />
          </div>
        </div>
      </>
    );
  }

  if (isEdit && error?.status === 404) {
    return (
      <>
        <PageHeader title="Edit article" breadcrumbs={breadcrumbs} />
        <EmptyState
          icon={<Icon icon="mdi:text-box-search-outline" width="40" height="40" />}
          title="Article not found"
          text="This article has been deleted, or the address is wrong."
          action={
            <Button variant="outline" to={PATHS.adminArticles}>
              Back to articles
            </Button>
          }
        />
      </>
    );
  }

  if (isEdit && (error || !record)) {
    return (
      <>
        <PageHeader title="Edit article" breadcrumbs={breadcrumbs} />
        <ErrorState
          title="We could not load this article"
          text={error?.message}
          onRetry={refetch}
        />
      </>
    );
  }

  const rail = (
    <div className={styles.rail}>
      <ArticleStatusCard form={form} />
      <aside className={styles.card} aria-labelledby="article-seo">
        <h2 className={styles.cardTitle} id="article-seo">
          Search engines
        </h2>
        <SeoSummaryCard
          compact
          seo={values.seo}
          onOpen={(failure) => {
            if (failure?.field) focusField(failure.field);
            else setActiveTab('seo');
            if (failure?.message) {
              const where = !failure.field || failure.field.startsWith('seo.') ? 'SEO' : 'Content';
              toast.info(SEO.panel.opened(where, failure.message));
            }
          }}
        />
      </aside>
      <ArticleChecksCard form={form} />
      <ArticleTaxonomyCard form={form} taxonomy={taxonomy} />
      <ArticleImageCard form={form} />
      <ArticleRelatedCard form={form} />
    </div>
  );

  return (
    <>
      <PageHeader
        title={title}
        breadcrumbs={breadcrumbs}
        subtitle={
          readOnly
            ? 'Read-only — your role can read an article but not change it.'
            : 'The piece on the left, everything about it on the right.'
        }
        actions={<div className={styles.headerActions}>{actions}</div>}
      />

      <div className={beside ? styles.layout : styles.stacked}>
        {beside ? null : rail}

        <form
          className={styles.main}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!readOnly) save('save');
          }}
        >
          <DraftBanner draft={draftOffer} onRestore={restoreDraft} onDiscard={discardDraft} />

          <AdminTabs
            label="Article sections"
            tabs={FORM_TABS}
            value={activeTab}
            onChange={setActiveTab}
          />

          <AdminTabPanel tabKey="content" value={activeTab}>
            <FormSection title="The article">
              <FormColumn>
                <TextField
                  label="Headline"
                  required
                  value={values.title ?? ''}
                  error={errors.title}
                  disabled={readOnly || saving}
                  maxLength={TITLE_MAX_LENGTH}
                  hint="20 to 100 characters. What a reader would search for, not what an editor would file it under."
                  onChange={(event) => setField('title', event.target.value)}
                  onBlur={() => handleBlur('title')}
                />
                <Counter
                  value={values.title}
                  guide={TITLE_GUIDE}
                  max={TITLE_MAX_LENGTH}
                  empty="A headline is required before anything can be saved."
                />
              </FormColumn>

              <FormColumn id="article-slug">
                <SlugField
                  label="URL"
                  required
                  base="/insights/articles/"
                  value={values.slug ?? ''}
                  source={values.title ?? ''}
                  error={errors.slug ?? errors['seo.slug']}
                  disabled={readOnly || saving}
                  excludeId={id}
                  checkSlug={checkArticleSlug}
                  onChange={(next) => setField('slug', next)}
                />
              </FormColumn>

              <FormColumn>
                <TextareaField
                  id="article-excerpt"
                  label="Excerpt"
                  rows={3}
                  value={values.excerpt ?? ''}
                  error={errors.excerpt}
                  disabled={readOnly || saving}
                  maxLength={EXCERPT_MAX_LENGTH}
                  hint="The sentence the archive card and the search result print. Required before the article goes live."
                  onChange={(event) => setField('excerpt', event.target.value)}
                />
                <div className={styles.excerptFoot}>
                  <span className={styles.counterPlain} aria-live="polite">
                    {(values.excerpt ?? '').length} / {EXCERPT_MAX_LENGTH} characters
                  </span>
                  {readOnly ? null : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={saving || !values.content}
                      icon={<Icon icon="mdi:auto-fix" width="16" height="16" />}
                      onClick={() => {
                        if ((values.excerpt ?? '').trim()) setReplaceExcerpt(true);
                        else setField('excerpt', generateExcerpt(values.content));
                      }}
                    >
                      Generate from content
                    </Button>
                  )}
                </div>
              </FormColumn>
            </FormSection>

            <FormSection
              title="Body"
              description="Headings, lists, images, tables and the three blocks — a call to action, a row of listings, a FAQ group."
            >
              <FormColumn id="article-content">
                <RichTextField
                  ref={editorRef}
                  label="Content"
                  required
                  variant="full"
                  minHeight={420}
                  value={values.content ?? ''}
                  error={errors.content}
                  disabled={readOnly || saving}
                  focusKeyword={values.seo?.focusKeyword ?? ''}
                  placeholder="Open with the answer, then explain it."
                  helper="Images are added by address until the media library arrives; every one needs alt text."
                  onChange={(html) => setField('content', html)}
                />
              </FormColumn>
            </FormSection>

            <ArticleFaqsCard form={form} />
          </AdminTabPanel>

          <AdminTabPanel tabKey="seo" value={activeTab}>
            <SeoPanel
              entityType="article"
              entity={values}
              seo={values.seo}
              variant="full"
              errors={errors}
              disabled={readOnly || saving}
              excludeId={id}
              checkSlug={checkArticleSlug}
              slugBase="/insights/articles/"
              context={{ categories: taxonomy.categories, authors: taxonomy.authors }}
              onFocusField={focusField}
              focusRequest={seoFocusRequest}
              onSlugChange={(slug) => setField('slug', slug)}
              onChange={(patch, meta) => {
                // The analysis writing its own score back is not an edit, so it
                // moves the baseline with the value and the form stays clean
                // until somebody actually changes something (`setComputed`).
                if (meta?.computed) {
                  form.setComputed(toSeoPaths(patch));
                  return;
                }
                // One dotted path at a time: `useForm.setField` composes on the
                // current values, so an edit and the analysis landing behind it
                // cannot overwrite each other.
                for (const [path, value] of Object.entries(toSeoPaths(patch))) {
                  setField(path, value);
                }
              }}
            />
          </AdminTabPanel>
        </form>

        {beside ? <div className={styles.railColumn}>{rail}</div> : null}
      </div>

      <ConfirmDialog
        open={replaceExcerpt}
        title="Replace the excerpt?"
        message="The first paragraph of the body takes the place of the excerpt you wrote."
        confirmLabel="Replace it"
        onClose={() => setReplaceExcerpt(false)}
        onConfirm={() => {
          setReplaceExcerpt(false);
          setField('excerpt', generateExcerpt(values.content));
        }}
      />

      {beside || readOnly ? null : (
        <div className={styles.bottomBar}>
          <Button
            variant={live ? 'primary' : 'outline'}
            loading={live && saving}
            disabled={previewing || (!live && saving)}
            onClick={() => save('save')}
            icon={<Icon icon="mdi:content-save-outline" width="18" height="18" />}
          >
            Save
          </Button>
          {live ? null : <PrimaryAction form={form} />}
        </div>
      )}
    </>
  );
}

/**
 * The write that changes the article's state, named after what it does: an
 * article set to `scheduled` is scheduled, anything not yet live is published.
 *
 * Pressing it is what puts the publish rules in force — the status moves first,
 * so the validation that follows reads the rules of the state the editor is
 * asking for rather than the one they are in (§7 of this prompt).
 *
 * @param {object} props
 * @param {ReturnType<import('./useArticleForm').default>} props.form
 */
function PrimaryAction({ form }) {
  const { saving, previewing, primaryMode, save } = form;
  const scheduling = primaryMode === 'schedule';

  return (
    <Button
      loading={saving}
      disabled={previewing}
      icon={<Icon icon={scheduling ? 'mdi:clock-outline' : 'mdi:earth'} width="18" height="18" />}
      onClick={() => save(scheduling ? 'schedule' : 'publish')}
    >
      {scheduling ? 'Schedule' : 'Publish now'}
    </Button>
  );
}

/**
 * "Restore unsaved changes from 5 minutes ago?"
 *
 * The form writes a draft to this browser every ten seconds while it is dirty,
 * so a closed tab, a reload or a crash does not cost an afternoon's writing. On
 * the next visit the draft is **offered**, never applied: the record on the
 * server is the truth until an editor says otherwise.
 *
 * @param {object} props
 * @param {{savedAt: string}|null} props.draft
 * @param {() => void} props.onRestore
 * @param {() => void} props.onDiscard
 */
function DraftBanner({ draft, onRestore, onDiscard }) {
  if (!draft) return null;

  return (
    <Alert
      tone="warning"
      title="Unsaved changes were found in this browser"
      icon={<Icon icon="mdi:history" width="20" height="20" />}
    >
      <p>
        A draft of this article was saved in this browser after the last time it reached the server.
        Restore it, or discard it and keep what is saved.
      </p>
      <div className={styles.draftActions}>
        <Button size="sm" onClick={onRestore}>
          Restore the draft
        </Button>
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          Discard it
        </Button>
      </div>
    </Alert>
  );
}

/**
 * "48 / 60 characters", coloured: muted while empty, positive inside the length
 * a search result prints, a warning outside it.
 *
 * Neither end is an error — a long title is truncated in the result, not
 * refused — so the counter never carries `role="alert"`. What it says while
 * empty is the caller's: the headline's counter used to borrow the SEO title's
 * "the site template is used instead", and a headline has no stand-in (QA-55).
 */
function Counter({ value, guide, max, empty }) {
  const length = String(value ?? '').length;
  const tone = length === 0 ? 'muted' : length >= guide.min && length <= guide.max ? 'ok' : 'warn';

  return (
    <span
      className={[styles.counter, TONE_CLASS[tone]].filter(Boolean).join(' ')}
      aria-live="polite"
    >
      <span>
        {length} / {max ?? guide.max} characters
      </span>
      <span>
        {tone === 'muted'
          ? empty
          : tone === 'ok'
            ? 'Inside the length a search result prints.'
            : length < guide.min
              ? `Short — aim for ${guide.min}–${guide.max}.`
              : `Long — a result cuts it near ${guide.max}.`}
      </span>
    </span>
  );
}

const TONE_CLASS = { ok: styles.counterOk, warn: styles.counterWarn, muted: '' };
