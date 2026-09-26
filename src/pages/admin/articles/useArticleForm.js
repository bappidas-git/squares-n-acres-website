import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ApiError from '../../../services/apiError';
import PATHS from '../../../routes/paths';
import articleService from '../../../services/articleService';
import openInNewTab from '../../../utils/openInNewTab';
import { DRAFT_PREVIEW_PARAM, stashDraftPreview } from '../../../utils/draftPreview';
import useForm from '../../../hooks/useForm';
import useLocalDraft from '../../../hooks/useLocalDraft';
import useStaleGuard, { isStaleWrite } from '../../../hooks/useStaleGuard';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';
import { URL_PATTERN } from '../../../utils/validation';
import {
  dateTimeLocalToIso,
  isFutureDateTime,
  plainText,
  readingTime,
  toDateTimeLocal,
  wordCount,
} from '../../../utils/articleUtils';
import redirectMoves, { describeMoves } from '../../../components/admin/redirectMoves';
import {
  applySeoSideEffects,
  redirectWarning,
  validateSeoBranch,
} from '../../../components/seo/seoSideEffects';
import { createSeo, toSeoPayload, withSeoDefaults } from '../../../components/seo/seoValues';
import {
  GOING_LIVE,
  PUBLISH_MIN_WORDS,
  RECOMMENDED_MIN_WORDS,
  publishProblems,
} from '../../../config/articleRules';
import { schemas } from '../../../services/schemas';
import { slugify } from '../../../utils/slug';
import { useNavigationGuard } from '../../../contexts/NavigationGuardContext';
import { useToast } from '../../../components/common/ToastProvider';

/** `sna_article_draft:<id|new>` — one draft per article, per browser (§4.2). */
export const draftKey = (articleId) => `sna_article_draft:${articleId ?? 'new'}`;

/**
 * The words an article needs to go live, and the length the rail recommends —
 * `config/articleRules`, which the API reads too (QA-55).
 */
export { PUBLISH_MIN_WORDS, RECOMMENDED_MIN_WORDS };

/** Two tags is the recommendation, not a rule. */
export const RECOMMENDED_TAGS = 2;

/** The length §6.8 gives a title and an excerpt. */
export const TITLE_MIN_LENGTH = 20;
export const TITLE_MAX_LENGTH = 100;
export const EXCERPT_MAX_LENGTH = 300;

/** The status each save button ends in; `save` keeps whatever is set. */
const STATUS_FOR_MODE = {
  draft: 'draft',
  publish: 'published',
  schedule: 'scheduled',
};

/**
 * What the messages call the fields whose keys are not words (QA-55): the
 * schema's "The categoryId field is required." reads "The category field is
 * required.", and the API's own 422s read the same way.
 */
const FIELD_LABELS = {
  title: 'headline',
  slug: 'URL',
  'seo.slug': 'URL',
  content: 'body',
  categoryId: 'category',
  authorId: 'author',
  'featuredImage.url': 'image address',
  'featuredImage.alt': 'alt text',
  'featuredImage.caption': 'caption',
  publishedAt: 'publication date',
  updatedAtDisplay: '"shown as updated" date',
  relatedArticleIds: 'related articles',
  relatedPropertyIds: 'related properties',
};

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '');

const idOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

/**
 * A list of ids, in the order given, with each one appearing once.
 *
 * `tagIds`, `relatedArticleIds` and `relatedPropertyIds` are sets whose order
 * matters, never bags: the same id twice would render the same chip twice and
 * the same card twice on the public page.
 */
const idList = (value) => {
  const ids = (Array.isArray(value) ? value : []).map(idOrNull).filter((entry) => entry !== null);
  return [...new Set(ids)];
};

/** A new article, at the values its controls read as empty. */
const BLANK = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featuredImage: { url: '', alt: '', caption: '' },
  categoryId: '',
  tagIds: [],
  authorId: '',
  status: 'draft',
  publishedAt: null,
  scheduledAt: '',
  updatedAtDisplay: null,
  updatedAt: null,
  updatedByName: null,
  isFeatured: false,
  allowComments: false,
  relatedArticleIds: [],
  relatedPropertyIds: [],
  faqs: [],
  tableOfContents: true,
  seo: createSeo(),
};

/**
 * The record, reduced to what this form edits.
 *
 * The whole `seo` branch travels with it even though the form shows three of
 * its fields: a `PUT` replaces the record (§5.8), so a partial `seo` object
 * would reset the keywords, the canonical, the social cards and the stored
 * analysis that prompt 36's panel owns.
 *
 * @param {object} record
 * @returns {object} form values
 */
