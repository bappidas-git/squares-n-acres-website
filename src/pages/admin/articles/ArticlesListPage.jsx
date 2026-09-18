import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import DataTable, { DEFAULT_PER_PAGE } from '../../../components/admin/DataTable';
import FilterBar from '../../../components/admin/FilterBar';
import PATHS from '../../../routes/paths';
import PageHeader from '../../../components/admin/PageHeader';
import articleService from '../../../services/articleService';
import useApiList from '../../../hooks/useApiList';
import useArticleTaxonomy, { toTaxonomyOptions } from './useArticleTaxonomy';
import { ARTICLE_STATUS } from '../../../config/enums';
import { buildArticleColumns, renderArticleCard } from './articleColumns';
import { firstFieldMessage } from '../../../services/apiError';
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
  isFeatured: 'string',
  sort: 'string',
  order: 'string',
  page: 'int',
  perPage: 'int',
};

/** The keys that narrow the list, as opposed to paging or ordering it. */
const FILTER_KEYS = ['q', 'status', 'categoryId', 'authorId', 'tagId', 'isFeatured'];

const isSet = (value) =>
  value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length);

export default function ArticlesListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAdminAuth();

  const canCreate = can('articles', 'create');
  const canEdit = can('articles', 'edit');
  const canDelete = can('articles', 'delete');
  const canBulk = can('articles', 'bulk');

  const { categories, tags, authors } = useArticleTaxonomy();

  const {
    items,
    meta,
    loading,
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
   * it could not open becomes a navigation in this one.
   */
  const preview = useCallback(
    async (row) => {
      setBusyId(row.id);
      try {
        const { data } = await articleService.previewToken(row.id);
        const path = `${PATHS.article(row.slug)}?preview=${data.token}`;
        if (!window.open(path, '_blank', 'noopener,noreferrer')) navigate(path);
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
    [toast]
  );

  const runBulk = async (action, ids) => {
    setBulkBusy(true);
    try {
      const { message } = await articleService.bulk({ ids, action });
      toast.success(message || TOASTS.updatedCount(ids.length, 'article'));
      setSelectedIds([]);
      refetch();
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The bulk action could not be applied.'));
    } finally {
      setBulkBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await articleService.remove(deleting.id);
      toast.success(TOASTS.deleted(`“${deleting.title}”`));
      setSelectedIds((current) => current.filter((id) => String(id) !== String(deleting.id)));
      setDeleting(null);
      refetch();
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

  const filterFields = useMemo(
    () => [
      { key: 'q', type: 'search', label: 'Search', placeholder: 'Title, excerpt or body' },
      {
        key: 'status',
        type: 'multiselect',
        label: 'Status',
        placeholder: 'Any status',
        options: ARTICLE_STATUS.options,
      },
      {
        key: 'categoryId',
        type: 'select',
        label: 'Category',
        placeholder: 'All categories',
        options: toTaxonomyOptions(categories),
      },
      {
        key: 'authorId',
        type: 'select',
        label: 'Author',
        placeholder: 'All authors',
        options: toTaxonomyOptions(authors),
      },
      {
        key: 'tagId',
        type: 'select',
        label: 'Tag',
        placeholder: 'All tags',
        options: toTaxonomyOptions(tags),
      },
      {
        key: 'isFeatured',
        type: 'toggle',
        label: 'Featured',
        placeholder: 'Any',
        trueLabel: 'Featured',
        falseLabel: 'Not featured',
      },
    ],
    [authors, categories, tags]
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
          mobileCard={mobileCard}
          emptyState={emptyState}
        />
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this article?"
        message={
          deleting
            ? `“${deleting.title}” will be deleted, and /insights/articles/${deleting.slug} will answer 404. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        danger
        loading={deletingBusy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
