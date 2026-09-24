import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';

import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import DataTable, { DEFAULT_PER_PAGE } from '../../../components/admin/DataTable';
import FilterBar from '../../../components/admin/FilterBar';
import PATHS from '../../../routes/paths';
import PageHeader from '../../../components/admin/PageHeader';
import articleService from '../../../services/articleService';
import openInNewTab from '../../../utils/openInNewTab';
import useApiList from '../../../hooks/useApiList';
import useArticleTaxonomy, { toTaxonomyOptions } from './useArticleTaxonomy';
import useLingering from '../../../hooks/useLingering';
import { ARTICLE_STATUS } from '../../../config/enums';
import { buildArticleColumns, renderArticleCard } from './articleColumns';
import { firstFieldMessage } from '../../../services/apiError';
import { publishGaps, publishProblems } from '../../../config/articleRules';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './ArticlesListPage.module.css';
import { TABLES, TOASTS } from '../../../config/adminCopy';

/**
 * Admin → Articles (`/admin/articles`).
 *
 * Server-side throughout: the six filters, the sort, the page and the page size
 * are query parameters the API answers and the URL carries, so the screen holds
 * one page of rows however many articles exist and a filtered view is a link
 * somebody can send (§5.6, BUG-19). The boilerplate's screen fetched the public
 * list and narrowed it in the browser, with a "trending" toggle that wrote a
 * tag — both are gone: trending is now `viewCount` (`/articles/trending`) and
 * the editorial flag is `isFeatured` (§6.8).
 *
 * The one thing the screen does beyond fetching is the six bulk actions of
 * §5.8 plus the per-row writes: preview behind a 24-hour token (D28), a
 * client-side duplicate (§5.14 gives articles no copy endpoint) and a delete.
 */

/** `POST /admin/articles/bulk` — what the mock accepts for articles (§5.8). */
const BULK_ACTIONS = [
  { key: 'publish', label: 'Publish', icon: 'mdi:earth' },
  { key: 'unpublish', label: 'Unpublish', icon: 'mdi:earth-off' },
  { key: 'archive', label: 'Archive', icon: 'mdi:archive-outline' },
  { key: 'feature', label: 'Feature', icon: 'mdi:star-outline' },
  { key: 'unfeature', label: 'Unfeature', icon: 'mdi:star-off-outline' },
  {
    key: 'delete',
    label: 'Delete',
    icon: 'mdi:delete-outline',
    danger: true,
    confirm: {
      title: 'Delete the selected articles?',
      message:
        '{count} will be deleted, and the public pages will answer 404. This cannot be undone.',
    },
  },
];

/** What the table asks for before anybody touches a control (D23, D47). */
export const ARTICLE_LIST_DEFAULTS = {
  page: 1,
  perPage: DEFAULT_PER_PAGE,
  sort: 'updatedAt',
  order: 'desc',
};

/** The query parameters that live in the URL, and how each is serialised (§5.6). */
export const ARTICLE_LIST_PARAM_KEYS = {
  q: 'string',
  status: 'csv',
  categoryId: 'string',
  authorId: 'string',
  tagId: 'string',
  // A boolean, so `?isFeatured=maybe` is no filter at all — as a string it
  // showed a "Featured: Not featured" chip over the unfiltered list (QA-55).
  isFeatured: 'bool',
  sort: 'string',
  order: 'string',
  page: 'int',
  perPage: 'int',
};

/** The keys that narrow the list, as opposed to paging or ordering it. */
const FILTER_KEYS = ['q', 'status', 'categoryId', 'authorId', 'tagId', 'isFeatured'];

const isSet = (value) =>
  value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length);

/** What an article is called where a list of them is read aloud (QA-55). */
const rowLabel = (row) => row.title;