export function toFormValues(record) {
  const faqs = Array.isArray(record.faqs) ? record.faqs : [];

  return {
    title: record.title ?? '',
    slug: record.slug ?? '',
    excerpt: record.excerpt ?? '',
    content: record.content ?? '',
    featuredImage: {
      url: record.featuredImage?.url ?? '',
      alt: record.featuredImage?.alt ?? '',
      caption: record.featuredImage?.caption ?? '',
    },
    categoryId: record.categoryId ?? '',
    tagIds: Array.isArray(record.tagIds) ? record.tagIds : [],
    authorId: record.authorId ?? '',
    status: record.status ?? 'draft',
    publishedAt: record.publishedAt ?? null,
    // The scheduling control speaks wall-clock IST; the record speaks UTC.
    scheduledAt: record.status === 'scheduled' ? toDateTimeLocal(record.publishedAt) : '',
    updatedAtDisplay: record.updatedAtDisplay ?? null,
    // Read-only, and never sent back: the SEO panel prints it as "last
    // modified", which is what the page reports as `dateModified` (§9.3).
    updatedAt: record.updatedAt ?? null,
    // Who saved it last — for the rail's "Last saved … by …" (prompt 51).
    updatedByName: record.updatedByName ?? null,
    isFeatured: record.isFeatured === true,
    allowComments: record.allowComments === true,
    relatedArticleIds: Array.isArray(record.relatedArticleIds) ? record.relatedArticleIds : [],
    relatedPropertyIds: Array.isArray(record.relatedPropertyIds) ? record.relatedPropertyIds : [],
    faqs: faqs.map((faq, index) => ({
      // A repeater may not key on the index (§4.3), and §6.8 gives a FAQ no id.
      _key: `faq-${index}`,
      question: faq?.question ?? '',
      answer: faq?.answer ?? '',
    })),
    tableOfContents: record.tableOfContents !== false,
    // Every field of §9.6 present, whatever the record was saved with: the
    // panel reads fifty of them and must never meet `undefined`.
    seo: withSeoDefaults(record.seo),
  };
}

/**
 * The publication moment a set of values means (§6.8).
 *
 * A scheduled article is published at the moment its field names. Everything
 * else keeps the moment it already went live at — which is why unpublishing and
 * republishing does not move the date — but only if that moment has arrived: a
 * scheduled article demoted to a draft must not carry a future date into a
 * "published" save, because the public site reads the date and not the word
 * (`isLive` in `mock-server/lib/articleFilters.js`).
 *
 * @param {object} values
 * @param {number} [now]
 * @returns {string|null} an ISO-8601 instant, or `null` for "let the API stamp it"
 */
export function publishedAtOf(values, now = Date.now()) {
  if (values.status === 'scheduled') return dateTimeLocalToIso(values.scheduledAt);

  const stored = values.publishedAt ? Date.parse(values.publishedAt) : NaN;
  return Number.isFinite(stored) && stored <= now ? values.publishedAt : null;
}

/**
 * The body the API receives (§5.5, §6.8).
 *
 * `contentText`, `wordCount`, `readingTimeMinutes` and `viewCount` are absent
 * on purpose: the API derives them from the content and ignores them if sent.
 *
 * @param {object} values
 * @returns {object}
 */
export function toPayload(values) {
  const slug = slugify(values.slug ?? '');
  const url = trimmed(values.featuredImage?.url);

  return {
    title: trimmed(values.title),
    slug,
    excerpt: trimmed(values.excerpt),
    content: values.content ?? '',
    featuredImage: url
      ? {
          url,
          alt: trimmed(values.featuredImage?.alt),
          caption: trimmed(values.featuredImage?.caption) || null,
        }
      : null,
    categoryId: idOrNull(values.categoryId),
    tagIds: idList(values.tagIds),
    authorId: idOrNull(values.authorId),
    status: values.status || 'draft',
    publishedAt: publishedAtOf(values),
    updatedAtDisplay: values.updatedAtDisplay ?? null,
    isFeatured: values.isFeatured === true,
    allowComments: values.allowComments === true,
    relatedArticleIds: idList(values.relatedArticleIds),
    relatedPropertyIds: idList(values.relatedPropertyIds),
    faqs: (Array.isArray(values.faqs) ? values.faqs : []).map((faq) => ({
      question: trimmed(faq.question),
      answer: faq.answer ?? '',
    })),
    tableOfContents: values.tableOfContents !== false,
    // The slug and `seo.slug` are one URL (D34).
    seo: toSeoPayload(values.seo, slug),
  };
}

/**
 * What "Preview changes" hands a published article's public page (prompt 51):
 * the stored article with the form over it — its words, its picture, its FAQs,
 * and the category, author and tags the form now names — in the shape
 * `GET /articles/slug/:slug` answers, so the page renders it as it would the
 * saved one. The status and the address stay the stored ones: the preview is
 * of the live page.
 *
 * @param {object} record the stored article
 * @param {object} values the form
 * @param {{categories?: Array<object>, authors?: Array<object>, tags?: Array<object>}} [lookup]
 * @returns {object}
 */
