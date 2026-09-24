import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import EntityPicker from '../../../components/admin/EntityPicker';
import articleService from '../../../services/articleService';
import propertyService from '../../../services/propertyService';
import { isCanceled } from '../../../services/apiError';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './ArticleFormPage.module.css';

/** What §2 of this prompt lets an editor pick. */
export const RELATED_ARTICLES_MAX = 5;
export const RELATED_PROPERTIES_MAX = 4;

/** The states of an article worth pointing a reader at. */
const RELATED_STATUSES = ['published', 'scheduled'];

/**
 * The records behind a list of ids, so a chosen id shows a name rather than
 * `#7`.
 *
 * The form holds ids (§5.5) and `EntityPicker` remembers everything it has
 * shown, but on the first render of a saved article it has shown nothing — so
 * the ids the record arrived with are fetched once, in the order §5.7's `ids`
 * filter answers them.
 *
 * @param {Array<number>} ids
 * @param {(params: object, options: object) => Promise<{data: Array<object>}>} fetcher
 * @param {number} max
 * @param {string} noun what the failure message calls them
 */
function useKnownRecords(ids, fetcher, max, noun) {
  const toast = useToast();
  const [known, setKnown] = useState([]);

  const remember = useCallback((records) => {
    setKnown((current) => {
      const seen = new Set(current.map((record) => String(record.id)));
      const fresh = records.filter((record) => record?.id && !seen.has(String(record.id)));
      // An answer that adds nothing leaves the array alone: `known` is a
      // dependency of the effect below, and a new identity per answer would ask
      // for the same ids for ever.
      return fresh.length === 0 ? current : [...current, ...fresh];
    });
  }, []);

  const loadedFor = useRef('');
  useEffect(() => {
    const wanted = ids.filter((id) => !known.some((record) => String(record.id) === String(id)));
    if (wanted.length === 0) return undefined;

    const key = wanted.join(',');
    if (loadedFor.current === key) return undefined;
    loadedFor.current = key;

    const controller = new AbortController();
    fetcher({ ids: key, perPage: max }, { signal: controller.signal })
      .then(({ data }) => remember(Array.isArray(data) ? data : []))
      // A row that cannot be drawn falls back to "#id", so the pick survives —
      // but the editor is told, because a list of numbers is not a list.
      .catch((thrown) => {
        if (!isCanceled(thrown)) toast.error(`Some of the chosen ${noun} could not be loaded.`);
      });

    return () => {
      controller.abort();
      // `StrictMode` remounts every effect in development, and a key that
      // outlived its request would leave the rows reading "#2" for the visit.
      if (loadedFor.current === key) loadedFor.current = '';
    };
  }, [fetcher, ids, known, max, noun, remember, toast]);

  return { known, remember };
}

/**
 * The rail's "Related" card: the further reading and the listings the article
 * points at (§6.8 `relatedArticleIds`, `relatedPropertyIds`).
 *
 * Both are the editor's own picks in the editor's own order — the public page
 * renders them as given — so both are searched rather than chosen from a list:
 * the archive is too long to put in a select, and the point of the field is the
 * one piece somebody decided belongs beside this one.
 *
 * @param {object} props
 * @param {ReturnType<import('./useArticleForm').default>} props.form
 */
export default function ArticleRelatedCard({ form }) {
  const { values, errors, setField, readOnly, saving, articleId } = form;
  const disabled = readOnly || saving;

  const articleIds = useMemo(
    () => (Array.isArray(values.relatedArticleIds) ? values.relatedArticleIds : []),
    [values.relatedArticleIds]
  );
  const propertyIds = useMemo(
    () => (Array.isArray(values.relatedPropertyIds) ? values.relatedPropertyIds : []),
    [values.relatedPropertyIds]
  );

  const { known: knownArticles, remember: rememberArticles } = useKnownRecords(
    articleIds,
    articleService.adminList,
    RELATED_ARTICLES_MAX,
    'articles'
  );
  const { known: knownProperties, remember: rememberProperties } = useKnownRecords(
    propertyIds,
    propertyService.adminList,
    RELATED_PROPERTIES_MAX,
    'listings'
  );

  /**
   * The article search: pieces a reader can reach — published, or scheduled
   * and on their way — and never this article itself. A draft or an archived
   * piece offered here was accepted and then silently left off the public
   * page, which shows only what is live (QA-55); the listing search has asked
   * for published listings only since prompt 33.
   */
  const searchArticles = useCallback(
    async ({ q, perPage }, options) => {
      const envelope = await articleService.adminList(
        { q, perPage, status: RELATED_STATUSES },
        options
      );
      const data = (Array.isArray(envelope?.data) ? envelope.data : []).filter(
        (record) => !articleId || String(record.id) !== String(articleId)
      );
      rememberArticles(data);
      return { ...envelope, data };
    },
    [articleId, rememberArticles]
  );

  /** The listing search: published listings only — a 404 is not further reading. */
  const searchProperties = useCallback(
    async ({ q, perPage }, options) => {
      const envelope = await propertyService.adminList({ q, isActive: true, perPage }, options);
      const data = Array.isArray(envelope?.data) ? envelope.data : [];
      rememberProperties(data);
      return { ...envelope, data };
    },
    [rememberProperties]
  );

  return (
    <aside className={styles.card} aria-labelledby="article-related">
      <h2 className={styles.cardTitle} id="article-related">
        Related
      </h2>

      <EntityPicker
        label="Related articles"
        labelKey="title"
        fetcher={searchArticles}
        selectedRecords={knownArticles}
        value={articleIds}
        error={errors.relatedArticleIds}
        disabled={disabled}
        max={RELATED_ARTICLES_MAX}
        orderable
        placeholder="Search the archive"
        hint={`Up to ${RELATED_ARTICLES_MAX}, in the order they should appear.`}
        onChange={(next) => setField('relatedArticleIds', next)}
      />

      <EntityPicker
        label="Related properties"
        labelKey="title"
        fetcher={searchProperties}
        selectedRecords={knownProperties}
        value={propertyIds}
        error={errors.relatedPropertyIds}
        disabled={disabled}
        max={RELATED_PROPERTIES_MAX}
        orderable
        placeholder="Search published listings"
        hint={`Up to ${RELATED_PROPERTIES_MAX} listings to show beside the article.`}
        onChange={(next) => setField('relatedPropertyIds', next)}
      />
    </aside>
  );
}