/**
 * A select's options, plus one for a value the address carries that is not
 * among them — a category deleted since the link was shared, a hand-edited
 * `?tagId=1,2` — so the chip names it rather than printing the raw id. Only
 * once the lists have loaded: before that every value is unknown.
 *
 * @param {Array<{value: number, label: string}>} options
 * @param {string|undefined} value the URL's value
 * @param {string} noun what an unknown one is called
 * @param {boolean} loaded
 */
function withCurrent(options, value, noun, loaded) {
  if (
    !loaded ||
    !isSet(value) ||
    options.some((option) => String(option.value) === String(value))
  ) {
    return options;
  }
  const parts = String(value).split(',').filter(Boolean);
  const names = parts.map((part) => options.find((option) => String(option.value) === part)?.label);
  const label = names.every(Boolean) ? names.join(', ') : `Unknown ${noun}`;
  return [...options, { value, label }];
}

export default function ArticlesListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAdminAuth();

  const canCreate = can('articles', 'create');
  const canEdit = can('articles', 'edit');
  const canDelete = can('articles', 'delete');
  const canBulk = can('articles', 'bulk');

  const { categories, tags, authors, loading: taxonomyLoading } = useArticleTaxonomy();

  const {
    items,
    meta,
    loading,
    refreshing,
    error,
    params,
    setPage,
    setSort,
    setFilters,
    resetFilters,
    refetch,
  } = useApiList((query, options) => articleService.adminList(query, options), {
    syncToUrl: true,
    paramKeys: ARTICLE_LIST_PARAM_KEYS,
    defaults: ARTICLE_LIST_DEFAULTS,
  });

  const [overrides, setOverrides] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  // The bulk "Publish" asked about articles that cannot go live yet.
  const [publishCheck, setPublishCheck] = useState(null);

  // What the two dialogs draw while they fade out (QA-54, QA-55).
  const [shownDeleting, releaseDeleting] = useLingering(deleting);
  const [shownCheck, releaseCheck] = useLingering(publishCheck);

  useEffect(() => {
    setOverrides({});
  }, [items]);

  const rows = useMemo(
    () =>
      items.map((item) =>
        overrides[String(item.id)] ? { ...item, ...overrides[String(item.id)] } : item
      ),
    [items, overrides]
  );

  /* ---------------- writes ---------------- */

  /**
   * Opens the article in a new tab behind a 24-hour token (D28).
   *
   * The token is what the public route checks, so the link is built on this
   * origin rather than on the absolute URL the API suggests: an editor running
   * the site locally should not be sent to the production domain.
   *
   * The token is asked for first, so the tab is opened after an `await` and a
   * pop-up blocker may refuse it. A refusal must not swallow the action: the tab
   * it could not open becomes a navigation in this one — and only a refusal
   * does (`openInNewTab`, QA-55).
   */
  const preview = useCallback(
    async (row) => {
      setBusyId(row.id);
      try {
        const { data } = await articleService.previewToken(row.id);
        const path = `${PATHS.article(row.slug)}?preview=${data.token}`;
        if (!openInNewTab(path)) navigate(path);
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'The preview link could not be created.'));
      } finally {
        setBusyId(null);
      }
    },
    [navigate, toast]
  );

  const duplicate = useCallback(
    async (row) => {
      setBusyId(row.id);
      try {
        const { data } = await articleService.duplicate(row.id);
        toast.success(TOASTS.duplicated(`“${row.title}”`));
        if (data?.id) navigate(PATHS.adminArticleEdit(data.id));
        else refetch();
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'The article could not be duplicated.'));
      } finally {
        setBusyId(null);
      }
    },
    [navigate, refetch, toast]
  );

  const setFeatured = useCallback(
    async (row, value) => {
      const id = String(row.id);
      setOverrides((current) => ({ ...current, [id]: { ...current[id], isFeatured: value } }));
      setBusyId(row.id);

      try {
        await articleService.patch(row.id, { isFeatured: value });
        toast.success(TOASTS.flagged(`“${row.title}”`, 'isFeatured', value));
        // Read again: under the Featured filter, the piece just unfeatured
        // belongs to another list (QA-55).
        refetch();
      } catch (thrown) {
        setOverrides((current) => {
          const { [id]: _reverted, ...rest } = current;
          return rest;
        });
        toast.error(firstFieldMessage(thrown, 'The change could not be saved.'));
      } finally {
        setBusyId(null);
      }
    },
    [refetch, toast]
  );

  /**
   * After a delete: the previous page when this one has just been emptied,
   * rather than "Nothing on this page" over the rows that were there (QA-55).
   *
   * @param {number} removed how many of the rows on screen went
   */
  const afterRemoval = (removed) => {
    const page = Number(params.page) || 1;
    if (page > 1 && removed >= rows.length) setPage(page - 1);
    else refetch();
  };

  const applyBulk = async (action, ids) => {
    setBulkBusy(true);
    try {
      const { message } = await articleService.bulk({ ids, action });
      toast.success(message || TOASTS.updatedCount(ids.length, 'article'));
      setSelectedIds([]);
      if (action === 'delete') afterRemoval(ids.length);
      else refetch();
    } catch (thrown) {
      // A refused publish names every article that is not ready; the message
      // says how many, the first line which one.
      toast.error(
        thrown?.status === 422 && thrown?.message && action === 'publish'
          ? thrown.message
          : firstFieldMessage(thrown, 'The bulk action could not be applied.')
      );
    } finally {
      setBulkBusy(false);
    }
  };

  /**
   * The bulk actions, with "Publish" asking first what the API would refuse:
   * the rules the form enforces — an excerpt, a featured image, 300 words —
   * hold for a batch too (`config/articleRules`, QA-55). The rows on screen
   * carry what the rules read, so the editor hears which piece lacks what,
   * and may publish the ones that are ready.
   */
  const runBulk = async (action, ids) => {
    if (action === 'publish') {
      const chosen = new Set(ids.map(String));
      // An article already live is left as it is — publishing it again
      // changes nothing — so only the others are asked the rules.
      const candidates = rows.filter(
        (row) => chosen.has(String(row.id)) && row.status !== 'published'
      );
      const notReady = candidates
        .map((row) => {
          const words = Number(row.wordCount) || 0;
          return {
            id: row.id,
            title: row.title,
            gaps: publishGaps(publishProblems(row, words), words),
          };
        })
        .filter((entry) => entry.gaps.length > 0);

      if (notReady.length > 0) {
        const refused = new Set(notReady.map((entry) => String(entry.id)));
        setPublishCheck({
          total: ids.length,
          notReady,
          readyIds: candidates.map((row) => row.id).filter((id) => !refused.has(String(id))),
        });
        return;
      }
    }
    await applyBulk(action, ids);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await articleService.remove(deleting.id);
      toast.success(TOASTS.deleted(`“${deleting.title}”`));
      setSelectedIds((current) => current.filter((id) => String(id) !== String(deleting.id)));
      setDeleting(null);
      afterRemoval(1);
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The article could not be deleted.'));
      // A refusal will not become an acceptance on a second press.
      if (thrown?.status >= 400 && thrown?.status < 500) setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  };

  /* ---------------- table ---------------- */

  const columns = useMemo(() => buildArticleColumns(), []);
  const mobileCard = useCallback((row) => renderArticleCard(row), []);

  const rowActions = useCallback(
    (row) => {
      const busy = busyId !== null;
      const actions = [];

      if (canEdit) {
        actions.push({
          key: 'edit',
          label: 'Edit',
          icon: 'mdi:pencil-outline',
          to: PATHS.adminArticleEdit(row.id),
        });
      }

      actions.push({
        key: 'preview',
        label: 'Preview',
        icon: 'mdi:eye-outline',
        disabled: busy,
        onClick: () => preview(row),
      });

      if (row.status === 'published') {
        actions.push({
          key: 'view',
          label: 'View on the site',
          icon: 'mdi:open-in-new',
          href: PATHS.article(row.slug),
        });
      }

      if (canEdit) {
        actions.push({
          key: 'featured',
          label: row.isFeatured === true ? 'Unfeature' : 'Feature',
          icon: row.isFeatured === true ? 'mdi:star-off-outline' : 'mdi:star-outline',
          disabled: busy,
          onClick: () => setFeatured(row, row.isFeatured !== true),
        });
      }

      if (canCreate) {
        actions.push({
          key: 'duplicate',
          label: 'Duplicate',
          icon: 'mdi:content-copy',
          disabled: busy,
          onClick: () => duplicate(row),
        });
      }

      if (canDelete) {
        actions.push({
          key: 'delete',
          label: 'Delete',
          icon: 'mdi:delete-outline',
          danger: true,
          onClick: () => setDeleting(row),
        });
      }

      return actions;
    },
    [busyId, canCreate, canDelete, canEdit, duplicate, preview, setFeatured]
  );

  // Six filters share one row on a laptop from 1,440 px up: at their natural
  // widths the last one wrapped onto a row of its own at 1,440–1,536 px
  // (QA-55). A select never goes below `FilterBar`'s 160 px; the category's
  // 190 px is what "Investment & Finance" needs to show whole once chosen.
  const loaded = !taxonomyLoading;
  const filterFields = useMemo(
    () => [
      {
        key: 'q',
        type: 'search',
        label: 'Search',
        placeholder: 'Title, excerpt or body',
        width: '220px',
      },
      {
        key: 'status',
        type: 'multiselect',
        label: 'Status',
        placeholder: 'Any status',
        options: ARTICLE_STATUS.options,
        width: '170px',
      },
      {
        key: 'categoryId',
        type: 'select',
        label: 'Category',
        placeholder: 'All categories',
        options: withCurrent(toTaxonomyOptions(categories), params.categoryId, 'category', loaded),
        width: '190px',
      },
      {
        key: 'authorId',
        type: 'select',
        label: 'Author',
        placeholder: 'All authors',
        options: withCurrent(toTaxonomyOptions(authors), params.authorId, 'author', loaded),
        width: '160px',
      },
      {
        key: 'tagId',
        type: 'select',
        label: 'Tag',
        placeholder: 'All tags',
        options: withCurrent(toTaxonomyOptions(tags), params.tagId, 'tag', loaded),
        width: '160px',
      },
      {
        key: 'isFeatured',
        type: 'toggle',
        label: 'Featured',
        placeholder: 'Any',
        trueLabel: 'Featured',
        falseLabel: 'Not featured',
        width: '160px',
      },
    ],
    [authors, categories, tags, loaded, params.authorId, params.categoryId, params.tagId]
  );

  const filtered = FILTER_KEYS.some((key) => isSet(params[key]));

  const emptyState = useMemo(() => {
    if (params.page > 1) {
      return {
        title: TABLES.emptyPage,
        text: TABLES.emptyPageText,
        action: (
          <Button variant="outline" onClick={() => setPage(1)}>
            {TABLES.firstPage}
          </Button>
        ),
      };
    }

    if (filtered) {
      return {
        title: 'No articles match',
        text: 'Nothing in the archive answers every filter you have set.',
        action: (
          <Button variant="outline" onClick={resetFilters}>
            {TABLES.resetFilters}
          </Button>
        ),
      };
    }

    return {
      title: 'No articles yet',
      text: 'Insights are what the site is found by. The first one can be a draft.',
      action: canCreate ? (
        <Button to={PATHS.adminArticleNew}>Write the first article</Button>
      ) : null,
    };
  }, [canCreate, filtered, params.page, resetFilters, setPage]);

  return (
    <>
      <PageHeader
        title="Articles"
        count={meta?.total}
        subtitle="Every insight on the site, with its status, its readership and its SEO score."
        // The three taxonomy screens are already in the sidebar's own Articles
        // group (`config/rbac.js`); a second copy of them here would be the same
        // navigation twice on one screen.
        actions={
          canCreate ? (
            <Button
              to={PATHS.adminArticleNew}
              icon={<Icon icon="mdi:plus" width="18" height="18" />}
            >
              New article
            </Button>
          ) : null
        }
      />

      <div className={styles.screen}>
        <FilterBar
          fields={filterFields}
          values={params}
          onChange={setFilters}
          onReset={resetFilters}
        />

        <DataTable
          caption="Articles"
          columns={columns}
          rows={rows}
          meta={meta}
          loading={loading}
          refreshing={refreshing}
          error={error}
          onRetry={refetch}
          sort={{ field: params.sort, order: params.order }}
          onSortChange={(next) => setSort(next.field, next.order)}
          onPageChange={setPage}
          onPerPageChange={(perPage) => setFilters({ perPage })}
          selectable={canBulk}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkActions={canBulk ? BULK_ACTIONS : []}
          bulkNounOne="article"
          bulkNounMany="articles"
          onBulkAction={runBulk}
          bulkBusy={bulkBusy}
          rowActions={rowActions}
          rowActionsMenu
          rowActionsLabel={(row) => `Actions for ${row.title}`}
          rowLabel={rowLabel}
          mobileCard={mobileCard}
          emptyState={emptyState}
          density="compact"
        />
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this article?"
        message={
          shownDeleting
            ? `“${shownDeleting.title}” will be deleted, and /insights/articles/${shownDeleting.slug} will answer 404. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        danger
        loading={deletingBusy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        onExited={releaseDeleting}
      />

      <PublishCheckDialog
        open={Boolean(publishCheck)}
        check={shownCheck}
        onClose={() => setPublishCheck(null)}
        onExited={releaseCheck}
        onPublishReady={() => {
          const ids = publishCheck?.readyIds ?? [];
          setPublishCheck(null);
          if (ids.length > 0) applyBulk('publish', ids);
        }}
      />
    </>
  );
}

/**
 * "2 of the 3 selected articles are not ready to go live" — each one named,
 * with what it lacks and a link to finish it; and, when some of the batch is
 * ready, the button that publishes those (QA-55).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {{total: number, notReady: Array<{id: number, title: string, gaps: string[]}>,
 *   readyIds: Array<number|string>}|null} props.check
 * @param {() => void} props.onClose
 * @param {() => void} props.onExited
 * @param {() => void} props.onPublishReady
 */
function PublishCheckDialog({ open, check, onClose, onExited, onPublishReady }) {
  const notReady = check?.notReady ?? [];
  const ready = check?.readyIds?.length ?? 0;
  const noun = (count) => (count === 1 ? 'article' : 'articles');

  const title =
    notReady.length === 1 && (check?.total ?? 0) === 1
      ? `“${notReady[0].title}” is not ready to go live`
      : `${notReady.length} of the ${check?.total ?? 0} selected articles ${
          notReady.length === 1 ? 'is' : 'are'
        } not ready to go live`;

  return (
    <ConfirmDialog
      open={open}
      variant={ready > 0 ? 'confirm' : 'alert'}
      title={title}
      message={
        ready > 0
          ? `${ready === 1 ? 'One other is' : `${ready} others are`} ready, and can be published now; the rest stay as they are.`
          : 'An article needs an excerpt, a featured image and 300 words before it goes live. Open it to finish it.'
      }
      confirmLabel={`Publish ${ready} ${noun(ready)}`}
      cancelLabel="Cancel"
      okLabel="Got it"
      onClose={onClose}
      onConfirm={onPublishReady}
      onExited={onExited}
    >
      <ul className={styles.gapList}>
        {notReady.map((entry) => (
          <li key={entry.id}>
            <Link className={styles.gapTitle} to={PATHS.adminArticleEdit(entry.id)}>
              {entry.title}
            </Link>
            <span className={styles.meta}>{entry.gaps.join(' · ')}</span>
          </li>
        ))}
      </ul>
    </ConfirmDialog>
  );
}
