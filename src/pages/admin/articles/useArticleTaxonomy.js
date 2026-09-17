import { useCallback, useMemo, useState } from 'react';

import masterDataService from '../../../services/masterDataService';
import useApi from '../../../hooks/useApi';

/**
 * The three lists an article is classified by: its categories, its tags and
 * its authors (00_MASTER_CONTEXT.md §6.8).
 *
 * They are small — four categories, fifteen tags, three authors — and both the
 * list screen's filters and the form's pickers need all three, so they are
 * fetched once per screen here rather than twice in two places. The **admin**
 * lists, not the public ones: an article already pointing at a category that
 * was retired last week must still show its name, and `MasterDataContext` (D93)
 * deliberately holds only the seven collections the public site reads.
 *
 *   const { categories, tags, authors, loading, addTag } = useArticleTaxonomy();
 *
 * `addTag` / `addCategory` are what the form's quick-create paths call after a
 * `POST`: the new record is shown immediately, so a tag somebody just made does
 * not appear as a bare id while the lists reload behind it.
 *
 * @param {object} [options]
 * @param {boolean} [options.enabled] skip the three calls entirely
 */
export default function useArticleTaxonomy({ enabled = true } = {}) {
  // Records created on this screen, merged over the fetched lists until the
  // next reload brings them back from the API.
  const [added, setAdded] = useState({ categories: [], tags: [], authors: [] });

  const categoriesApi = useApi(
    (signal) => masterDataService.articleCategories.adminList({ perPage: 'all' }, { signal }),
    [],
    { enabled, initialData: [] }
  );
  const tagsApi = useApi(
    (signal) => masterDataService.articleTags.adminList({ perPage: 'all' }, { signal }),
    [],
    { enabled, initialData: [] }
  );
  const authorsApi = useApi(
    (signal) => masterDataService.authors.adminList({ perPage: 'all' }, { signal }),
    [],
    { enabled, initialData: [] }
  );

  const merge = useCallback((fetched, extra) => {
    const rows = Array.isArray(fetched) ? fetched : [];
    const known = new Set(rows.map((row) => String(row.id)));
    return [...rows, ...extra.filter((row) => !known.has(String(row.id)))];
  }, []);

  const byName = (left, right) =>
    String(left?.name ?? '').localeCompare(String(right?.name ?? ''), 'en-IN');

  const categories = useMemo(
    () =>
      merge(categoriesApi.data, added.categories).sort(
        (left, right) => (left.order ?? 0) - (right.order ?? 0) || byName(left, right)
      ),
    [categoriesApi.data, added.categories, merge]
  );

  const tags = useMemo(
    () => merge(tagsApi.data, added.tags).sort(byName),
    [tagsApi.data, added.tags, merge]
  );

  const authors = useMemo(
    () => merge(authorsApi.data, added.authors).sort(byName),
    [authorsApi.data, added.authors, merge]
  );

  const addRecord = useCallback((kind, record) => {
    if (!record?.id) return;
    setAdded((current) => ({ ...current, [kind]: [...current[kind], record] }));
  }, []);

  const addCategory = useCallback((record) => addRecord('categories', record), [addRecord]);
  const addTag = useCallback((record) => addRecord('tags', record), [addRecord]);

  const { refetch: refetchCategories } = categoriesApi;
  const { refetch: refetchTags } = tagsApi;
  const { refetch: refetchAuthors } = authorsApi;

  const refresh = useCallback(() => {
    refetchCategories();
    refetchTags();
    refetchAuthors();
  }, [refetchCategories, refetchTags, refetchAuthors]);

  return {
    categories,
    tags,
    authors,
    loading: categoriesApi.loading || tagsApi.loading || authorsApi.loading,
    error: categoriesApi.error || tagsApi.error || authorsApi.error,
    addCategory,
    addTag,
    refresh,
  };
}

/** `[{ value: id, label: name }]` — a taxonomy list as a `<select>` reads it. */
export const toTaxonomyOptions = (records = []) =>
  records.map((record) => ({ value: record.id, label: record.name }));
