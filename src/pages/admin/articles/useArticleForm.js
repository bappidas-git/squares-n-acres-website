import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ApiError from '../../../services/apiError';
import PATHS from '../../../routes/paths';
import articleService from '../../../services/articleService';
import storage from '../../../utils/storage';
import useForm from '../../../hooks/useForm';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';
import {
  dateTimeLocalToIso,
  isFutureDateTime,
  plainText,
  readingTime,
  toDateTimeLocal,
  wordCount,
} from '../../../utils/articleUtils';
import { applySeoSideEffects, validateSeoBranch } from '../../../components/seo/seoSideEffects';
import { createSeo, toSeoPayload, withSeoDefaults } from '../../../components/seo/seoValues';
import { schemas } from '../../../services/schemas';
import { slugify } from '../../../utils/slug';
import { useNavigationGuard } from '../../../contexts/NavigationGuardContext';
import { useToast } from '../../../components/common/ToastProvider';

/** How often a dirty form writes its draft to this browser (§4.2, prompt 18). */
export const AUTOSAVE_INTERVAL_MS = 10000;

/** `sna_article_draft:<id|new>` — one draft per article, per browser (§4.2). */
export const draftKey = (articleId) => `sna_article_draft:${articleId ?? 'new'}`;

/** An article needs this many words before it may be published (§2 of this prompt). */
export const PUBLISH_MIN_WORDS = 300;

/** Below this the rail says so, but the save goes through. */
export const RECOMMENDED_MIN_WORDS = 600;

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