export function draftArticleRecord(record, values, lookup = {}) {
  const payload = toPayload(values);
  const find = (rows, id) =>
    (Array.isArray(rows) ? rows : []).find((row) => String(row.id) === String(id)) ?? null;
  const words = wordCount(payload.content);
  const same = (left, right) => String(left ?? '') === String(right ?? '');

  return {
    ...record,
    ...payload,
    status: record.status,
    slug: record.slug,
    publishedAt: record.publishedAt,
    category: same(payload.categoryId, record.categoryId)
      ? (record.category ?? null)
      : find(lookup.categories, payload.categoryId),
    author: same(payload.authorId, record.authorId)
      ? (record.author ?? null)
      : find(lookup.authors, payload.authorId),
    tags: payload.tagIds
      .map(
        (id) => (record.tags ?? []).find((tag) => same(tag.id, id)) ?? find(lookup.tags, id) ?? null
      )
      .filter(Boolean),
    faqs: payload.faqs.filter((faq) => faq.question && plainText(faq.answer)),
    wordCount: words,
    readingTimeMinutes: readingTime(words),
    seo: { ...(record.seo ?? {}), ...payload.seo, slug: record.slug },
  };
}

/**
 * Everything the rail's "Content checks" card lists — the rules a publish must
 * satisfy and the three recommendations it need not.
 *
 * The full analysis lives in the SEO panel on the form's second tab; these six
 * are what an editor can act on without leaving the Content tab.
 *
 * @param {object} values
 * @param {number} words the body's word count
 * @returns {Array<{id: string, label: string, done: boolean, required: boolean, hint?: string}>}
 */
export function contentChecks(values, words) {
  const url = trimmed(values.featuredImage?.url);
  const tags = Array.isArray(values.tagIds) ? values.tagIds : [];
  const faqs = (Array.isArray(values.faqs) ? values.faqs : []).filter((faq) =>
    trimmed(faq.question)
  );

  return [
    {
      id: 'words',
      label: `${words} words in the body`,
      done: words >= PUBLISH_MIN_WORDS,
      required: true,
      hint:
        words >= PUBLISH_MIN_WORDS && words < RECOMMENDED_MIN_WORDS
          ? `Publishable. ${RECOMMENDED_MIN_WORDS} words or more tends to rank better.`
          : words < PUBLISH_MIN_WORDS
            ? `${PUBLISH_MIN_WORDS} words are needed to publish.`
            : undefined,
    },
    {
      id: 'excerpt',
      label: 'Excerpt written',
      done: trimmed(values.excerpt) !== '',
      required: true,
    },
    {
      id: 'image',
      label: 'Featured image with alt text',
      done: url !== '' && trimmed(values.featuredImage?.alt) !== '',
      required: true,
    },
    {
      id: 'category',
      label: 'Category chosen',
      done: idOrNull(values.categoryId) !== null,
      required: true,
    },
    {
      id: 'author',
      label: 'Author chosen',
      done: idOrNull(values.authorId) !== null,
      required: true,
    },
    {
      id: 'tags',
      label: `${tags.length} ${tags.length === 1 ? 'tag' : 'tags'}`,
      done: tags.length >= RECOMMENDED_TAGS,
      required: false,
      hint: 'Two or more tags give the archive something to group this by.',
    },
    {
      id: 'faqs',
      label: `${faqs.length} FAQ ${faqs.length === 1 ? 'item' : 'items'}`,
      done: faqs.length > 0,
      required: false,
      hint: 'FAQ items become FAQ structured data on the public page.',
    },
  ];
}

/**
 * The article form: one `useForm`, the publish rules, the ten-second draft and
 * the four saves (00_MASTER_CONTEXT.md §6.8, §5.8, ART-06…ART-08).
 *
 * The page owns the fetch — it needs the four states of §8.2 — and hands the
 * record here; everything that happens to it afterwards happens in this hook,
 * so the main column, the rail and the FAQ repeater all read one state.
 *
 *   const form = useArticleForm({ articleId: id, record, readOnly: !canEdit });
 *
 * @param {object} options
 * @param {number|string|null} [options.articleId] absent for a new article
 * @param {object|null} [options.record] the record `GET /admin/articles/:id` returned
 * @param {boolean} [options.readOnly] no writes, no autosave (§7)
 */
