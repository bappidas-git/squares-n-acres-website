import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate, useParams } from 'react-router-dom';

import ApiError from '../../../services/apiError';
import BlockEditor from '../../../components/cms/BlockEditor/BlockEditor';
import PATHS, { RESERVED_PATH_PREFIXES, isReservedPath } from '../../../routes/paths';
import pageService from '../../../services/pageService';
import useApi from '../../../hooks/useApi';
import useForm from '../../../hooks/useForm';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';
import { useNavigationGuard } from '../../../contexts/NavigationGuardContext';
// The kit is imported file by file, in the order `MasterDataPage` reaches for
// the same components: the barrel's own order disagrees with it, and webpack
// then cannot give the extracted CSS one order across the admin chunks.
import { FormFieldControl } from '../../../components/admin/MasterDataForm';
import FormSection, { FormColumn } from '../../../components/admin/FormSection';
import SeoPanel from '../../../components/seo/SeoPanel';
import PageHeader from '../../../components/admin/PageHeader';
import SlugField from '../../../components/admin/SlugField';
import {
  Button,
  ErrorState,
  RadioGroup,
  SelectField,
  Skeleton,
  TextField,
} from '../../../components/ui';
import {
  FOOTER_COLUMNS,
  HEADER_MENUS,
  LEAD_SOURCES,
  PAGE_STATUS,
  PAGE_TEMPLATES,
} from '../../../config/enums';
import { validateBlockData } from '../../../components/cms/BlockEditor/blockSchemas';
import { applySeoSideEffects, validateSeoBranch } from '../../../components/seo/seoSideEffects';
import {
  createSeo,
  toSeoPaths,
  toSeoPayload,
  withSeoDefaults,
} from '../../../components/seo/seoValues';
import { resetNavPagesCache } from '../../../hooks/useNavPages';
import { schemas } from '../../../services/schemas';
import { slugifyPath } from '../../../utils/slug';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './PageFormPage.module.css';

/**
 * Admin → Pages → add / edit (`/admin/pages/add|edit/:id`).
 *
 * A page is a title, a URL, where it appears in the menus, and a stack of
 * blocks. The first three are an ordinary form; the fourth is `BlockEditor`,
 * which is why this is a screen rather than a dialog.
 *
 * **The URL is a path.** Alone among the site's records, a page's slug may
 * carry separators — `buyer-assistance/home-loan` is one slug, and the public
 * route serves the page at exactly that path (§6.10). `SlugField` is put in
 * `path` mode, which slugifies each segment and leaves the `/` alone, and a
 * slug whose first segment belongs to a static route is refused here rather
 * than silently shadowed on the site (D11).
 *
 * **Errors reach the block that caused them.** The API keys a 422 as
 * `blocks.3.data.items.0.title`; the same key is what `validateBlockData`
 * produces before a save is even attempted, so both end up on the same box,
 * and the card above it wears a badge saying how many of them it holds.
 */

/** A new page, at the values its controls read as empty. */
const BLANK = {
  title: '',
  slug: '',
  template: 'standard',
  status: 'draft',
  heroImageUrl: '',
  blocks: [],
  leadSource: '',
  order: 0,
  showInHeader: false,
  headerMenu: '',
  showInFooter: false,
  footerColumn: '',
  seo: createSeo(),
  updatedAt: null,
};

/** The record, reduced to what this form edits. */
const toFormValues = (record) => ({
  title: record.title ?? '',
  slug: record.slug ?? '',
  template: record.template ?? 'standard',
  status: record.status ?? 'draft',
  heroImageUrl: record.heroImageUrl ?? '',
  blocks: (Array.isArray(record.blocks) ? record.blocks : []).map((block, index) => ({
    id: block.id,
    type: block.type,
    order: block.order ?? index + 1,
    data: block.data ?? {},
  })),
  leadSource: record.leadSource ?? '',
  order: record.order ?? 0,
  showInHeader: Boolean(record.showInHeader),
  headerMenu: record.headerMenu ?? '',
  showInFooter: Boolean(record.showInFooter),
  footerColumn: record.footerColumn ?? '',
  // Every field of §9.6 present, whatever the record was saved with.
  seo: withSeoDefaults(record.seo),
  // Read-only, never sent back: the SEO panel prints it as "last modified".
  updatedAt: record.updatedAt ?? null,
});

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * What the SEO analysers call a field, and where it is on this screen.
 *
 * A page's body is its blocks, so "the body never uses the focus keyword"
 * scrolls to the block editor; everything else the engine can name about a page
 * is either the URL or a field of the panel itself.
 */