/** The two states whose article the public site will show (§6.8). */
const GOING_LIVE = ['published', 'scheduled'];

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
export default function useArticleForm({ articleId = null, record = null, readOnly = false } = {}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { isBlocking } = useNavigationGuard();

  const isNew = !articleId;

  const [draftOffer, setDraftOffer] = useState(null);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [redirect, setRedirect] = useState(null);
  const [previewing, setPreviewing] = useState(false);
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
      found.title = `The title must be at least ${TITLE_MIN_LENGTH} characters — headlines shorter than that rarely say what the piece is about.`;
    }
    if (!slug) found.slug = 'The URL is required.';

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

    if (goingLive) {
      if (!trimmed(values.excerpt)) {
        found.excerpt = 'An excerpt is required before an article goes live.';
      }
      if (!trimmed(values.featuredImage?.url)) {
        found['featuredImage.url'] = 'A featured image is required before an article goes live.';
      }
      if (words < PUBLISH_MIN_WORDS) {
        found.content = `An article needs at least ${PUBLISH_MIN_WORDS} words to go live — this one has ${words}.`;
      }
    }

    (Array.isArray(values.faqs) ? values.faqs : []).forEach((faq, index) => {
      const question = trimmed(faq.question);
      const answer = plainText(faq.answer);
      if (!question) found[`faqs.${index}.question`] = 'Write the question, or remove this row.';
      if (!answer) found[`faqs.${index}.answer`] = 'Write the answer, or remove this row.';
    });

    // The SEO panel's own two blockers: JSON-LD that would invalidate the
    // page's script tag, and a redirect with nowhere to send anybody.
    Object.assign(found, validateSeoBranch(values.seo));

    return found;
  }, []);

  const form = useForm({
    initialValues: BLANK,
    schema: isNew ? schemas['article.create'] : schemas['article.update'],
    validate: extraValidation,
    normalize: toPayload,
    onSubmit: async (payload) => {
      try {
        const envelope = articleId
          ? await articleService.update(articleId, payload)
          : await articleService.create(payload);
        return envelope?.data ?? null;
      } catch (thrown) {
        throw await withSlugSuggestion(thrown, payload.slug, articleId);
      }
    },
  });

  const { errors, handleBlur, reset, setField, setValues, submit, validateAll, values } = form;

  // Read by the callbacks without becoming dependencies of them: a save must
  // see the values of the moment it runs, not of the render that created it.
  const latest = useRef({});
  latest.current = { values, articleId, readOnly, isNew, record };

  useUnsavedChanges(form.dirty && !readOnly);

  /* ---------------------------------------------------------------- *
   * Loading
   * ---------------------------------------------------------------- */

  // A record is loaded once. A refetch that brings back the same version must
  // not overwrite what the editor has typed since.
  const loadedStamp = useRef(null);
  useEffect(() => {
    if (!record) return;
    const stamp = `${record.id}:${record.updatedAt ?? ''}`;
    if (loadedStamp.current === stamp) return;
    loadedStamp.current = stamp;
    reset(toFormValues(record));
  }, [record, reset]);

  /* ---------------------------------------------------------------- *
   * The draft
   * ---------------------------------------------------------------- */

  const clearDraft = useCallback(() => {
    storage.removeItem(draftKey(latest.current.articleId));
    setDraftOffer(null);
    setDraftSavedAt(null);
  }, []);

  // Offered once: on a new article straight away, on an existing one as soon as
  // the record is there to compare the draft's age against.
  const offered = useRef(false);
  useEffect(() => {
    if (readOnly || offered.current) return;
    if (articleId && !record) return;
    offered.current = true;

    const draft = storage.getItem(draftKey(articleId), null);
    if (!draft?.values || !draft.savedAt) return;

    const newerThanRecord =
      !record?.updatedAt || Date.parse(draft.savedAt) > Date.parse(record.updatedAt);
    if (!newerThanRecord) {
      storage.removeItem(draftKey(articleId));
      return;
    }
    setDraftOffer(draft);
  }, [articleId, record, readOnly]);

  // Autosave: every ten seconds, and only while there is something to save.
  const dirtyRef = useRef(false);
  dirtyRef.current = form.dirty;
  const savingRef = useRef(false);
  savingRef.current = form.submitting;

  useEffect(() => {
    if (readOnly) return undefined;

    const timer = setInterval(() => {
      if (!dirtyRef.current || savingRef.current) return;
      const savedAt = new Date().toISOString();
      if (
        storage.setItem(draftKey(latest.current.articleId), {
          values: latest.current.values,
          savedAt,
        })
      ) {
        setDraftSavedAt(savedAt);
      }
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [readOnly]);

  // The offer is read from a ref rather than from inside a state updater: a
  // `setState` updater has to be pure, and this one has to write a second piece
  // of state.
  const offerRef = useRef(null);
  offerRef.current = draftOffer;

  const restoreDraft = useCallback(() => {
    const offer = offerRef.current;
    if (!offer?.values) return;
    setValues(offer.values);
    setDraftOffer(null);
  }, [setValues]);

  const discardDraft = useCallback(() => {
    storage.removeItem(draftKey(latest.current.articleId));
    setDraftOffer(null);
  }, []);

  /* ---------------------------------------------------------------- *
   * Saving
   * ---------------------------------------------------------------- */

  const runSave = useCallback(
    async (mode) => {
      if (latest.current.readOnly) return false;

      if (!validateAll()) {
        toast.error(
          GOING_LIVE.includes(latest.current.values.status)
            ? 'This article is not ready to go live. What is missing is listed under “Content checks”.'
            : 'Please fix the highlighted fields.'
        );
        return false;
      }

      const saved = await submit();
      if (!saved) return false;

      clearDraft();
      reset(toFormValues(saved));

      // The redirect this article's `seo` asks for is written against the slug
      // the API answered with — a new article has none until now (§9.6). It
      // comes after the draft is cleared: the article is saved either way, and
      // a side effect must not hold up the state that says so.
      await applySeoSideEffects('article', saved);
      toast.success(savedMessage(mode, saved));

      // A created article moves to its own URL, replacing the add route so Back
      // does not offer to create it a second time.
      if (!latest.current.articleId && saved.id) {
        setRedirect({ to: PATHS.adminArticleEdit(saved.id), replace: true });
      }
      return saved;
    },
    [clearDraft, reset, submit, toast, validateAll]
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
        setPending(mode);
        setField('status', target);
        return undefined;
      }
      return runSaveRef.current(mode);
    },
    [setField]
  );

  // The second half of a status-changing save: the status is now in state, so
  // the payload says so and the validation reads the new rules. A refusal
  // leaves the radio where the editor can see what they were about to do.
  useEffect(() => {
    if (!pending) return;
    if (values.status !== STATUS_FOR_MODE[pending]) return;
    setPending(null);
    runSaveRef.current(pending);
  }, [pending, values.status]);

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
      saveRef.current('save');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [readOnly]);

  /**
   * Save, then open the article in a new tab behind a 24-hour token (D28).
   *
   * The token is what the public route checks, so the link is built on this
   * origin rather than on the absolute URL the API suggests. A pop-up blocker
   * may refuse a tab opened after an `await`, so a refusal becomes a navigation
   * in this one — by then the article is saved, so there is nothing to lose.
   */
  const preview = useCallback(async () => {
    setPreviewing(true);
    try {
      const current = latest.current;
      let id = current.articleId;

      if (!id || form.dirty) {
        const saved = await runSaveRef.current('save');
        if (!saved) return;
        id = saved.id;
      }

      const { data } = await articleService.previewToken(id);
      const slug = latest.current.values.slug || latest.current.record?.slug || '';
      const path = `${PATHS.article(slug)}?preview=${data.token}`;
      if (!window.open(path, '_blank', 'noopener,noreferrer')) {
        setRedirect({ to: path, replace: false });
      }
    } catch (thrown) {
      toast.error(thrown?.message || 'The preview link could not be created.');
    } finally {
      setPreviewing(false);
    }
  }, [form.dirty, toast]);

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

  const addFaq = useCallback(() => {
    keyCounter.current += 1;
    setField('faqs', [
      ...(latest.current.values.faqs ?? []),
      { _key: `new-${keyCounter.current}`, question: '', answer: '' },
    ]);
  }, [setField]);

  const updateFaq = useCallback(
    (key, patch) =>
      setField(
        'faqs',
        (latest.current.values.faqs ?? []).map((faq) =>
          faq._key === key ? { ...faq, ...patch } : faq
        )
      ),
    [setField]
  );

  const removeFaq = useCallback(
    (key) =>
      setField(
        'faqs',
        (latest.current.values.faqs ?? []).filter((faq) => faq._key !== key)
      ),
    [setField]
  );

  const moveFaq = useCallback(
    (from, to) => {
      const list = [...(latest.current.values.faqs ?? [])];
      const [moved] = list.splice(from, 1);
      if (!moved) return;
      list.splice(to, 0, moved);
      setField('faqs', list);
    },
    [setField]
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
    addFaq,
    updateFaq,
    removeFaq,
    moveFaq,
    draftOffer,
    draftSavedAt,
    restoreDraft,
    discardDraft,
    clearDraft,
    publicPath: values.slug ? PATHS.article(values.slug) : null,
  };
}

/**
 * What a save says it did.
 *
 * @param {'save'|'draft'|'publish'|'schedule'} mode
 * @param {object} saved the record the API returned
 */
function savedMessage(mode, saved) {
  if (saved?.status === 'scheduled') return 'Article scheduled.';
  if (mode === 'publish' || saved?.status === 'published') return 'Article published.';
  if (saved?.status === 'archived') return 'Article archived.';
  return 'Article saved as a draft.';
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