export default function useArticleForm({
  articleId = null,
  record = null,
  readOnly = false,
  canRedirect = false,
} = {}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { isBlocking } = useNavigationGuard();

  const isNew = !articleId;

  // A published article whose address changes leaves a 301 behind, on by
  // default (prompt 51) — what a page, a locality and a developer already did.
  const [redirectOld, setRedirectOld] = useState(true);
  const redirectRef = useRef({ redirectOld, canRedirect });
  redirectRef.current = { redirectOld, canRedirect };

  const [redirect, setRedirect] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  // The article as last read or saved: the load, then the answer to each save
  // and to "Load their version". The prop is the first read only — after a
  // save it no longer said what the article was, and the status a save starts
  // from, the live address and the version check all read this.
  const [stored, setStored] = useState(record);
  // A save made from an older version is refused, and answered with a dialog
  // rather than written over somebody else's (prompt 51).
  const guard = useStaleGuard({ storedAt: stored?.updatedAt ?? null });
  const {
    adopt: adoptVersion,
    current: currentVersion,
    dismiss: dismissConflict,
    onError: onSaveError,
    overwrite,
    reload,
    stamp,
  } = guard;
  // The mode of the save the dialog is about, for "Save mine anyway".
  const lastMode = useRef('save');
  // A save that also changes the status needs the render that commits the new
  // status before it can build a payload that says so.
  const [pending, setPending] = useState(null);

  /** The editor's own live counters, for the character figure in the rail. */
  const editorRef = useRef(null);

  /**
   * The rules the schema cannot express (§5.3 keys them the way a 422 does).
   *
   * The publish rules apply to both states that put an article in front of a
   * visitor: a scheduled article is a published one with a date on it.
   */
  const extraValidation = useCallback((values) => {
    const found = {};
    const title = trimmed(values.title);
    const slug = slugify(values.slug ?? '');
    const words = wordCount(values.content);
    const goingLive = GOING_LIVE.includes(values.status);

    if (title !== '' && title.length < TITLE_MIN_LENGTH) {
      found.title = `The headline must be at least ${TITLE_MIN_LENGTH} characters — headlines shorter than that rarely say what the piece is about.`;
    }
    if (!slug) found.slug = 'The URL is required.';

    // The schema's "must be a valid URL" says what is wrong but not what is
    // right; a picture address pasted without its scheme is the usual case.
    const imageUrl = trimmed(values.featuredImage?.url);
    if (imageUrl && !URL_PATTERN.test(imageUrl)) {
      found['featuredImage.url'] = 'The image address must start with http:// or https://.';
    }

    if (values.status === 'scheduled') {
      if (!trimmed(values.scheduledAt)) {
        found.scheduledAt = 'Choose the date and time this article should appear.';
      } else if (!isFutureDateTime(values.scheduledAt)) {
        found.scheduledAt = 'A scheduled article needs a date and time in the future.';
      }
    }

    // Alt text is required whenever there is an image, published or not: the
    // page cannot describe a picture it was given no words for (§8.3).
    if (trimmed(values.featuredImage?.url) && !trimmed(values.featuredImage?.alt)) {
      found['featuredImage.alt'] = 'Alt text is required — describe the image in a few words.';
    }

    // The rules the API applies too (`config/articleRules`, QA-55), in the
    // same words, so a refusal reads the same from either side.
    if (goingLive) Object.assign(found, publishProblems(values, words));

    (Array.isArray(values.faqs) ? values.faqs : []).forEach((faq, index) => {
      const question = trimmed(faq.question);
      const answer = plainText(faq.answer);
      if (!question) found[`faqs.${index}.question`] = 'Write the question, or remove this row.';
      if (!answer) found[`faqs.${index}.answer`] = 'Write the answer, or remove this row.';
    });

    // The SEO panel's own blockers: JSON-LD that would invalidate the page's
    // script tag, a redirect with nowhere to send anybody, and an address past
    // 500 characters.
    Object.assign(found, validateSeoBranch(values.seo));

    return found;
  }, []);

  const form = useForm({
    initialValues: BLANK,
    schema: isNew ? schemas['article.create'] : schemas['article.update'],
    validate: extraValidation,
    normalize: toPayload,
    labels: FIELD_LABELS,
    onSubmit: async (payload) => {
      try {
        const envelope = articleId
          ? await articleService.update(articleId, stamp(payload))
          : await articleService.create(payload);
        return envelope?.data ?? null;
      } catch (thrown) {
        throw await withSlugSuggestion(thrown, payload.slug, articleId);
      }
    },
    onError: onSaveError,
  });

  const {
    errors,
    handleBlur,
    reset,
    setErrors,
    setField: setFormField,
    setValues,
    submit,
    validateAll,
    values,
  } = form;

  // A copy of the form in this browser — every ten seconds, and on the way out
  // unless the editor discarded it — offered back when it is newer than the
  // stored article (`useLocalDraft`, prompt 51: the close and session-end
  // write the article form lacked).
  const {
    offer: draftOffer,
    savedAt: draftSavedAt,
    changed: draftChanged,
    take: takeDraft,
    dismiss: discardDraft,
    clear: clearDraft,
    forget: forgetDraft,
    put: putDraft,
  } = useLocalDraft({
    key: draftKey(articleId),
    values,
    dirty: form.dirty,
    enabled: !readOnly,
    ready: !articleId || Boolean(record),
    storedAt: record?.updatedAt ?? null,
    version: currentVersion,
    paused: form.submitting,
  });

  // Read by the callbacks without becoming dependencies of them: a save must
  // see the values of the moment it runs, not of the render that created it.
  const latest = useRef({});
  latest.current = {
    values,
    articleId,
    readOnly,
    isNew,
    record: stored,
    dirty: form.dirty,
    baseline: form.baseline,
    offer: draftOffer,
  };

  /**
   * `useForm.setField`, plus the one error it cannot know to clear: the slug
   * and `seo.slug` are one URL (D34), so a 422 on either is answered by typing
   * in the one box — and "The seo.slug may only contain lowercase letters"
   * stayed under a slug that had long been fixed, hiding "This URL is
   * available" (QA-55).
   */
  const setField = useCallback(
    (path, value) => {
      setFormField(path, value);
      if (path === 'slug' || path === 'seo.slug') {
        setErrors((current) =>
          current.slug === undefined && current['seo.slug'] === undefined
            ? current
            : omitKeys(current, ['slug', 'seo.slug'])
        );
      }
    },
    [setErrors, setFormField]
  );

  // A copy autosaved to this browser is for a crash, a reload or a closed tab.
  // Changes the editor chose to discard are not worth offering back next time
  // (QA-55) — and none is written on the way out.
  useUnsavedChanges(form.dirty && !readOnly, { onDiscard: forgetDraft });

  /* ---------------------------------------------------------------- *
   * Loading
   * ---------------------------------------------------------------- */

  // A record is loaded once. A refetch that brings back the same version must
  // not overwrite what the editor has typed since.
  const loadedStamp = useRef(null);
  useEffect(() => {
    if (!record) return;
    const loaded = `${record.id}:${record.updatedAt ?? ''}`;
    if (loadedStamp.current === loaded) return;
    loadedStamp.current = loaded;
    setStored(record);
    reset(toFormValues(record));
  }, [record, reset]);

  /* ---------------------------------------------------------------- *
   * The draft
   * ---------------------------------------------------------------- */

  const restoreDraft = useCallback(() => {
    const offer = takeDraft();
    if (!offer?.values) return;
    setValues(offer.values);
    // A copy made from an older version is saved against that version: over a
    // newer save it is refused rather than written back over it.
    adoptVersion(offer.version);
  }, [adoptVersion, setValues, takeDraft]);

  /* ---------------------------------------------------------------- *
   * Saving
   * ---------------------------------------------------------------- */

  const runSave = useCallback(
    async (mode) => {
      const current = latest.current;
      if (current.readOnly) return false;

      if (!validateAll()) {
        // "What is missing is listed under Content checks" only when that is
        // where it is listed: a scheduled date in the past is not (QA-55).
        const words = wordCount(current.values.content);
        const refusedToGoLive =
          GOING_LIVE.includes(current.values.status) &&
          Object.keys(publishProblems(current.values, words)).length > 0;
        toast.error(
          refusedToGoLive
            ? 'This article is not ready to go live. What is missing is listed under “Content checks”.'
            : 'Please fix the highlighted fields.'
        );
        return false;
      }

      // Nothing has changed since the last save: say so rather than write the
      // same record again — a rewrite moved it to the top of the list and
      // changed the date its sitemap entry reports (QA-55). A stored record
      // that breaks a rule still hears about it above: its errors are shown
      // whether or not anything was typed.
      //
      // What is on screen is what is stored, so a copy autosaved before an
      // edit was taken back is out of date — unless it is the one on offer,
      // which waits for the editor's own answer.
      if (mode === 'save' && !current.isNew && !current.dirty && current.record) {
        if (!current.offer) clearDraft();
        toast.info('No changes to save.');
        return current.record;
      }

      const before = current.record?.status ?? null;
      // The address a published article is leaving, when the editor keeps the 301.
      const liveSlug = before === 'published' ? (current.record?.slug ?? null) : null;
      lastMode.current = mode;
      const saved = await submit();
      if (!saved) return false;

      clearDraft();
      setStored(saved);
      adoptVersion(saved.updatedAt ?? null);
      reset(toFormValues(saved));

      // The redirect this article's `seo` asks for is written against the slug
      // the API answered with — a new article has none until now (§9.6). It
      // comes after the draft is cleared: the article is saved either way, and
      // a side effect must not hold up the state that says so.
      const effects = await applySeoSideEffects('article', saved);
      if (effects.ok) toast.success(savedMessage(saved, before));
      else toast.warning(redirectWarning(effects.error));

      // The old address sends its readers on (prompt 51); a rule that cannot
      // be written is said, not swallowed.
      const { canRedirect: mayRedirect, redirectOld: keepOld } = redirectRef.current;
      if (liveSlug && saved.slug && saved.slug !== liveSlug && mayRedirect && keepOld) {
        const moved = describeMoves(
          await redirectMoves(
            [[PATHS.article(liveSlug), PATHS.article(saved.slug)]],
            `“${saved.title}” moved (Admin → Articles).`
          )
        );
        if (moved.error) toast.error(moved.error);
        else if (moved.info) toast.info(moved.info);
      }

      // A created article moves to its own URL, replacing the add route so Back
      // does not offer to create it a second time.
      if (!current.articleId && saved.id) {
        setRedirect({ to: PATHS.adminArticleEdit(saved.id), replace: true });
      }
      return saved;
    },
    [adoptVersion, clearDraft, reset, submit, toast, validateAll]
  );

  const runSaveRef = useRef(runSave);
  runSaveRef.current = runSave;

  /**
   * Saves the article.
   *
   * @param {'save'|'draft'|'publish'|'schedule'} [mode]
   *   `save` keeps whatever status is set; the other three move it first, which
   *   is what makes "Publish" validate the publish rules rather than the draft
   *   ones.
   * @returns {Promise<object|false>|undefined} the saved record; `undefined`
   *   when the status had to change first and the effect below completes it
   */
  const save = useCallback(
    (mode = 'save') => {
      if (latest.current.readOnly) return false;

      const target = STATUS_FOR_MODE[mode];
      if (target && target !== latest.current.values.status) {
        setPending({ mode, from: latest.current.values.status });
        setField('status', target);
        return undefined;
      }
      return runSaveRef.current(mode);
    },
    [setField]
  );

  // The second half of a status-changing save: the status is now in state, so
  // the payload says so and the validation reads the new rules.
  //
  // A refusal puts the status back. "Publish now" is a button, not a choice of
  // radio: left on "Published" after a refusal, the rail said "Live now" over
  // a draft, "Publish now" was gone, and the plain Save that followed a fix
  // published the article (QA-55). What was wrong stays highlighted.
  useEffect(() => {
    if (!pending) return;
    const target = STATUS_FOR_MODE[pending.mode];
    if (values.status !== target) return;
    setPending(null);
    Promise.resolve(runSaveRef.current(pending.mode)).then((saved) => {
      if (!saved && latest.current.values.status === target) {
        setField('status', pending.from);
      }
    });
  }, [pending, setField, values.status]);

  // Ctrl/Cmd+S saves rather than offering to save the HTML of the page.
  //
  // Every button that saves is `disabled` while a save is in flight; the
  // keyboard is not, so the shortcut has to refuse a second one itself.
  // Otherwise a held Ctrl+S on a new article is several `POST`s and several
  // articles — the auto-repeat is the same reason `event.repeat` is checked.
  const saveRef = useRef(save);
  saveRef.current = save;
  const busyRef = useRef(false);
  busyRef.current = form.submitting || pending !== null;

  useEffect(() => {
    if (readOnly) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== 's' && event.key !== 'S') return;
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.altKey || event.shiftKey) return;
      event.preventDefault();
      if (event.repeat || busyRef.current) return;
      // A dialog open over the form — a category being added, a link being
      // edited — is where the keys belong; the article behind it is not saved
      // from inside it (QA-55).
      if (event.target?.closest?.('[role="dialog"], [aria-modal="true"]')) return;
      saveRef.current('save');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [readOnly]);

  /* ---------------------------------------------------------------- *
   * A save made over somebody else's (prompt 51)
   * ---------------------------------------------------------------- */

  /**
   * "Save mine anyway": the same save again, over the version the refusal
   * named — so a third save made meanwhile is still refused.
   */
  const overwriteConflict = useCallback(
    () => overwrite(() => saveRef.current(lastMode.current)),
    [overwrite]
  );

  /**
   * "Load their version": the article as it now stands, with this editor's
   * edits kept as the draft the banner offers back, replayed on top of it.
   */
  const reloadConflict = useCallback(
    () =>
      reload({
        fetchLatest: () => articleService.adminGet(latest.current.articleId),
        toValues: toFormValues,
        form: { baseline: latest.current.baseline, values: latest.current.values },
        draft: { put: putDraft },
        load: (fresh) => {
          setStored(fresh);
          reset(toFormValues(fresh));
        },
      }),
    [putDraft, reload, reset]
  );

  /**
   * Save, then open the article in a new tab behind a 24-hour token (D28).
   *
   * The token is what the public route checks, so the link is built on this
   * origin rather than on the absolute URL the API suggests, and on the slug
   * the save answered with — the API may have changed it.
   *
   * Only a tab the browser genuinely refused becomes a navigation in this one
   * (`openInNewTab`): every preview used to take the editor's own tab to the
   * public page as well (QA-55). A new article keeps its move to its own edit
   * URL instead, and is told where the preview is.
   */
  const preview = useCallback(async () => {
    setPreviewing(true);
    try {
      const current = latest.current;
      let id = current.articleId;
      let slug = current.values.slug || current.record?.slug || '';

      if (!id || current.dirty) {
        const saved = await runSaveRef.current('save');
        if (!saved) return;
        id = saved.id;
        slug = saved.slug || slug;
      }

      const { data } = await articleService.previewToken(id);
      const path = `${PATHS.article(slug)}?preview=${data.token}`;
      if (openInNewTab(path)) return;
      if (current.articleId) setRedirect({ to: path, replace: false });
      else toast.info(`Your browser blocked the new tab. The preview is at ${path}`);
    } catch (thrown) {
      toast.error(thrown?.message || 'The preview link could not be created.');
    } finally {
      setPreviewing(false);
    }
  }, [toast]);

  /**
   * "Preview changes" on a published article (prompt 51): the form as it
   * stands, shown on the live page in a new tab — handed over through this
   * browser's storage, never saved, never sent to the API. Visitors keep
   * seeing the saved article; the link opens once, here.
   *
   * @param {{categories?: Array<object>, authors?: Array<object>, tags?: Array<object>}} [lookup]
   *   what the form's selects name, for the category, author and tags it now points at
   * @returns {boolean} whether the preview opened
   */
  const previewChanges = useCallback(
    (lookup) => {
      const current = latest.current;
      const stored = current.record;
      if (!stored?.slug) return false;
      const id = stashDraftPreview(
        'article',
        draftArticleRecord(stored, current.values, lookup ?? {})
      );
      if (!id) {
        toast.error('This browser keeps nothing for the page to read — save to see the changes.');
        return false;
      }
      const path = `${PATHS.article(stored.slug)}?${DRAFT_PREVIEW_PARAM}=${encodeURIComponent(id)}`;
      if (openInNewTab(path)) return true;
      toast.info(`Your browser blocked the new tab. The preview is at ${path} — it opens once.`);
      return false;
    },
    [toast]
  );

  // Leaving waits for the guard to let go, twice over: a saved form is clean,
  // but the provider learns that one render later and `useBlocker`
  // re-registers the question in an effect of its own.
  useEffect(() => {
    if (!redirect || isBlocking) return undefined;
    const timer = setTimeout(() => navigate(redirect.to, { replace: redirect.replace }), 0);
    return () => clearTimeout(timer);
  }, [redirect, isBlocking, navigate]);

  /* ---------------------------------------------------------------- *
   * The FAQ repeater
   * ---------------------------------------------------------------- */

  const keyCounter = useRef(0);

  /**
   * The row errors, moved with their rows (QA-55).
   *
   * A 422 keys a question by its position — `faqs.2.answer` — and the rows
   * are keyed by identity, so removing or moving one used to leave its errors
   * on whichever row took its place: the filled-in question under a removed
   * empty one read "Write the question, or remove this row."
   *
   * @param {(index: number) => number|null} place where the row at `index`
   *   now is, or `null` when it is gone
   */
  const moveFaqErrors = useCallback(
    (place) =>
      setErrors((current) => {
        let changed = false;
        const next = {};
        for (const [key, message] of Object.entries(current)) {
          const match = /^faqs\.(\d+)\.(.+)$/.exec(key);
          if (!match) {
            next[key] = message;
            continue;
          }
          const to = place(Number(match[1]));
          if (to !== Number(match[1])) changed = true;
          if (to !== null) next[`faqs.${to}.${match[2]}`] = message;
        }
        return changed ? next : current;
      }),
    [setErrors]
  );

  const addFaq = useCallback(() => {
    keyCounter.current += 1;
    setField('faqs', [
      ...(latest.current.values.faqs ?? []),
      { _key: `new-${keyCounter.current}`, question: '', answer: '' },
    ]);
  }, [setField]);

  const updateFaq = useCallback(
    (key, patch) => {
      const list = latest.current.values.faqs ?? [];
      const index = list.findIndex((faq) => faq._key === key);
      setField(
        'faqs',
        list.map((faq) => (faq._key === key ? { ...faq, ...patch } : faq))
      );
      // The row being corrected stops shouting, as every other field does.
      if (index >= 0) {
        setErrors((current) => {
          const stale = Object.keys(patch).map((field) => `faqs.${index}.${field}`);
          return stale.some((path) => current[path] !== undefined)
            ? omitKeys(current, stale)
            : current;
        });
      }
    },
    [setErrors, setField]
  );

  const removeFaq = useCallback(
    (key) => {
      const list = latest.current.values.faqs ?? [];
      const removed = list.findIndex((faq) => faq._key === key);
      setField(
        'faqs',
        list.filter((faq) => faq._key !== key)
      );
      if (removed >= 0) {
        moveFaqErrors((index) => (index === removed ? null : index > removed ? index - 1 : index));
      }
    },
    [moveFaqErrors, setField]
  );

  const moveFaq = useCallback(
    (from, to) => {
      const list = [...(latest.current.values.faqs ?? [])];
      const [moved] = list.splice(from, 1);
      if (!moved) return;
      list.splice(to, 0, moved);
      setField('faqs', list);
      moveFaqErrors((index) => {
        if (index === from) return to;
        if (from < to && index > from && index <= to) return index - 1;
        if (from > to && index >= to && index < from) return index + 1;
        return index;
      });
    },
    [moveFaqErrors, setField]
  );

  /* ---------------------------------------------------------------- *
   * Derived
   * ---------------------------------------------------------------- */

  /**
   * The body's own numbers.
   *
   * The word count is taken from the stored HTML rather than from the editor,
   * because it is the number the publish rule is decided on and the number the
   * API will derive from the same string; the editor's live counter is asked for
   * the character figure, which nothing else knows.
   */
  const stats = useMemo(() => {
    const words = wordCount(values.content);
    const live = editorRef.current?.getStats?.();
    return {
      words,
      characters: live?.characters ?? plainText(values.content).length,
      readingTime: readingTime(words),
    };
  }, [values.content]);

  const checks = useMemo(() => contentChecks(values, stats.words), [values, stats.words]);

  /** What the primary button does, given the status on screen. */
  const primaryMode = useMemo(() => {
    if (values.status === 'scheduled') return 'schedule';
    if (values.status === 'published') return 'publish';
    return 'save';
  }, [values.status]);

  return {
    form,
    values,
    errors,
    setField,
    // The SEO panel's analysis writes its own score back; `setComputed` keeps
    // that out of `dirty`, so opening the SEO tab does not make an untouched
    // article claim to have unsaved changes.
    setComputed: form.setComputed,
    setValues,
    handleBlur,
    dirty: form.dirty,
    saving: form.submitting || pending !== null,
    previewing,
    readOnly,
    isNew,
    articleId,
    editorRef,
    stats,
    checks,
    primaryMode,
    save,
    preview,
    previewChanges,
    addFaq,
    updateFaq,
    removeFaq,
    moveFaq,
    draftOffer,
    draftSavedAt,
    // Whether the form holds anything the last autosave did not write — not
    // whether it differs from the server, which it always does while there is
    // a draft at all (QA-55).
    draftChanged,
    record: stored,
    restoreDraft,
    discardDraft,
    clearDraft,
    conflict: guard.conflict,
    conflictBusy: guard.busy,
    dismissConflict,
    overwriteConflict,
    reloadConflict,
    publicPath: values.slug ? PATHS.article(values.slug) : null,
    /**
     * A published article's address about to change (prompt 51): where it is
     * live now, and whether saving leaves a 301 behind.
     */
    slugMove: {
      livePath: stored?.status === 'published' && stored?.slug ? PATHS.article(stored.slug) : null,
      moved:
        Boolean(articleId) &&
        stored?.status === 'published' &&
        Boolean(stored?.slug) &&
        slugify(values.slug ?? '') !== '' &&
        slugify(values.slug ?? '') !== stored.slug,
      canRedirect,
      redirect: redirectOld,
      setRedirect: setRedirectOld,
    },
  };
}