const FIELD_TARGET = { content: 'page-content', slug: 'page-slug', images: 'page-content' };

/** Brings the block a hint names into view, and focuses the first control in it. */
function focusField(path) {
  const element = document.getElementById(FIELD_TARGET[path] ?? '');
  if (!element) return;

  const control = element.querySelector('input, textarea, select, [contenteditable="true"]');
  control?.focus?.();
  element.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
}

/**
 * `SlugField`'s availability check, in the shape it hands over.
 *
 * Module level so its identity is stable: the field debounces on it, and a new
 * arrow on every render would ask the API after every keystroke of the title.
 */
const checkPageSlug = (slug, { excludeId, signal } = {}) =>
  pageService.checkSlug({ slug, excludeId }, { signal });

/**
 * The blocks as the API stores them (§5.5, §6.10).
 *
 * A block the editor added carries a `tmp-…` id, which is not the integer the
 * schema asks for. It is swapped for the next free number in the page's own
 * array — the server renumbers `order` anyway and keeps ids it is given, so the
 * numbering only has to be unique within the page.
 *
 * Exported for the unit test.
 *
 * @param {Array<object>} blocks
 * @returns {Array<object>}
 */
export function toBlockPayload(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  let highest = list.reduce(
    (max, block) => (Number.isInteger(block?.id) ? Math.max(max, block.id) : max),
    0
  );

  return list.map((block, index) => ({
    id: Number.isInteger(block.id) ? block.id : (highest += 1),
    type: block.type,
    order: index + 1,
    data: block.data ?? {},
  }));
}