/**
 * What a save says it did — which is not always what the article now is: a
 * plain Save on a live article used to announce "Article published." (QA-55).
 *
 * @param {object} saved the record the API returned
 * @param {string|null} before the status the article had before this save;
 *   `null` for one that did not exist yet
 * @returns {string}
 */
export function savedMessage(saved, before) {
  const status = saved?.status ?? 'draft';
  const kept = status === before;

  if (status === 'scheduled') {
    return kept ? 'Changes saved. The article is still scheduled.' : 'Article scheduled.';
  }
  if (status === 'published') {
    return kept ? 'Changes saved. The article is live.' : 'Article published.';
  }
  if (status === 'archived') return kept ? 'Changes saved.' : 'Article archived.';
  if (before === 'published' || before === 'scheduled') {
    return 'Article unpublished and saved as a draft.';
  }
  return 'Article saved as a draft.';
}

/** A copy of an object without the keys given. */
function omitKeys(source, keys) {
  return Object.fromEntries(Object.entries(source).filter(([key]) => !keys.includes(key)));
}

/**
 * The 409 of a duplicate slug, with the free variant to take.
 *
 * The API answers `{ message, errors: { slug } }` but no suggestion, and the
 * suggestion is the useful half — so it is fetched from `check-slug` and put in
 * front of the field that caused it (§5.9).
 */
async function withSlugSuggestion(thrown, slug, excludeId) {
  if (thrown?.status !== 409 || !slug || isStaleWrite(thrown)) return thrown;

  try {
    const { data } = await articleService.checkSlug({ slug, excludeId });
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