export default function PageFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const {
    data: record,
    loading,
    error,
    refetch,
  } = useApi((signal) => pageService.adminGet(id, { signal }), [id], { enabled: isEdit });

  const [redirect, setRedirect] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  // "Publish" is a status change *and* a save. `setField` lands one render
  // later, so the save waits for the render that commits it rather than
  // building its payload from the status still on screen.
  const [publishing, setPublishing] = useState(false);

  const toPayload = useCallback(
    (values) => ({
      title: trimmed(values.title),
      slug: slugifyPath(values.slug ?? ''),
      template: values.template || 'standard',
      status: values.status || 'draft',
      heroImageUrl: values.heroImageUrl || null,
      blocks: toBlockPayload(values.blocks),
      leadSource: values.leadSource || null,
      order: Number(values.order) || 0,
      showInHeader: Boolean(values.showInHeader),
      headerMenu: values.showInHeader ? values.headerMenu || null : null,
      showInFooter: Boolean(values.showInFooter),
      footerColumn: values.showInFooter ? values.footerColumn || null : null,
      // D34: one URL — `seo.slug` always mirrors the page's own.
      seo: toSeoPayload(values.seo, slugifyPath(values.slug ?? '')),
    }),
    []
  );

  /**
   * The rules the descriptor cannot express: a title long enough to be one, a
   * URL nothing else already answers, and a menu placement that names its menu.
   */
  const extraValidation = useCallback(
    (values) => {
      const found = {};
      const title = trimmed(values.title);
      const slug = slugifyPath(values.slug ?? '');

      if (title.length > 0 && title.length < 3) {
        found.title = 'The title must be at least 3 characters.';
      }
      if (title.length > 120) found.title = 'The title may not be longer than 120 characters.';

      if (!slug) found.slug = 'The URL is required.';
      // A slug under a reserved prefix would be shadowed by the static route
      // that owns it, so the page would exist and never be reachable (D11).
      // An existing page already living there — the seeded awareness page — is
      // left alone: its route is spelled out, so it is not shadowed.
      else if (isReservedPath(slug) && slug !== record?.slug) {
        found.slug = `Reserved path — “${slug.split('/')[0]}” belongs to the site’s own pages.`;
      }

      if (values.showInHeader && !values.headerMenu) {
        found.headerMenu = 'Choose which header menu this page belongs to.';
      }
      if (values.showInFooter && !values.footerColumn) {
        found.footerColumn = 'Choose which footer column this page belongs to.';
      }

      // Every block, against its own schema, keyed exactly as a 422 would be.
      (Array.isArray(values.blocks) ? values.blocks : []).forEach((block, index) => {
        const messages = validateBlockData(block.type, block.data ?? {});
        for (const [key, message] of Object.entries(messages)) {
          found[`blocks.${index}.data.${key}`] = message;
        }
      });

      // The SEO panel's own two blockers: JSON-LD that would invalidate the
      // page's script tag, and a redirect with nowhere to send anybody.
      Object.assign(found, validateSeoBranch(values.seo));

      return found;
    },
    [record?.slug]
  );

  const form = useForm({
    initialValues: BLANK,
    schema: isEdit ? schemas['page.update'] : schemas['page.create'],
    validate: extraValidation,
    normalize: toPayload,
    onSubmit: async (payload) => {
      try {
        const envelope = isEdit
          ? await pageService.update(id, payload)
          : await pageService.create(payload);
        return envelope?.data ?? null;
      } catch (thrown) {
        throw await withSlugSuggestion(thrown, payload.slug, id);
      }
    },
  });

  const { reset, values, setField, errors } = form;

  useEffect(() => {
    if (!record) return;
    reset(toFormValues(record));
  }, [record, reset]);

  useUnsavedChanges(form.dirty);

  // Leaving after a save waits for the guard to let go, twice over — the same
  // dance `LocalityFormPage` documents: a saved form is clean, but the provider
  // and `useBlocker` each learn that one render later.
  const { isBlocking } = useNavigationGuard();
  useEffect(() => {
    if (!redirect || isBlocking) return undefined;
    const timer = setTimeout(() => navigate(redirect), 0);
    return () => clearTimeout(timer);
  }, [redirect, isBlocking, navigate]);

  // The second half of "Publish": the status is now `published` in state, so a
  // save builds the payload that says so. A refusal leaves the radio where the
  // editor can see what they were about to publish.
  const saveRef = useRef(null);
  useEffect(() => {
    if (!publishing || values.status !== 'published') return;
    setPublishing(false);
    saveRef.current?.();
  }, [publishing, values.status]);

  /**
   * `{ [blockId]: { field: message } }` — the flat error map, regrouped so that
   * each card can badge itself and each box inside it can find its own message.
   */
  const blockErrors = useMemo(() => {
    const grouped = {};
    const blocks = Array.isArray(values.blocks) ? values.blocks : [];

    for (const [key, message] of Object.entries(errors)) {
      const match = /^blocks\.(\d+)\.data\.(.+)$/.exec(key);
      if (!match) continue;
      const block = blocks[Number(match[1])];
      if (!block) continue;
      const blockId = String(block.id);
      grouped[blockId] = { ...grouped[blockId], [match[2]]: message };
    }

    return grouped;
  }, [errors, values.blocks]);

  const save = async (after = 'stay') => {
    const saved = await form.submit();
    if (!saved) return null;

    // The header and footer menus are built from the published pages and are
    // cached for the page load (D93).
    resetNavPagesCache();
    // The redirect this page's `seo` asks for, against the slug the API
    // answered with — a new page has none until now (§9.6).
    await applySeoSideEffects('page', saved);
    toast.success(isEdit ? 'Page saved.' : 'Page created.');

    if (after === 'view' && saved.slug) {
      setRedirect(PATHS.page(saved.slug));
      return saved;
    }
    if (!isEdit && saved.id) {
      setRedirect(PATHS.adminPageEdit(saved.id));
      return saved;
    }
    refetch();
    return saved;
  };

  saveRef.current = save;

  /** Save, then open the page in a new tab behind a 24-hour token (D28). */
  const saveAndPreview = async () => {
    setPreviewing(true);
    try {
      const saved = await save('stay');
      const pageId = saved?.id ?? id;
      if (!pageId) return;

      const { data } = await pageService.previewToken(pageId);
      const slug = saved?.slug ?? record?.slug ?? values.slug;
      window.open(`${PATHS.page(slug)}?preview=${data.token}`, '_blank', 'noopener,noreferrer');
    } catch (thrown) {
      toast.error(thrown?.message || 'The preview link could not be created.');
    } finally {
      setPreviewing(false);
    }
  };

  const publish = () => {
    setPublishing(true);
    setField('status', 'published');
  };

  const title = isEdit ? (record?.title ?? 'Edit page') : 'New page';
  const published = values.status === 'published';

  const actions = (
    <>
      <Button variant="ghost" to={PATHS.adminPages} disabled={form.submitting}>
        Cancel
      </Button>
      <Button
        variant="outline"
        onClick={saveAndPreview}
        loading={previewing}
        disabled={form.submitting}
        icon={<Icon icon="mdi:eye-outline" width="18" height="18" />}
      >
        Save &amp; preview
      </Button>
      {published ? null : (
        <Button variant="outline" onClick={publish} disabled={form.submitting}>
          Publish
        </Button>
      )}
      <Button onClick={() => save()} loading={form.submitting}>
        Save
      </Button>
    </>
  );

  if (isEdit && loading) {
    return (
      <>
        <PageHeader title="Edit page" />
        <div className={styles.loading} role="status" aria-busy="true" aria-live="polite">
          <span className={styles.srOnly}>Loading the page…</span>
          <FormSection title="Basics">
            <FormColumn half>
              <Skeleton variant="rounded" height={64} />
            </FormColumn>
            <FormColumn half>
              <Skeleton variant="rounded" height={64} />
            </FormColumn>
            <FormColumn>
              <Skeleton variant="rounded" height={320} />
            </FormColumn>
          </FormSection>
        </div>
      </>
    );
  }

  if (isEdit && (error || !record)) {
    return (
      <>
        <PageHeader title="Edit page" />
        <ErrorState
          title="We could not load this page"
          text={error?.message}
          onRetry={refetch}
          action={
            error?.status === 404 ? (
              <Button variant="outline" to={PATHS.adminPages}>
                Back to pages
              </Button>
            ) : undefined
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        breadcrumbs={[{ label: 'Pages', to: PATHS.adminPages }, { label: title }]}
        actions={<div className={styles.headerActions}>{actions}</div>}
      />

      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <FormSection title="Basics">
          <FormColumn half>
            <TextField
              label="Title"
              required
              maxLength={150}
              value={values.title ?? ''}
              error={errors.title}
              disabled={form.submitting}
              hint="The page’s heading and the name it carries in menus."
              onChange={(event) => setField('title', event.target.value)}
              onBlur={() => form.handleBlur('title')}
            />
          </FormColumn>
          <FormColumn half id="page-slug">
            <SlugField
              label="URL"
              required
              path
              base="/"
              value={values.slug ?? ''}
              source={values.title ?? ''}
              error={errors.slug}
              disabled={form.submitting}
              excludeId={id}
              checkSlug={checkPageSlug}
              onChange={(next) => setField('slug', next)}
            />
            <p className={styles.slugHint}>
              Slashes are allowed: <code>buyer-assistance/home-loan</code> is one page at that whole
              path. These first segments belong to the site itself and cannot be used:{' '}
              {RESERVED_PATH_PREFIXES.join(', ')}.
            </p>
          </FormColumn>

          <FormColumn half>
            <SelectField
              label="Template"
              required
              options={PAGE_TEMPLATES.options}
              value={values.template ?? 'standard'}
              error={errors.template}
              disabled={form.submitting}
              hint="A hint for later layout work; it does not change the blocks."
              onChange={(event) => setField('template', event.target.value)}
            />
          </FormColumn>
          <FormColumn half>
            <RadioGroup
              label="Status"
              options={PAGE_STATUS.options}
              value={values.status ?? 'draft'}
              error={errors.status}
              hint="A draft answers 404 to visitors; “Save &amp; preview” opens it anyway."
              onChange={(next) => setField('status', next)}
            />
          </FormColumn>

          <FormColumn>
            <FormFieldControl
              field={{
                name: 'heroImageUrl',
                type: 'image',
                label: 'Hero image',
                hint: 'hero',
              }}
              form={form}
              disabled={form.submitting}
            />
          </FormColumn>

          <FormColumn half>
            <SelectField
              label="Default lead source"
              options={[{ value: '', label: 'None' }, ...LEAD_SOURCES.options]}
              value={values.leadSource ?? ''}
              error={errors.leadSource}
              disabled={form.submitting}
              hint="What the page’s own buttons file enquiries as — the packages cards and any call-to-action block that does not name its own."
              onChange={(event) => setField('leadSource', event.target.value)}
            />
          </FormColumn>
        </FormSection>

        <FormSection
          title="Placement"
          description="Where this page appears in the site’s own navigation. A page left out of both is still reachable at its URL."
        >
          <FormColumn half>
            <FormFieldControl
              field={{
                name: 'showInHeader',
                type: 'switch',
                label: 'Show in the header menu',
              }}
              form={form}
              disabled={form.submitting}
            />
          </FormColumn>
          <FormColumn half>
            <SelectField
              label="Header menu"
              options={HEADER_MENUS.options}
              placeholder="Select a menu"
              value={values.headerMenu ?? ''}
              error={errors.headerMenu}
              disabled={form.submitting || !values.showInHeader}
              onChange={(event) => setField('headerMenu', event.target.value)}
            />
          </FormColumn>

          <FormColumn half>
            <FormFieldControl
              field={{
                name: 'showInFooter',
                type: 'switch',
                label: 'Show in the footer',
              }}
              form={form}
              disabled={form.submitting}
            />
          </FormColumn>
          <FormColumn half>
            <SelectField
              label="Footer column"
              options={FOOTER_COLUMNS.options}
              placeholder="Select a column"
              value={values.footerColumn ?? ''}
              error={errors.footerColumn}
              disabled={form.submitting || !values.showInFooter}
              onChange={(event) => setField('footerColumn', event.target.value)}
            />
          </FormColumn>

          <FormColumn half>
            <FormFieldControl
              field={{
                name: 'order',
                type: 'number',
                label: 'Order',
                min: 0,
                hint: 'Lower comes first, in both menus.',
              }}
              form={form}
              disabled={form.submitting}
            />
          </FormColumn>
        </FormSection>

        <FormSection
          title="Content"
          description="The bands the page is built from, in the order a visitor meets them."
        >
          <FormColumn id="page-content">
            <BlockEditor
              blocks={values.blocks ?? []}
              errors={blockErrors}
              disabled={form.submitting}
              onChange={(next) => setField('blocks', next)}
            />
          </FormColumn>
        </FormSection>

        <FormSection
          title="Search engines"
          description="The whole panel: the phrase this page targets, what a result prints, the share cards, the robots directives and the structured data (§9)."
        >
          <FormColumn>
            <SeoPanel
              entityType="page"
              entity={values}
              seo={values.seo}
              variant="full"
              errors={errors}
              disabled={form.submitting}
              excludeId={id}
              checkSlug={checkPageSlug}
              slugBase="/"
              onFocusField={focusField}
              onSlugChange={(slug) => setField('slug', slug)}
              onChange={(patch) => {
                // One dotted path at a time: `useForm.setField` composes on the
                // current values, so an edit and the analysis landing behind it
                // cannot overwrite each other.
                for (const [path, value] of Object.entries(toSeoPaths(patch))) {
                  setField(path, value);
                }
              }}
            />
          </FormColumn>
        </FormSection>

        <div className={styles.actionBar}>{actions}</div>
      </form>
    </>
  );
}

/**
 * The 409 of a duplicate slug, with the free variant to take.
 *
 * The API answers `{ message, errors: { slug } }` but no suggestion, and the
 * suggestion is the useful half — so it is fetched from `check-slug` and put in
 * front of the field that caused it (§5.9).
 */
async function withSlugSuggestion(thrown, slug, excludeId) {
  if (thrown?.status !== 409 || !slug) return thrown;

  try {
    const { data } = await pageService.checkSlug({ slug, excludeId });
    if (!data?.suggestion || data.suggestion === slug) return thrown;

    return new ApiError({
      status: thrown.status,
      message: thrown.message,
      data: thrown.data,
      original: thrown,
      errors: { ...thrown.errors, slug: [`${thrown.message} Try “${data.suggestion}”.`] },
    });
  } catch {
    // The suggestion is a nicety; the refusal is the answer.
    return thrown;
  }
}
